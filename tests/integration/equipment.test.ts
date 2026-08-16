import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { invoke, type ActionResult } from './mocks';
import prisma from '@/lib/prisma';
import {
  listEquipment,
  getEquipmentById,
  listFactories,
} from '@/server/equipment';
import { createEquipment, updateEquipment } from '@/server/actions/equipment';
import type { EquipmentFormValues } from '@/lib/validations';
import {
  cleanup,
  createEquipment as createEquipmentRow,
  createFactory,
  createUser,
} from './fixtures';

const PROBE = 'probe_eq';

const tracked = {
  factoryIds: [] as string[],
  equipmentIds: [] as string[],
  userIds: [] as string[],
};

function redirectUrl(
  result: ActionResult<unknown>
): string | undefined {
  return result.kind === 'redirect' ? result.url : undefined;
}

async function validEquipmentValues(
  assetNumber: string
): Promise<EquipmentFormValues> {
  return {
    name: `${PROBE}_cnc`,
    assetNumber,
    description: 'A probe piece of equipment',
    location: 'Probe Section',
    status: 'OPERATIONAL',
    criticality: 'High',
    factoryId: tracked.factoryIds[0],
  };
}

beforeAll(async () => {
  tracked.factoryIds.push(await createFactory(`${PROBE}_factory`));
  tracked.userIds.push(await createUser('ADMINISTRATOR', `${PROBE}_admin`));
});

afterAll(async () => {
  await cleanup(tracked);
  await prisma.$disconnect();
});

describe('equipment data layer', () => {
  it('paginates and searches equipment', async () => {
    const eqIds: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      eqIds.push(
        await createEquipmentRow(tracked.factoryIds[0], {
          name: `${PROBE}_${String(i).padStart(2, '0')}`,
          assetNumber: `${PROBE}_asset_${i}`,
        })
      );
    }
    tracked.equipmentIds.push(...eqIds);

    const page1 = await listEquipment({ q: PROBE, page: 1 });
    expect(page1.total).toBe(25);
    expect(page1.pageSize).toBe(20);
    expect(page1.totalPages).toBe(2);
    expect(page1.items).toHaveLength(20);
    expect(page1.items.every((i) => i.name.includes(PROBE))).toBe(true);

    const page2 = await listEquipment({ q: PROBE, page: 2 });
    expect(page2.items).toHaveLength(5);
  });

  it('clamps an out-of-range page', async () => {
    const result = await listEquipment({ q: PROBE, page: -5 });
    expect(result.page).toBe(1);
  });

  it('combines status filtering with the query', async () => {
    const under = await createEquipmentRow(tracked.factoryIds[0], {
      name: `${PROBE}_under`,
      assetNumber: `${PROBE}_under_asset`,
      status: 'UNDER_MAINTENANCE',
    });
    tracked.equipmentIds.push(under);
    await createEquipmentRow(tracked.factoryIds[0], {
      name: `${PROBE}_fine`,
      assetNumber: `${PROBE}_fine_asset`,
    });

    const result = await listEquipment({
      q: PROBE,
      status: 'UNDER_MAINTENANCE',
      page: 1,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(under);
  });

  it('searches case-insensitively across fields', async () => {
    const result = await listEquipment({ q: '_ASSET_', page: 1 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((i) => i.assetNumber.includes('_asset_'))).toBe(
      true
    );
  });

  it('reads a single equipment with its factory', async () => {
    const id = tracked.equipmentIds[0];
    const equipment = await getEquipmentById(id);
    expect(equipment?.id).toBe(id);
    expect(equipment?.factory.name).toBe(`${PROBE}_factory`);
  });

  it('returns null for an unknown equipment id', async () => {
    expect(await getEquipmentById('no-such-equipment')).toBeNull();
  });

  it('lists factories including the probe factory', async () => {
    const factories = await listFactories();
    expect(factories.some((f) => f.id === tracked.factoryIds[0])).toBe(true);
  });
});

describe('createEquipment action', () => {
  it('creates an equipment and redirects to its detail page', async () => {
    const values = await validEquipmentValues(`${PROBE}_new_asset`);
    const result = await invoke(() => createEquipment(values));

    expect(result.kind).toBe('redirect');
    const url = redirectUrl(result);
    expect(url).toMatch(/^\/equipment\//);

    const id = url!.split('/').pop()!;
    const row = await prisma.equipment.findUnique({ where: { id } });
    expect(row).not.toBeNull();
    expect(row?.name).toBe(values.name);
    expect(row?.assetNumber).toBe(values.assetNumber);
    tracked.equipmentIds.push(id);
  });

  it('rejects a duplicate asset number with a friendly error', async () => {
    const values = await validEquipmentValues(`${PROBE}_dup_asset`);
    const first = await invoke(() => createEquipment(values));
    if (first.kind === 'redirect') {
      tracked.equipmentIds.push(first.url.split('/').pop()!);
    }

    const result = await invoke(() => createEquipment(values));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value).toEqual({
        ok: false,
        error:
          'An asset with this number already exists. Choose a different asset number.',
      });
    }
  });

  it('rejects a factory that no longer exists', async () => {
    const values = await validEquipmentValues(`${PROBE}_bad_fac`);
    const result = await invoke(() =>
      createEquipment({ ...values, factoryId: 'ghost-factory' })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
      expect((result.value as { error: string }).error).toContain(
        'factory no longer exists'
      );
    }
  });

  it('returns field errors for invalid input', async () => {
    const values = await validEquipmentValues(`${PROBE}_invalid`);
    const result = await invoke(() =>
      createEquipment({ ...values, name: '', assetNumber: '' })
    );
    expect(result.kind).toBe('result');
    if (result.kind === 'result' && !result.value.ok) {
      expect(result.value.fieldErrors?.name).toBe('Equipment name is required.');
      expect(result.value.fieldErrors?.assetNumber).toBe(
        'Asset number is required.'
      );
    }
  });

  it('normalises blank optional text to null on save', async () => {
    const values = await validEquipmentValues(`${PROBE}_blank_opts`);
    values.description = '   ';
    values.criticality = '';
    const result = await invoke(() => createEquipment(values));
    expect(result.kind).toBe('redirect');

    const id = redirectUrl(result)!.split('/').pop()!;
    const row = await prisma.equipment.findUnique({ where: { id } });
    expect(row?.description).toBeNull();
    expect(row?.criticality).toBeNull();
    tracked.equipmentIds.push(id);
  });
});

describe('updateEquipment action', () => {
  it('updates an existing equipment', async () => {
    const id = await createEquipmentRow(tracked.factoryIds[0], {
      assetNumber: `${PROBE}_to_edit`,
    });
    tracked.equipmentIds.push(id);

    const values = await validEquipmentValues(`${PROBE}_edited_asset`);
    values.name = `${PROBE}_edited_name`;
    const result = await invoke(() => updateEquipment(id, values));
    expect(result.kind).toBe('redirect');

    const row = await prisma.equipment.findUnique({ where: { id } });
    expect(row?.name).toBe(values.name);
    expect(row?.assetNumber).toBe(values.assetNumber);
  });

  it('reports when the equipment no longer exists', async () => {
    const values = await validEquipmentValues(`${PROBE}_ghost_upd`);
    const result = await invoke(() => updateEquipment('ghost-equipment', values));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value).toEqual({
        ok: false,
        error: 'This equipment no longer exists.',
      });
    }
  });

  it('rejects updating onto a taken asset number', async () => {
    const a = await createEquipmentRow(tracked.factoryIds[0], {
      assetNumber: `${PROBE}_held_asset`,
    });
    const b = await createEquipmentRow(tracked.factoryIds[0], {
      assetNumber: `${PROBE}_free_asset`,
    });
    tracked.equipmentIds.push(a, b);

    const values = await validEquipmentValues(`${PROBE}_held_asset`);
    const result = await invoke(() => updateEquipment(b, values));
    expect(result.kind).toBe('result');
    if (result.kind === 'result') {
      expect(result.value.ok).toBe(false);
      expect((result.value as { error: string }).error).toContain(
        'already exists'
      );
    }
  });
});
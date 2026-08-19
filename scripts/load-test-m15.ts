import 'dotenv/config';
import Redis from 'ioredis';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  getDashboardAggregates,
  getDashboardOverview,
} from '@/server/dashboard';
import { getMaintenanceReport, getDowntimeReport } from '@/server/reports';
import {
  invalidateAggregateCaches,
  CACHE_KEYS,
} from '@/lib/cache';

const RUN = `m15load_${Date.now().toString(36)}`;
const TARGET_RECORDS = 10_000;
const TARGET_DOWNTIME = 10_000;
const REASONS = [
  'MECHANICAL',
  'ELECTRICAL',
  'HYDRAULIC',
  'PNEUMATIC',
  'MATERIAL',
  'OPERATOR_ERROR',
  'QUALITY',
  'CHANGEOVER',
] as const;

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, extra = ''): void {
  if (ok) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${extra ? ` | ${extra}` : ''}`);
  }
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const value = await fn();
  return [value, performance.now() - start];
}

const tracked = {
  factoryIds: [] as string[],
  userIds: [] as string[],
  equipmentIds: [] as string[],
};

async function seed(): Promise<void> {
  const factoryId = (
    await prisma.factory.create({
      data: { name: `${RUN} Load Factory`, location: `${RUN} Loc` },
    })
  ).id;
  tracked.factoryIds.push(factoryId);

  const technicianId = (
    await prisma.user.create({
      data: {
        name: `${RUN} Load Tech`,
        email: `${RUN}@load.test`,
        password: 'not-used',
        role: 'TECHNICIAN',
      },
    })
  ).id;
  tracked.userIds.push(technicianId);

  const equipmentIds: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const equipment = await prisma.equipment.create({
      data: {
        name: `${RUN} Load Eq ${i}`,
        assetNumber: `${RUN}-EQ-${i}`,
        location: `${RUN} Loc`,
        status: 'OPERATIONAL',
        factoryId,
      },
    });
    equipmentIds.push(equipment.id);
  }
  tracked.equipmentIds.push(...equipmentIds);

  const base = Date.now() - 540 * 86_400_000;

  for (let i = 0; i < TARGET_RECORDS; i += 500) {
    const chunk: Prisma.MaintenanceRecordCreateManyInput[] = [];
    for (let j = 0; j < 500; j += 1) {
      const idx = i + j;
      chunk.push({
        equipmentId: equipmentIds[idx % equipmentIds.length],
        technicianId,
        description: 'Load harness record',
        completedDate: new Date(base + idx * 3_600_000),
      });
    }
    await prisma.maintenanceRecord.createMany({ data: chunk });
    if ((i / 500) % 10 === 0) {
      console.log(`  seeded records ${i + 500}/${TARGET_RECORDS}`);
    }
  }

  for (let i = 0; i < TARGET_DOWNTIME; i += 500) {
    const chunk: Prisma.DowntimeEventCreateManyInput[] = [];
    for (let j = 0; j < 500; j += 1) {
      const idx = i + j;
      const startedAt = new Date(base + idx * 3_600_000);
      const resolved = idx % 3 !== 0;
      chunk.push({
        equipmentId: equipmentIds[idx % equipmentIds.length],
        reportedById: technicianId,
        startedAt,
        endedAt: resolved ? new Date(startedAt.getTime() + 1_800_000) : null,
        status: resolved ? 'RESOLVED' : 'OPEN',
        reason: REASONS[idx % REASONS.length],
      });
    }
    await prisma.downtimeEvent.createMany({ data: chunk });
    if ((i / 500) % 10 === 0) {
      console.log(`  seeded downtime ${i + 500}/${TARGET_DOWNTIME}`);
    }
  }
}

async function cleanup(): Promise<void> {
  await prisma.downtimeEvent.deleteMany({
    where: { equipmentId: { in: tracked.equipmentIds } },
  });
  await prisma.maintenanceRecord.deleteMany({
    where: { equipmentId: { in: tracked.equipmentIds } },
  });
  await prisma.maintenanceTask.deleteMany({
    where: { equipmentId: { in: tracked.equipmentIds } },
  });
  await prisma.equipment.deleteMany({
    where: { id: { in: tracked.equipmentIds } },
  });
  await prisma.user.deleteMany({ where: { id: { in: tracked.userIds } } });
  await prisma.factory.deleteMany({
    where: { id: { in: tracked.factoryIds } },
  });
  await invalidateAggregateCaches();
}

async function main(): Promise<void> {
  console.log(`Seeding ${RUN} with ${TARGET_RECORDS} records + ${TARGET_DOWNTIME} downtime events...`);
  await seed();
  console.log('Seeding complete.');

  const redis = new Redis(process.env.REDIS_URL!);

  const [recordCount, downtimeCount, equipmentCount] = await Promise.all([
    prisma.maintenanceRecord.count({ where: { description: 'Load harness record' } }),
    prisma.downtimeEvent.count({ where: { notes: null, equipmentId: { in: tracked.equipmentIds } } }),
    prisma.equipment.count({ where: { id: { in: tracked.equipmentIds } } }),
  ]);
  check(
    `dataset exceeds 10k rows (${recordCount} records + ${downtimeCount} downtime + ${equipmentCount} equipment)`,
    recordCount === TARGET_RECORDS && downtimeCount === TARGET_DOWNTIME
  );

  try {
    console.log('A. Dashboard aggregates: cold vs cached');
    await invalidateAggregateCaches();
    const [dashCold, dashColdMs] = await timed(() => getDashboardAggregates());
    const [dashHot, dashHotMs] = await timed(() => getDashboardAggregates());
    console.log(
      `    dashboard aggregates: cold=${dashColdMs.toFixed(1)}ms hot=${dashHotMs.toFixed(1)}ms`
    );
    check(
      'dashboard aggregates faster on cache hit',
      dashHotMs < dashColdMs,
      `cold=${dashColdMs.toFixed(1)}ms hot=${dashHotMs.toFixed(1)}ms`
    );
    check(
      'cached result matches recomputed result',
      JSON.stringify(dashHot) === JSON.stringify(dashCold)
    );

    const ttl = await redis.ttl(CACHE_KEYS.dashboardAggregates);
    check(
      'dashboard key persisted with a TTL',
      ttl > 0 && ttl <= 60,
      `ttl=${ttl}s`
    );

    console.log('B. Full dashboard overview: cold vs cached');
    await invalidateAggregateCaches();
    const [ovCold, ovColdMs] = await timed(() => getDashboardOverview());
    const [ovHot, ovHotMs] = await timed(() => getDashboardOverview());
    console.log(
      `    dashboard overview: cold=${ovColdMs.toFixed(1)}ms hot=${ovHotMs.toFixed(1)}ms`
    );
    check(
      'dashboard overview faster on cache hit',
      ovHotMs < ovColdMs,
      `cold=${ovColdMs.toFixed(1)}ms hot=${ovHotMs.toFixed(1)}ms`
    );
    check(
      'overview cached equals overview cold',
      JSON.stringify(ovHot) === JSON.stringify(ovCold)
    );

    console.log('C. Maintenance report: cold vs cached');
    await invalidateAggregateCaches();
    const [maintCold, maintColdMs] = await timed(() =>
      getMaintenanceReport({})
    );
    const [maintHot, maintHotMs] = await timed(() => getMaintenanceReport({}));
    console.log(
      `    maintenance report: cold=${maintColdMs.toFixed(1)}ms hot=${maintHotMs.toFixed(1)}ms`
    );
    check(
      'maintenance report faster on cache hit',
      maintHotMs < maintColdMs,
      `cold=${maintColdMs.toFixed(1)}ms hot=${maintHotMs.toFixed(1)}ms`
    );
    check(
      'cached maintenance report matches recomputed',
      maintHot.totalRecords === maintCold.totalRecords &&
        maintHot.byEquipment.length === maintCold.byEquipment.length
    );

    console.log('D. Downtime report: cold vs cached');
    await invalidateAggregateCaches();
    const [dtCold, dtColdMs] = await timed(() => getDowntimeReport({}));
    const [dtHot, dtHotMs] = await timed(() => getDowntimeReport({}));
    console.log(
      `    downtime report: cold=${dtColdMs.toFixed(1)}ms hot=${dtHotMs.toFixed(1)}ms`
    );
    check(
      'downtime report faster on cache hit',
      dtHotMs < dtColdMs,
      `cold=${dtColdMs.toFixed(1)}ms hot=${dtHotMs.toFixed(1)}ms`
    );
    check(
      'cached downtime report matches recomputed',
      dtHot.totalEvents === dtCold.totalEvents
    );

    console.log('E. Filtered reports bypass the cache (recomputed live)');
    const filtered = await getDowntimeReport({ from: '2026-01-01' });
    check(
      'filtered downtime report recomputes live (subset of full window)',
      filtered.totalEvents > 0 && filtered.totalEvents < dtCold.totalEvents,
      `filtered=${filtered.totalEvents} unfiltered=${dtCold.totalEvents}`
    );
    const rawKey = await redis.get(CACHE_KEYS.reportsDowntime);
    const cachedDt = rawKey
      ? (JSON.parse(rawKey) as { totalEvents: number })
      : null;
    check(
      'filtered query did not overwrite the cached unfiltered report',
      cachedDt !== null && cachedDt.totalEvents === dtCold.totalEvents
    );
  } finally {
    await redis.quit();
    await cleanup();
    await prisma.$disconnect();
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
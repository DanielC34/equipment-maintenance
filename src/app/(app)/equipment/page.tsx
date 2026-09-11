import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Inbox } from 'lucide-react';
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_CRITICALITIES,
  equipmentFilterSchema,
  type EquipmentFilterValues,
} from '@/lib/validations';
import type { EquipmentStatus } from '@prisma/client';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { listEquipment } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { FilterChip } from '@/components/ui/filter-chip';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';

export const metadata = {
  title: 'Equipment | EMMS',
};

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under maintenance',
  OFFLINE: 'Offline',
};

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission(PERMISSIONS.equipmentView);

  const raw = await searchParams;
  const filter: EquipmentFilterValues = equipmentFilterSchema.parse(raw);
  const { q, status, criticality, page } = filter;

  const { items, total, pageSize, totalPages } = await listEquipment({
    q,
    status,
    criticality,
    page,
  });
  const canCreate = hasPermission(session, PERMISSIONS.equipmentCreate);
  const hasFilters = Boolean(q || status || criticality);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (criticality) params.set('criticality', criticality);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/equipment?${query}` : '/equipment';
  }

  const columns = [
    {
      key: 'name',
      header: 'Equipment',
      render: (equipment: (typeof items)[0]) => (
        <div>
          <Link
            href={`/equipment/${equipment.id}`}
            className="font-medium text-[var(--io-accent)] hover:underline"
          >
            {equipment.name}
          </Link>
          {equipment.location && (
            <p className="mt-0.5 text-xs text-gray-500">{equipment.location}</p>
          )}
        </div>
      ),
    },
    { key: 'assetNumber', header: 'Asset number' },
    { key: 'factory.name', header: 'Factory' },
    {
      key: 'criticality',
      header: 'Criticality',
      render: (e: (typeof items)[0]) => e.criticality ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (e: (typeof items)[0]) => <StatusBadge status={e.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description={`${total} ${total === 1 ? 'asset' : 'assets'} in the registry`}
        actions={
          canCreate ? (
            <Link href="/equipment/new">
              <Button>
                <Plus aria-hidden />
                Add equipment
              </Button>
            </Link>
          ) : undefined
        }
      />

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-[var(--io-border)] bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, asset number, or location"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            statusColored
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All statuses</option>
            {EQUIPMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="criticality">Criticality</Label>
          <select
            id="criticality"
            name="criticality"
            defaultValue={criticality ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All levels</option>
            {EQUIPMENT_CRITICALITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">
            Search
          </Button>
          {hasFilters && (
            <Link href="/equipment">
              <Button variant="ghost">Clear</Button>
            </Link>
          )}
        </div>
      </form>

      {hasFilters ? (
        <div className="flex flex-wrap gap-2">
          {q && <FilterChip label="Search" value={q} removeParam="q" />}
          {status && (
            <FilterChip
              label="Status"
              value={STATUS_LABELS[status as EquipmentStatus]}
              removeParam="status"
            />
          )}
          {criticality && (
            <FilterChip
              label="Criticality"
              value={criticality}
              removeParam="criticality"
            />
          )}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        rowAction={(item) => ({
          href: `/equipment/${item.id}`,
          label: 'View',
        })}
        emptyState={{
          icon: Inbox,
          title: hasFilters
            ? 'No equipment matches your search'
            : 'No equipment registered yet',
          description: hasFilters
            ? 'Try a different search term, status, or criticality, or clear the filters.'
            : canCreate
              ? 'Register the first asset to start building the asset registry.'
              : 'Assets registered by an administrator or supervisor will appear here.',
          action: canCreate
            ? { href: '/equipment/new', label: 'Add equipment' }
            : undefined,
        }}
        pagination={{
          start,
          end,
          total,
          page,
          totalPages,
          pageHref,
        }}
        caption="Equipment registry"
      />
    </div>
  );
}

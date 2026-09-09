import Link from 'next/link';
import { Inbox, History } from 'lucide-react';
import { FilterChip } from '@/components/ui/filter-chip';
import {
  maintenanceHistoryFilterSchema,
  type MaintenanceHistoryFilterValues,
} from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  listMaintenanceHistory,
  listEquipmentsForSelect,
  listAssignableUsers,
} from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { PriorityIndicator } from '@/components/ui/priority-indicator';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Maintenance history | EMMS',
};

function formatCompletedDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default async function MaintenanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.maintenanceView);

  const raw = await searchParams;
  const filter: MaintenanceHistoryFilterValues =
    maintenanceHistoryFilterSchema.parse(raw);
  const { q, equipmentId, technicianId, from, to, page } = filter;

  const [history, equipments, technicians] = await Promise.all([
    listMaintenanceHistory({ q, equipmentId, technicianId, from, to, page }),
    listEquipmentsForSelect(),
    listAssignableUsers(),
  ]);

  const { items, total, pageSize, totalPages } = history;
  const hasFilters = Boolean(q || equipmentId || technicianId || from || to);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (equipmentId) params.set('equipmentId', equipmentId);
    if (technicianId) params.set('technicianId', technicianId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/maintenance/history?${query}` : '/maintenance/history';
  }

  const columns = [
    {
      key: 'completedDate',
      header: 'Completed',
      render: (record: typeof items[0]) => (
        <span className="whitespace-nowrap text-gray-700">{formatCompletedDate(record.completedDate)}</span>
      ),
    },
    {
      key: 'equipment',
      header: 'Equipment',
      render: (record: typeof items[0]) => (
        <div>
          <Link
            href={`/equipment/${record.equipment.id}`}
            className="font-medium text-[var(--io-accent)] hover:underline"
          >
            {record.equipment.name}
          </Link>
          <span className="text-gray-500"> · {record.equipment.assetNumber}</span>
        </div>
      ),
    },
    {
      key: 'task',
      header: 'Task',
      render: (record: typeof items[0]) => (
        record.task ? (
          <Link
            href={`/maintenance/${record.task.id}`}
            className="font-medium text-[var(--io-accent)] hover:underline"
          >
            {record.task.title}
          </Link>
        ) : (
          <span className="text-gray-500">Standalone record</span>
        )
      ),
    },
    { key: 'technician.name', header: 'Technician' },
    { key: 'description', header: 'Work performed', render: (r: typeof items[0]) => <p className="max-w-xs line-clamp-1 text-gray-700">{r.description}</p> },
    { key: 'task.priority', header: 'Priority', render: (r: typeof items[0]) => r.task ? <PriorityIndicator priority={r.task.priority} /> : <span className="text-gray-400">—</span> },
    { key: 'parts', header: 'Parts', render: (r: typeof items[0]) => r._count.partsUsed },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance history"
        description={`${total} ${total === 1 ? 'completed record' : 'completed records'} of maintenance work`}
        actions={
          <Link href="/maintenance">
            <Button variant="outline">
              <History aria-hidden />
              Scheduled maintenance
            </Button>
          </Link>
        }
      />

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-[var(--io-border)] bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1 sm:min-w-48">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Equipment, asset number, task, or technician"
            className="mt-1"
          />
        </div>
        <div className="sm:min-w-40">
          <Label htmlFor="equipmentId">Equipment</Label>
          <select
            id="equipmentId"
            name="equipmentId"
            defaultValue={equipmentId ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All equipment</option>
            {equipments.map((equipment) => (
              <option key={equipment.id} value={equipment.id}>
                {equipment.name} · {equipment.assetNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:min-w-40">
          <Label htmlFor="technicianId">Technician</Label>
          <select
            id="technicianId"
            name="technicianId"
            defaultValue={technicianId ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All technicians</option>
            {technicians.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ''}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ''}
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Search
          </Button>
          {hasFilters ? (
            <Link href="/maintenance/history">
              <Button variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </div>
      </form>

      {hasFilters ? (
        <div className="flex flex-wrap gap-2">
          {q && (
            <FilterChip
              label="Search"
              value={q}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('q');
                window.location.search = params.toString();
              }}
            />
          )}
          {equipmentId && (
            <FilterChip
              label="Equipment"
              value={equipments.find(e => e.id === equipmentId)?.name ?? equipmentId}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('equipmentId');
                window.location.search = params.toString();
              }}
            />
          )}
          {technicianId && (
            <FilterChip
              label="Technician"
              value={technicians.find(t => t.id === technicianId)?.name ?? technicianId}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('technicianId');
                window.location.search = params.toString();
              }}
            />
          )}
          {from && (
            <FilterChip
              label="From"
              value={from}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('from');
                window.location.search = params.toString();
              }}
            />
          )}
          {to && (
            <FilterChip
              label="To"
              value={to}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('to');
                window.location.search = params.toString();
              }}
            />
          )}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        rowAction={(item) => ({
          href: `/maintenance/history/${item.id}`,
          label: 'View',
        })}
        emptyState={{
          icon: Inbox,
          title: hasFilters ? 'No completed maintenance records match your search' : 'No completed maintenance yet',
          description: hasFilters
            ? 'Try a different search term or clear the filters.'
            : 'Once maintenance work is completed, the record will appear here with the task, technician, and parts used.',
        }}
        pagination={{
          start,
          end,
          total,
          page,
          totalPages,
          pageHref,
        }}
        caption="Maintenance history records"
      />
    </div>
  );
}
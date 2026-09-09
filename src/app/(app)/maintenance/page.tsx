import Link from 'next/link';
import { Plus, Inbox, History } from 'lucide-react';
import {
  MAINTENANCE_STATUSES,
  PRIORITIES,
  maintenanceFilterSchema,
  type MaintenanceFilterValues,
} from '@/lib/validations';
import type { MaintenanceStatus, Priority } from '@prisma/client';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { listMaintenanceTasks } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { FilterChip } from '@/components/ui/filter-chip';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityIndicator } from '@/components/ui/priority-indicator';

export const metadata = {
  title: 'Maintenance | EMMS',
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

function formatScheduledDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission(PERMISSIONS.maintenanceView);

  const raw = await searchParams;
  const filter: MaintenanceFilterValues = maintenanceFilterSchema.parse(raw);
  const { q, status, priority, page } = filter;

  const { items, total, pageSize, totalPages } = await listMaintenanceTasks({
    q,
    status,
    priority,
    page,
  });
  const canCreate = hasPermission(session, PERMISSIONS.maintenanceSchedule);
  const hasFilters = Boolean(q || status || priority);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/maintenance?${query}` : '/maintenance';
  }

  const columns = [
    {
      key: 'title',
      header: 'Task',
      render: (task: typeof items[0]) => (
        <div>
          <Link
            href={`/maintenance/${task.id}`}
            className="font-medium text-[var(--io-accent)] hover:underline"
          >
            {task.title}
          </Link>
          {task.description ? (
            <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-gray-500">
              {task.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'equipment',
      header: 'Equipment',
      render: (task: typeof items[0]) => (
        <div>
          <Link
            href={`/equipment/${task.equipment.id}`}
            className="font-medium text-[var(--io-accent)] hover:underline"
          >
            {task.equipment.name}
          </Link>
          <span className="text-gray-500"> · {task.equipment.assetNumber}</span>
          {task.equipment.location && (
            <p className="mt-0.5 text-xs text-gray-500">{task.equipment.location}</p>
          )}
        </div>
      ),
    },
    { key: 'assignedUser.name', header: 'Assigned to', render: (t: typeof items[0]) => t.assignedUser?.name ?? '—' },
    { key: 'scheduledDate', header: 'Scheduled', render: (t: typeof items[0]) => <span className="whitespace-nowrap text-gray-700">{formatScheduledDate(t.scheduledDate)}</span> },
    { key: 'priority', header: 'Priority', render: (t: typeof items[0]) => <PriorityIndicator priority={t.priority} /> },
    { key: 'status', header: 'Status', render: (t: typeof items[0]) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={`${total} ${total === 1 ? 'task' : 'tasks'} scheduled`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/maintenance/history">
              <Button variant="outline">
                <History aria-hidden />
                History
              </Button>
            </Link>
            {canCreate ? (
              <Link href="/maintenance/new">
                <Button>
                  <Plus aria-hidden />
                  Schedule maintenance
                </Button>
              </Link>
            ) : null}
          </div>
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
            placeholder="Task title, description, or equipment"
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
            {MAINTENANCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            name="priority"
            defaultValue={priority ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">
            Search
          </Button>
          {hasFilters && (
            <Link href="/maintenance">
              <Button variant="ghost">Clear</Button>
            </Link>
          )}
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
          {status && (
            <FilterChip
              label="Status"
              value={STATUS_LABELS[status as MaintenanceStatus]}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('status');
                window.location.search = params.toString();
              }}
            />
          )}
          {priority && (
            <FilterChip
              label="Priority"
              value={PRIORITY_LABELS[priority as Priority]}
              onRemove={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete('priority');
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
          href: `/maintenance/${item.id}`,
          label: 'View',
        })}
        emptyState={{
          icon: Inbox,
          title: hasFilters ? 'No maintenance tasks match your search' : 'No maintenance tasks scheduled yet',
          description: hasFilters
            ? 'Try a different search term, status, or priority, or clear the filters.'
            : 'Maintenance tasks scheduled by an administrator or supervisor will appear here.',
        }}
        pagination={{
          start,
          end,
          total,
          page,
          totalPages,
          pageHref,
        }}
        caption="Maintenance registry"
      />
    </div>
  );
}
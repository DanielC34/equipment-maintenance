import Link from 'next/link';
import { Plus, Inbox } from 'lucide-react';
import {
  MAINTENANCE_STATUSES,
  PRIORITIES,
  maintenanceFilterSchema,
  type MaintenanceFilterValues,
} from '@/lib/validations';
import type { MaintenanceStatus, Priority } from '@prisma/client';
import {
  PERMISSIONS,
  requirePermission,
  hasPermission,
} from '@/server/rbac';
import { listMaintenanceTasks } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenancePriorityBadge } from '@/components/maintenance/maintenance-priority-badge';

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

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={`${total} ${total === 1 ? 'task' : 'tasks'} scheduled`}
        actions={
          canCreate ? (
            <Link href="/maintenance/new">
              <Button>
                <Plus aria-hidden />
                Schedule maintenance
              </Button>
            </Link>
          ) : undefined
        }
      />

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="q"
            className="block text-sm font-medium text-gray-700"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Task title, description, or equipment"
            className={`${inputClass} sm:mt-1`}
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className={`${inputClass} sm:mt-1`}
          >
            <option value="">All statuses</option>
            {MAINTENANCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700"
          >
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={priority ?? ''}
            className={`${inputClass} sm:mt-1`}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Inbox aria-hidden className="size-8 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {hasFilters
              ? 'No maintenance tasks match your search'
              : 'No maintenance tasks scheduled yet'}
          </h2>
          <p className="max-w-md text-sm text-gray-600">
            {hasFilters
              ? 'Try a different search term, status, or priority, or clear the filters.'
              : canCreate
                ? 'Schedule the first maintenance task to start building the maintenance log.'
                : 'Maintenance tasks scheduled by an administrator or supervisor will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th scope="col" className="px-4 py-3">
                    Task
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Equipment
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Assigned to
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Scheduled
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Priority
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/maintenance/${task.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {task.title}
                      </Link>
                      {task.description ? (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-gray-500">
                          {task.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <Link
                        href={`/equipment/${task.equipment.id}`}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {task.equipment.name}
                      </Link>
                      <span className="text-gray-500">
                        {' '}
                        · {task.equipment.assetNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {task.assignedUser ? task.assignedUser.name : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatScheduledDate(task.scheduledDate)}
                    </td>
                    <td className="px-4 py-3">
                      <MaintenancePriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <MaintenanceStatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/maintenance/${task.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Showing {start}–{end} of {total}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Previous
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'pointer-events-none opacity-50'
                    )}
                  >
                    Previous
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Next
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'pointer-events-none opacity-50'
                    )}
                  >
                    Next
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
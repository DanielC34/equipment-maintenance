import Link from 'next/link';
import { Inbox, History } from 'lucide-react';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MaintenancePriorityBadge } from '@/components/maintenance/maintenance-priority-badge';

export const metadata = {
  title: 'Maintenance history | EMMS',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

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
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1 sm:min-w-48">
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
            placeholder="Equipment, asset tag, task, or technician"
            className={`${inputClass} sm:mt-1`}
          />
        </div>
        <div className="sm:min-w-40">
          <label
            htmlFor="equipmentId"
            className="block text-sm font-medium text-gray-700"
          >
            Equipment
          </label>
          <select
            id="equipmentId"
            name="equipmentId"
            defaultValue={equipmentId ?? ''}
            className={`${inputClass} sm:mt-1`}
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
          <label
            htmlFor="technicianId"
            className="block text-sm font-medium text-gray-700"
          >
            Technician
          </label>
          <select
            id="technicianId"
            name="technicianId"
            defaultValue={technicianId ?? ''}
            className={`${inputClass} sm:mt-1`}
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
          <label
            htmlFor="from"
            className="block text-sm font-medium text-gray-700"
          >
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ''}
            className={`${inputClass} sm:mt-1`}
          />
        </div>
        <div>
          <label
            htmlFor="to"
            className="block text-sm font-medium text-gray-700"
          >
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ''}
            className={`${inputClass} sm:mt-1`}
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Inbox aria-hidden className="size-8 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {hasFilters
              ? 'No completed maintenance records match your search'
              : 'No completed maintenance yet'}
          </h2>
          <p className="max-w-md text-sm text-gray-600">
            {hasFilters
              ? 'Try a different search term or clear the filters.'
              : 'Once maintenance work is completed, the record will appear here with the task, technician, and parts used.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th scope="col" className="px-4 py-3">
                    Completed
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Equipment
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Task
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Technician
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Work performed
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Priority
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Parts
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {formatCompletedDate(record.completedDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <Link
                        href={`/equipment/${record.equipment.id}`}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {record.equipment.name}
                      </Link>
                      <span className="text-gray-500">
                        {' '}
                        · {record.equipment.assetNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.task ? (
                        <Link
                          href={`/maintenance/${record.task.id}`}
                          className="text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          {record.task.title}
                        </Link>
                      ) : (
                        <span className="text-gray-500">
                          Standalone record
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.technician.name}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-700">
                      <p className="line-clamp-1">{record.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {record.task ? (
                        <MaintenancePriorityBadge priority={record.task.priority} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record._count.partsUsed}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/maintenance/history/${record.id}`}
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
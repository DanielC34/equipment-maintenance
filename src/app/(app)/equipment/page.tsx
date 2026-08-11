import Link from 'next/link';
import { Plus, Inbox } from 'lucide-react';
import {
  EQUIPMENT_STATUSES,
  equipmentFilterSchema,
  type EquipmentFilterValues,
} from '@/lib/validations';
import type { EquipmentStatus } from '@prisma/client';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { listEquipment } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EquipmentStatusBadge } from '@/components/equipment/equipment-status-badge';

export const metadata = {
  title: 'Equipment | EMMS',
};

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under maintenance',
  OFFLINE: 'Offline',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission(PERMISSIONS.equipmentView);

  const raw = await searchParams;
  const filter: EquipmentFilterValues = equipmentFilterSchema.parse(raw);
  const { q, status, page } = filter;

  const { items, total, pageSize, totalPages } = await listEquipment({
    q,
    status,
    page,
  });
  const canCreate = hasPermission(session, PERMISSIONS.equipmentCreate);
  const hasFilters = Boolean(q || status);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/equipment?${query}` : '/equipment';
  }

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
            placeholder="Name, asset number, or location"
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
            {EQUIPMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
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
              ? 'No equipment matches your search'
              : 'No equipment registered yet'}
          </h2>
          <p className="max-w-md text-sm text-gray-600">
            {hasFilters
              ? 'Try a different search term or status, or clear the filters.'
              : canCreate
                ? 'Register the first asset to start building the asset registry.'
                : 'Assets registered by an administrator or supervisor will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th scope="col" className="px-4 py-3">
                    Equipment
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Asset number
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Factory
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Criticality
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
                {items.map((equipment) => (
                  <tr key={equipment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/equipment/${equipment.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {equipment.name}
                      </Link>
                      {equipment.location ? (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {equipment.location}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {equipment.assetNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {equipment.factory.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {equipment.criticality ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <EquipmentStatusBadge status={equipment.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/equipment/${equipment.id}`}
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

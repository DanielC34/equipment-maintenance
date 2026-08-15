import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import { downtimeFilterSchema } from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  getEquipmentDowntimeHistory,
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';
import { getEquipmentById } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DowntimeStatusBadge } from '@/components/downtime/downtime-status-badge';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipment = await getEquipmentById(id);
  return {
    title: equipment
      ? `${equipment.name} downtime | EMMS`
      : 'Equipment downtime | EMMS',
  };
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default async function EquipmentDowntimePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.appView);

  const { id } = await params;
  const equipment = await getEquipmentById(id);
  if (!equipment) {
    notFound();
  }

  const raw = await searchParams;
  const filter = downtimeFilterSchema.parse(raw);
  const { page, q } = filter;

  const { items, total, pageSize, totalPages } =
    await getEquipmentDowntimeHistory(id, page, q);

  const hasFilters = Boolean(q);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query
      ? `/equipment/${id}/downtime?${query}`
      : `/equipment/${id}/downtime`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${equipment.name} — downtime`}
        description={`${equipment.assetNumber} · ${total} ${total === 1 ? 'downtime event' : 'downtime events'} recorded`}
        actions={
          <Link href={`/equipment/${equipment.id}`}>
            <Button variant="outline">
              <ArrowLeft aria-hidden />
              Back to equipment
            </Button>
          </Link>
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
            Search this downtime
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Reporter name or notes"
            className={`${inputClass} sm:mt-1`}
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {hasFilters ? (
          <Link href={`/equipment/${equipment.id}/downtime`}>
            <Button variant="ghost">Clear</Button>
          </Link>
        ) : null}
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Inbox aria-hidden className="size-8 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {hasFilters
              ? 'No downtime events match your search'
              : 'No downtime events recorded for this equipment yet'}
          </h2>
          <p className="max-w-md text-sm text-gray-600">
            {hasFilters
              ? 'Try a different search term or clear the search.'
              : 'Downtime events for this asset will appear here with the cause, duration, and reporter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th scope="col" className="px-4 py-3">
                    Started
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Reason
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Duration
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Reported by
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ended
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {formatDateTime(event.startedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <DowntimeReasonBadge reason={event.reason} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {formatDowntimeDuration(
                        downtimeDurationMinutes(event)
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {event.reportedBy.name}
                    </td>
                    <td className="px-4 py-3">
                      <DowntimeStatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {event.endedAt ? formatDateTime(event.endedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/downtime/${event.id}`}
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
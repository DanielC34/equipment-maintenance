import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { downtimeFilterSchema } from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  getEquipmentDowntimeHistory,
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';
import { getEquipmentById } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
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
        className="flex flex-col gap-3 rounded-xl border border-[var(--io-border)] bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor="q">Search this downtime</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Reporter name or notes"
            className="mt-1"
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
        <EmptyState
          icon={Inbox}
          title={hasFilters ? 'No downtime events match your search' : 'No downtime events recorded for this equipment yet'}
          description={
            hasFilters
              ? 'Try a different search term or clear the search.'
              : 'Downtime events for this asset will appear here with the cause, duration, and reporter.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--io-border)] bg-white">
          <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                <TableHead className="io-table-header">Started</TableHead>
                <TableHead className="io-table-header">Reason</TableHead>
                <TableHead className="io-table-header">Duration</TableHead>
                <TableHead className="io-table-header">Reported by</TableHead>
                <TableHead className="io-table-header">Status</TableHead>
                <TableHead className="io-table-header">Ended</TableHead>
                <TableHead className="io-table-header text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {formatDateTime(event.startedAt)}
                  </TableCell>
                  <TableCell>
                    <DowntimeReasonBadge reason={event.reason} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {formatDowntimeDuration(downtimeDurationMinutes(event))}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {event.reportedBy.name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {event.endedAt ? formatDateTime(event.endedAt) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/downtime/${event.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            start={start}
            end={end}
            total={total}
            page={page}
            totalPages={totalPages}
            pageHref={pageHref}
          />
        </div>
      )}
    </div>
  );
}

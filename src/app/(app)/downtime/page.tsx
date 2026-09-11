import Link from 'next/link';
import { Inbox, Plus, TriangleAlert } from 'lucide-react';
import {
  DOWNTIME_STATUSES,
  downtimeFilterSchema,
  type DowntimeFilterValues,
} from '@/lib/validations';
import type { DowntimeStatus } from '@prisma/client';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import {
  listDowntimeEvents,
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';
import { listEquipmentsForSelect } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { FilterChip } from '@/components/ui/filter-chip';
import { StatusBadge } from '@/components/ui/status-badge';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Downtime | EMMS',
};

const STATUS_LABELS: Record<DowntimeStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatStartDateTime(date: Date): { date: string; time: string } {
  return {
    date: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
}

function openEquipmentNames(
  events: { status: DowntimeStatus; equipment: { name: string } }[]
): string {
  const names = events
    .filter((event) => event.status === 'OPEN')
    .map((event) => event.equipment.name);
  if (names.length <= 3) {
    return names.join(', ');
  }
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}

export default async function DowntimePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission(PERMISSIONS.appView);

  const raw = await searchParams;
  const filter: DowntimeFilterValues = downtimeFilterSchema.parse(raw);
  const { q, equipmentId, status, from, to, page } = filter;

  const [downtime, equipments] = await Promise.all([
    listDowntimeEvents({ q, equipmentId, status, from, to, page }),
    listEquipmentsForSelect(),
  ]);

  const { items, total, pageSize, totalPages } = downtime;
  const canRecord = hasPermission(session, PERMISSIONS.downtimeRecord);
  const hasFilters = Boolean(q || equipmentId || status || from || to);
  const openCount = items.filter((event) => event.status === 'OPEN').length;
  const downEquipment = openEquipmentNames(items);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (equipmentId) params.set('equipmentId', equipmentId);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/downtime?${query}` : '/downtime';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downtime"
        description={`${total} ${total === 1 ? 'event' : 'events'} recorded`}
        actions={
          canRecord ? (
            <Link href="/downtime/new">
              <Button>
                <Plus aria-hidden />
                Record downtime
              </Button>
            </Link>
          ) : undefined
        }
      />

      {openCount > 0 && !hasFilters ? (
        <div className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <TriangleAlert
              aria-hidden
              className="size-4 shrink-0 text-red-600"
            />
            <span className="text-sm font-medium text-red-700">
              {openCount} open {openCount === 1 ? 'event' : 'events'}
            </span>
          </div>
          <p className="text-sm text-red-700">
            {downEquipment} currently down — resolve to record the end time and
            duration.
          </p>
        </div>
      ) : null}

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
            placeholder="Equipment, asset number, reporter, or notes"
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
            {DOWNTIME_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
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
            <Link href="/downtime">
              <Button variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </div>
      </form>

      {hasFilters ? (
        <div className="flex flex-wrap gap-2">
          {q && <FilterChip label="Search" value={q} removeParam="q" />}
          {equipmentId && (
            <FilterChip
              label="Equipment"
              value={
                equipments.find((e) => e.id === equipmentId)?.name ??
                equipmentId
              }
              removeParam="equipmentId"
            />
          )}
          {status && (
            <FilterChip
              label="Status"
              value={STATUS_LABELS[status as DowntimeStatus]}
              removeParam="status"
            />
          )}
          {from && <FilterChip label="From" value={from} removeParam="from" />}
          {to && <FilterChip label="To" value={to} removeParam="to" />}
        </div>
      ) : null}

      <DataTable
        columns={[
          {
            key: 'startedAt',
            header: 'Started',
            render: (event: (typeof items)[0]) => {
              const started = formatStartDateTime(event.startedAt);
              return (
                <span className="text-gray-700">
                  <span className="block">{started.date}</span>
                  <span className="block">{started.time}</span>
                </span>
              );
            },
          },
          {
            key: 'equipment',
            header: 'Equipment',
            render: (event: (typeof items)[0]) => (
              <div>
                <Link
                  href={`/equipment/${event.equipment.id}`}
                  className="font-medium text-[var(--io-accent)] hover:underline"
                >
                  {event.equipment.name}
                </Link>
                <span className="text-gray-500">
                  {' '}
                  · {event.equipment.assetNumber}
                </span>
              </div>
            ),
          },
          {
            key: 'reason',
            header: 'Reason',
            render: (event: (typeof items)[0]) => (
              <DowntimeReasonBadge reason={event.reason} />
            ),
          },
          {
            key: 'duration',
            header: 'Duration',
            render: (event: (typeof items)[0]) =>
              event.status === 'OPEN' ? (
                <span className="font-medium text-red-600">Ongoing</span>
              ) : (
                <span className="text-gray-700">
                  {formatDowntimeDuration(downtimeDurationMinutes(event))}
                </span>
              ),
          },
          { key: 'reportedBy.name', header: 'Reported by' },
          {
            key: 'status',
            header: 'Status',
            render: (e: (typeof items)[0]) => <StatusBadge status={e.status} />,
          },
          {
            key: 'endedAt',
            header: 'Ended',
            render: (e: (typeof items)[0]) =>
              e.endedAt ? formatDateTime(e.endedAt) : '—',
          },
        ]}
        data={items}
        keyExtractor={(item) => item.id}
        rowAction={(item) => ({
          href: `/downtime/${item.id}`,
          label: 'View',
        })}
        emptyState={{
          icon: Inbox,
          title: hasFilters
            ? 'No downtime events match your filters'
            : 'No downtime events recorded yet',
          description: hasFilters
            ? 'Try a different search term or clear the filters.'
            : canRecord
              ? 'Record the first downtime event to start tracking production loss.'
              : 'Downtime events recorded by an operator or administrator will appear here.',
          action: canRecord
            ? { href: '/downtime/new', label: 'Record downtime' }
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
        caption="Downtime events"
      />
    </div>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import {
  reportFilterSchema,
  type ReportFilterValues,
} from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getMaintenanceReport, getDowntimeReport } from '@/server/reports';
import { formatDowntimeDuration } from '@/server/downtime';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';

export const metadata = {
  title: 'Reports | EMMS',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.reportsView);

  const raw = await searchParams;
  const filter: ReportFilterValues = reportFilterSchema.parse(raw);
  const { from, to } = filter;
  const hasFilters = Boolean(from || to);

  const [maintenance, downtime] = await Promise.all([
    getMaintenanceReport({ from, to }),
    getDowntimeReport({ from, to }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Summaries of completed maintenance work and downtime for the selected period."
      />

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
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
            Apply
          </Button>
          {hasFilters ? (
            <Link href="/reports">
              <Button variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6">
          <ReportSection
            title="Completed maintenance"
            summary={
              maintenance.totalRecords === 0
                ? `No completed work${hasFilters ? ' in this period' : ' yet'}`
                : `${maintenance.totalRecords} ${maintenance.totalRecords === 1 ? 'record' : 'records'} of completed maintenance${hasFilters ? ' in this period' : ''}`
            }
          >
            {maintenance.totalRecords === 0 ? (
              <NoData hasFilters={hasFilters} />
            ) : (
              <>
                <BarRow
                  label="Total records"
                  value={`${maintenance.totalRecords}`}
                  pct={maintenance.totalRecords > 0 ? 100 : 0}
                />
                <BarRow
                  label={`Parts used (sum)`}
                  value={`${maintenance.totalParts}`}
                  pct={
                    maintenance.totalParts > 0 &&
                    maintenance.totalRecords > 0
                      ? 100
                      : 0
                  }
                />
                <Breakdown
                  title="By technician"
                  rows={maintenance.byTechnician}
                  emptyText="No technician data"
                />
                <Breakdown
                  title="By equipment"
                  rows={maintenance.byEquipment}
                  emptyText="No equipment data"
                />
              </>
            )}
          </ReportSection>
        </section>

        <section className="space-y-6">
          <ReportSection
            title="Downtime"
            summary={
              downtime.totalEvents === 0
                ? `No downtime events${hasFilters ? ' in this period' : ' yet'}`
                : `${downtime.totalEvents} ${downtime.totalEvents === 1 ? 'event' : 'events'} — ${downtime.totalMinutes} total minutes`
            }
          >
            {downtime.totalEvents === 0 ? (
              <NoData hasFilters={hasFilters} />
            ) : (
              <>
                <BarRow
                  label="Resolved events"
                  value={`${downtime.resolved}`}
                  pct={
                    downtime.totalEvents > 0
                      ? Math.round(
                          (downtime.resolved / downtime.totalEvents) * 100
                        )
                      : 0
                  }
                />
                <BarRow
                  label="Open events"
                  value={`${downtime.open}`}
                  pct={
                    downtime.totalEvents > 0
                      ? Math.round((downtime.open / downtime.totalEvents) * 100)
                      : 0
                  }
                />
                <BarRow
                  label={`Total downtime${hasFilters ? ' in period' : ''}`}
                  value={formatDowntimeDuration(downtime.totalMinutes)}
                  pct={downtime.totalMinutes > 0 ? 100 : 0}
                />
                <BarRow
                  label="Mean time to repair"
                  value={
                    downtime.resolved > 0
                      ? formatDowntimeDuration(
                          Math.round(downtime.totalMinutes / downtime.resolved)
                        )
                      : '—'
                  }
                  pct={downtime.resolved > 0 ? 100 : 0}
                />
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700">
                    By reason
                  </h3>
                  {downtime.byReason.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      No reason data.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {downtime.byReason.map((row) => (
                        <li key={row.reason} className="flex items-center gap-3">
                          <DowntimeReasonBadge reason={row.reason} />
                          <span className="text-sm text-gray-500">
                            {row.count} {row.count === 1 ? 'event' : 'events'}
                          </span>
                          <span className="ml-auto text-sm text-gray-700">
                            {formatDowntimeDuration(row.minutes)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </ReportSection>
        </section>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{summary}</p>
      </div>
      <div className="border-t border-gray-100 px-4 py-4">{children}</div>
    </section>
  );
}

function NoData({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Inbox aria-hidden className="size-8 text-gray-400" />
      <p className="text-sm text-gray-600">
        {hasFilters
          ? 'No data matches the selected date range.'
          : 'No data recorded yet for this report.'}
      </p>
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
}) {
  const width = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: { name: string; count: number }[];
  emptyText: string;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.name}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-gray-600">{row.name}</span>
              <span className="shrink-0 text-gray-900">
                {row.count} {row.count === 1 ? 'record' : 'records'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
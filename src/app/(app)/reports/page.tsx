import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { reportFilterSchema, type ReportFilterValues } from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getMaintenanceReport, getDowntimeReport } from '@/server/reports';
import { formatDowntimeDuration } from '@/server/downtime';
import type { DowntimeReason } from '@prisma/client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterChip } from '@/components/ui/filter-chip';
import { MiniRecordTable } from '@/components/dashboard/mini-record-table';
import { ReportMetricTile } from '@/components/reports/report-metric-tile';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';

export const metadata = {
  title: 'Reports | EMMS',
};

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

  const period = hasFilters
    ? from && to
      ? `${from} – ${to}`
      : from
        ? `from ${from}`
        : `up to ${to}`
    : 'all time';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Summaries of completed maintenance work and downtime for the selected period."
        actions={
          <form
            method="GET"
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3 w-full sm:w-auto"
          >
            <div className="min-w-0 flex-1 sm:min-w-40">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={from ?? ''}
                className="mt-1"
              />
            </div>
            <div className="min-w-0 flex-1 sm:min-w-40">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                name="to"
                type="date"
                defaultValue={to ?? ''}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 sm:flex-none">
              <Button type="submit" variant="outline">
                Apply Filters
              </Button>
              {hasFilters ? (
                <Link href="/reports">
                  <Button variant="ghost">Clear filters</Button>
                </Link>
              ) : null}
            </div>
          </form>
        }
      />

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {from && <FilterChip label="From" value={from} removeParam="from" />}
          {to && <FilterChip label="To" value={to} removeParam="to" />}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MAINTENANCE SUMMARY */}
        <section className="rounded-xl border border-[var(--io-border)] bg-white">
          <div className="border-b border-[var(--io-border)] px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Completed maintenance
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {maintenance.totalRecords === 0
                ? `No completed work${hasFilters ? ' in this period' : ' yet'}`
                : `${maintenance.totalRecords} ${maintenance.totalRecords === 1 ? 'record' : 'records'} of completed maintenance${hasFilters ? ' in this period' : ''}`}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">Period: {period}</p>
          </div>
          <div className="px-5 py-5">
            {maintenance.totalRecords === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Inbox aria-hidden className="size-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {hasFilters
                    ? 'No completed maintenance matches the selected date range.'
                    : 'No completed maintenance recorded yet.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReportMetricTile
                    label="Total records"
                    value={maintenance.totalRecords}
                  />
                  <ReportMetricTile
                    label="Parts used"
                    value={maintenance.totalParts}
                  />
                </div>
                <div className="mt-6 space-y-6">
                  <MiniRecordTable
                    caption="By technician"
                    columns={[
                      { key: 'name', header: 'Technician' },
                      {
                        key: 'count',
                        header: 'Records',
                        className: 'text-right',
                      },
                    ]}
                    data={maintenance.byTechnician}
                    keyExtractor={(r) => r.name}
                    viewAllHref="/maintenance/history"
                    viewAllLabel="View all maintenance history"
                    maxRows={5}
                  />
                  <MiniRecordTable
                    caption="By equipment"
                    columns={[
                      { key: 'name', header: 'Equipment' },
                      {
                        key: 'count',
                        header: 'Records',
                        className: 'text-right',
                      },
                    ]}
                    data={maintenance.byEquipment}
                    keyExtractor={(r) => r.name}
                    viewAllHref="/maintenance/history"
                    viewAllLabel="View all maintenance history"
                    maxRows={5}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* DOWNTIME INCIDENTS */}
        <section className="rounded-xl border border-[var(--io-border)] bg-white">
          <div className="border-b border-[var(--io-border)] px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Downtime incidents
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {downtime.totalEvents === 0
                ? `No downtime events${hasFilters ? ' in this period' : ' yet'}`
                : `${downtime.totalEvents} ${downtime.totalEvents === 1 ? 'event' : 'events'} — ${formatDowntimeDuration(downtime.totalMinutes)} total`}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">Period: {period}</p>
          </div>
          <div className="px-5 py-5">
            {downtime.totalEvents === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Inbox aria-hidden className="size-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {hasFilters
                    ? 'No downtime events match the selected date range.'
                    : 'No downtime events recorded yet.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ReportMetricTile
                    label="Total events"
                    value={downtime.totalEvents}
                  />
                  <ReportMetricTile
                    label="Resolved"
                    value={downtime.resolved}
                  />
                  <ReportMetricTile
                    label="Open"
                    value={downtime.open}
                    flagged={downtime.open > 0}
                  />
                  <ReportMetricTile
                    label="Total downtime"
                    value={formatDowntimeDuration(downtime.totalMinutes)}
                  />
                  <ReportMetricTile
                    label="Mean time to repair"
                    value={
                      downtime.resolved > 0
                        ? formatDowntimeDuration(
                            Math.round(
                              downtime.totalMinutes / downtime.resolved
                            )
                          )
                        : '—'
                    }
                  />
                </div>
                <div className="mt-6">
                  <MiniRecordTable
                    caption="By reason"
                    columns={[
                      {
                        key: 'reason',
                        header: 'Reason',
                        render: (row: {
                          reason: DowntimeReason;
                          count: number;
                          minutes: number;
                        }) => <DowntimeReasonBadge reason={row.reason} />,
                      },
                      {
                        key: 'count',
                        header: 'Events',
                        className: 'text-right',
                      },
                      {
                        key: 'duration',
                        header: 'Duration',
                        className: 'text-right',
                        render: (row: { minutes: number }) =>
                          formatDowntimeDuration(row.minutes),
                      },
                    ]}
                    data={downtime.byReason}
                    keyExtractor={(r) => r.reason}
                    viewAllHref="/downtime"
                    viewAllLabel="View all downtime events"
                    maxRows={5}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import type { MaintenanceStatus } from '@prisma/client';
import { requireAuth } from '@/server/rbac';
import { getDashboardOverview } from '@/server/dashboard';
import {
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityIndicator } from '@/components/ui/priority-indicator';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';
import { MetadataField } from '@/components/ui/metadata-field';
import { AlertCard } from '@/components/dashboard/alert-card';
import { ProgressStat } from '@/components/dashboard/progress-stat';
import { EquipmentStatusList } from '@/components/dashboard/equipment-status-list';
import { MiniRecordTable } from '@/components/dashboard/mini-record-table';

export const metadata = {
  title: 'Dashboard | EMMS',
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const { user } = session;

  const overview = await getDashboardOverview();
  const {
    equipmentTotal,
    equipmentByStatus,
    maintenanceByStatus,
    overdueTasks,
    openDowntime,
    upcomingTasks,
    openDowntimeEvents,
    recentDowntimeEvents,
    downtimeTotals,
  } = overview;

  const operationalPct =
    equipmentTotal > 0
      ? Math.round(
          ((equipmentByStatus.OPERATIONAL || 0) / equipmentTotal) * 100
        )
      : 0;

  const maintenanceTotal = Object.values(maintenanceByStatus).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name}. A live summary of equipment, maintenance, and downtime across the plant.`}
      />

      {/* KPI STRIP */}
      <section className="dashboard-kpi-strip rounded-xl border border-[var(--io-border)] bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetadataField
            label="Equipment"
            isKpi
            qualifier={`${operationalPct}% operational`}
            qualifierClassName="text-warning-foreground"
          >
            <Link
              href="/equipment"
              className="io-kpi-number text-gray-900 hover:text-[var(--io-accent)]"
            >
              {equipmentTotal}
            </Link>
          </MetadataField>
          <MetadataField
            label="Active maintenance"
            isKpi
            qualifier="tasks in progress"
          >
            <Link
              href="/maintenance"
              className="io-kpi-number text-gray-900 hover:text-[var(--io-accent)]"
            >
              {maintenanceByStatus.IN_PROGRESS}
            </Link>
          </MetadataField>
          <MetadataField
            label="Open downtime"
            isKpi
            qualifier="events needing resolution"
            qualifierClassName="text-destructive-foreground"
          >
            <Link
              href="/downtime?status=OPEN"
              className="io-kpi-number text-gray-900 hover:text-[var(--io-accent)]"
            >
              {openDowntime}
            </Link>
          </MetadataField>
          <MetadataField
            label="Mean time to repair"
            isKpi
            qualifier={`across ${downtimeTotals.resolvedCount} resolved ${downtimeTotals.resolvedCount === 1 ? 'event' : 'events'}`}
          >
            <Link
              href="/downtime"
              className="io-kpi-number text-gray-900 hover:text-[var(--io-accent)]"
            >
              {downtimeTotals.mttrMinutes === null
                ? '—'
                : formatDowntimeDuration(downtimeTotals.mttrMinutes)}
            </Link>
          </MetadataField>
        </div>
      </section>

      {/* THREE-COLUMN OPERATIONAL ROW */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* CRITICAL ALERTS */}
        <AlertCard
          variant="critical"
          icon={<TriangleAlert aria-hidden className="size-5" />}
          title="Critical Alerts"
          description={
            <div className="space-y-2">
              {openDowntimeEvents.length > 0 ? (
                <div>
                  <p className="font-medium text-destructive-foreground">
                    {openDowntimeEvents.length} open downtime event
                    {openDowntimeEvents.length !== 1 ? 's' : ''}
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-gray-600">
                    {openDowntimeEvents.slice(0, 3).map((event) => (
                      <li key={event.id} className="flex items-center gap-2">
                        <Link
                          href={`/downtime/${event.id}`}
                          className="text-[var(--io-accent)] hover:underline"
                        >
                          {event.equipment.name}
                        </Link>
                        <span className="text-gray-500">
                          Since {formatDateTime(event.startedAt)}
                        </span>
                      </li>
                    ))}
                    {openDowntimeEvents.length > 3 && (
                      <li className="text-sm text-gray-500">
                        +{openDowntimeEvents.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-600">No critical downtime events</p>
              )}
              {overdueTasks > 0 ? (
                <div className="mt-2">
                  <p className="font-medium text-warning-foreground">
                    {overdueTasks} overdue maintenance task
                    {overdueTasks !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-gray-600">
                  No overdue maintenance tasks
                </p>
              )}
            </div>
          }
          action={{ href: '/downtime?status=OPEN', label: 'View all alerts' }}
        />

        {/* MAINTENANCE STATUS */}
        <section className="rounded-xl border border-[var(--io-border)] bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Maintenance Status
          </h3>
          <div className="space-y-3">
            {(Object.keys(maintenanceByStatus) as MaintenanceStatus[]).map(
              (status) => {
                const statusLabels: Record<string, string> = {
                  SCHEDULED: 'Scheduled',
                  IN_PROGRESS: 'In progress',
                  COMPLETED: 'Completed',
                  CANCELLED: 'Cancelled',
                };
                return (
                  <ProgressStat
                    key={status}
                    label={`${statusLabels[status]} tasks`}
                    count={maintenanceByStatus[status]}
                    total={maintenanceTotal}
                    status={status}
                  />
                );
              }
            )}
          </div>
        </section>

        {/* EQUIPMENT STATUS */}
        <EquipmentStatusList
          items={[
            { name: 'Operational', status: 'OPERATIONAL' },
            { name: 'Under Maintenance', status: 'UNDER_MAINTENANCE' },
            { name: 'Offline', status: 'OFFLINE' },
          ]}
        />
      </div>

      {/* TWO-COLUMN OPERATIONAL ROW */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* UPCOMING WORK */}
        <MiniRecordTable
          columns={[
            { key: 'title', header: 'Task' },
            {
              key: 'equipment',
              header: 'Equipment',
              render: (task: (typeof upcomingTasks)[0]) => (
                <Link
                  href={`/equipment/${task.equipment.id}`}
                  className="font-medium text-[var(--io-accent)] hover:underline"
                >
                  {task.equipment.name}
                </Link>
              ),
            },
            {
              key: 'assigned',
              header: 'Assigned',
              className: 'hidden sm:table-cell',
              render: (task: (typeof upcomingTasks)[0]) =>
                task.assignedUser?.name ?? 'Unassigned',
            },
            {
              key: 'date',
              header: 'Due',
              render: (task: (typeof upcomingTasks)[0]) =>
                formatDate(task.scheduledDate),
            },
            {
              key: 'priority',
              header: 'Priority',
              className: 'hidden sm:table-cell',
              render: (task: (typeof upcomingTasks)[0]) => (
                <PriorityIndicator priority={task.priority} />
              ),
            },
          ]}
          data={upcomingTasks}
          keyExtractor={(task) => task.id}
          viewAllHref="/maintenance"
          viewAllLabel="View all upcoming work"
        />

        {/* RECENT DOWNTIME */}
        <MiniRecordTable
          columns={[
            {
              key: 'equipment',
              header: 'Equipment',
              render: (event: (typeof recentDowntimeEvents)[0]) => (
                <Link
                  href={`/equipment/${event.equipment.id}`}
                  className="font-medium text-[var(--io-accent)] hover:underline"
                >
                  {event.equipment.name}
                </Link>
              ),
            },
            {
              key: 'started',
              header: 'Started',
              className: 'hidden sm:table-cell',
              render: (event: (typeof recentDowntimeEvents)[0]) =>
                formatDateTime(event.startedAt),
            },
            {
              key: 'reason',
              header: 'Reason',
              className: 'hidden sm:table-cell',
              render: (event: (typeof recentDowntimeEvents)[0]) => (
                <DowntimeReasonBadge reason={event.reason} />
              ),
            },
            {
              key: 'duration',
              header: 'Duration',
              render: (event: (typeof recentDowntimeEvents)[0]) =>
                event.status === 'OPEN' ? (
                  <span className="font-medium text-red-600">Ongoing</span>
                ) : (
                  <span className="text-gray-700">
                    {formatDowntimeDuration(downtimeDurationMinutes(event))}
                  </span>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (event: (typeof recentDowntimeEvents)[0]) => (
                <StatusBadge status={event.status} />
              ),
            },
          ]}
          data={recentDowntimeEvents}
          keyExtractor={(event) => event.id}
          viewAllHref="/downtime"
          viewAllLabel="View all downtime"
        />
      </div>
    </div>
  );
}

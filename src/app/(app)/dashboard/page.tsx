import Link from 'next/link';
import {
  Boxes,
  CalendarClock,
  Inbox,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import type {
  EquipmentStatus,
  MaintenanceStatus,
} from '@prisma/client';
import { requireAuth } from '@/server/rbac';
import { getDashboardOverview } from '@/server/dashboard';
import {
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EquipmentStatusBadge } from '@/components/equipment/equipment-status-badge';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenancePriorityBadge } from '@/components/maintenance/maintenance-priority-badge';
import { DowntimeStatusBadge } from '@/components/downtime/downtime-status-badge';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';

export const metadata = {
  title: 'Dashboard | EMMS',
};

const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under maintenance',
  OFFLINE: 'Offline',
};

const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
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
    recentRecords,
    openDowntimeEvents,
    recentDowntimeEvents,
    downtimeTotals,
    downtimeByReason,
  } = overview;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name}. A live summary of equipment, maintenance, and downtime across the plant.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Equipment"
          value={equipmentTotal}
          hint="assets in the registry"
          href="/equipment"
          icon={Boxes}
        />
        <KpiCard
          label="Overdue maintenance"
          value={overdueTasks}
          hint="scheduled or in progress"
          href="/maintenance"
          icon={CalendarClock}
          alert={overdueTasks > 0}
        />
        <KpiCard
          label="Open downtime"
          value={openDowntime}
          hint="events needing resolution"
          href="/downtime"
          icon={TriangleAlert}
          alert={openDowntime > 0}
        />
        <KpiCard
          label="Avg. repair time"
          value={
            downtimeTotals.mttrMinutes === null
              ? '—'
              : formatDowntimeDuration(downtimeTotals.mttrMinutes)
          }
          hint={`across ${downtimeTotals.resolvedCount} resolved ${downtimeTotals.resolvedCount === 1 ? 'event' : 'events'}`}
          href="/downtime"
          icon={Wrench}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white">
          <SectionHeader
            title="Equipment status"
            href="/equipment"
            linkLabel="View all equipment"
          />
          <div className="divide-y divide-gray-100">
            {(Object.keys(equipmentByStatus) as EquipmentStatus[]).map(
              (status) => (
                <div
                  key={status}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-36">
                      <EquipmentStatusBadge status={status} />
                    </span>
                    <span className="text-sm text-gray-500">
                      {EQUIPMENT_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">
                    {equipmentByStatus[status]}
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <SectionHeader
            title="Maintenance status"
            href="/maintenance"
            linkLabel="View all maintenance"
          />
          <div className="divide-y divide-gray-100">
            {(Object.keys(maintenanceByStatus) as MaintenanceStatus[]).map(
              (status) => (
                <div
                  key={status}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-24">
                      <MaintenanceStatusBadge status={status} />
                    </span>
                    <span className="text-sm text-gray-500">
                      {MAINTENANCE_STATUS_LABELS[status]} tasks
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      status === 'IN_PROGRESS' && 'text-amber-600',
                      status === 'CANCELLED' && 'text-gray-400'
                    )}
                  >
                    {maintenanceByStatus[status]}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white">
          <SectionHeader
            title="Upcoming work"
            href="/maintenance"
            linkLabel="View maintenance"
          />
          {upcomingTasks.length === 0 ? (
            <EmptyState
              message="No upcoming scheduled maintenance."
              href="/maintenance"
              hrefLabel="Open maintenance"
              icon={CalendarClock}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/maintenance/${task.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {task.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {task.equipment.name} ·{' '}
                      {task.assignedUser?.name ?? 'Unassigned'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <MaintenancePriorityBadge priority={task.priority} />
                    <span className="text-xs text-gray-500">
                      {formatDate(task.scheduledDate)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <SectionHeader
            title="Recent maintenance"
            href="/maintenance/history"
            linkLabel="View history"
          />
          {recentRecords.length === 0 ? (
            <EmptyState
              message="No completed maintenance records yet."
              href="/maintenance"
              hrefLabel="Open maintenance"
              icon={Inbox}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentRecords.map((record) => (
                <li key={record.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/maintenance/history/${record.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {record.equipment.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      Completed by {record.technician.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(record.completedDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white">
          <SectionHeader
            title="Open downtime"
            href="/downtime?status=OPEN"
            linkLabel="View open events"
          />
          {openDowntimeEvents.length === 0 ? (
            <EmptyState
              message="No open downtime events. Good to go."
              href="/downtime"
              hrefLabel="Open downtime"
              icon={TriangleAlert}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {openDowntimeEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/downtime/${event.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {event.equipment.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      Since {formatDateTime(event.startedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DowntimeReasonBadge reason={event.reason} />
                    <DowntimeStatusBadge status={event.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <SectionHeader
            title="Downtime by reason"
            href="/downtime"
            linkLabel="View downtime"
          />
          {downtimeByReason.length === 0 ? (
            <EmptyState
              message="No downtime events recorded yet."
              href="/downtime"
              hrefLabel="Open downtime"
              icon={Inbox}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {downtimeByReason.map((row) => (
                <div
                  key={row.reason}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <DowntimeReasonBadge reason={row.reason} />
                  <span className="text-sm text-gray-700">
                    {row.count} {row.count === 1 ? 'event' : 'events'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <SectionHeader
          title="Recent downtime"
          href="/downtime"
          linkLabel="View all downtime"
        />
        {recentDowntimeEvents.length === 0 ? (
          <EmptyState
            message="No downtime events recorded yet."
            href="/downtime"
            hrefLabel="Open downtime"
            icon={Inbox}
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentDowntimeEvents.map((event) => (
              <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/downtime/${event.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    {event.equipment.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    Started {formatDateTime(event.startedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DowntimeReasonBadge reason={event.reason} />
                  <DowntimeStatusBadge status={event.status} />
                  <span className="text-xs text-gray-500">
                    {formatDowntimeDuration(downtimeDurationMinutes(event))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  alert = false,
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  icon: typeof Boxes;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 transition-colors',
        alert
          ? 'border-amber-300 hover:border-amber-400'
          : 'hover:border-indigo-300'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <Icon
          aria-hidden
          className={cn(
            'size-4',
            alert ? 'text-amber-500' : 'text-gray-400'
          )}
        />
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-bold text-gray-900',
          alert && 'text-amber-700'
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
    </Link>
  );
}

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <Link
        href={href}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function EmptyState({
  message,
  href,
  hrefLabel,
  icon: Icon,
}: {
  message: string;
  href: string;
  hrefLabel: string;
  icon: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <Icon aria-hidden className="size-8 text-gray-400" />
      <p className="text-sm text-gray-600">{message}</p>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        {hrefLabel}
      </Link>
    </div>
  );
}
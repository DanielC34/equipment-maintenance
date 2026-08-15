import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import {
  getDowntimeEventById,
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DowntimeStatusBadge } from '@/components/downtime/downtime-status-badge';
import { DowntimeReasonBadge } from '@/components/downtime/downtime-reason-badge';
import { DowntimeResolveForm } from '@/components/downtime/downtime-resolve-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getDowntimeEventById(id);
  return {
    title: event
      ? `${event.equipment.name} downtime | EMMS`
      : 'Downtime | EMMS',
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

export default async function DowntimeEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.appView);
  const { id } = await params;
  const event = await getDowntimeEventById(id);

  if (!event) {
    notFound();
  }

  const canResolve = hasPermission(session, PERMISSIONS.downtimeResolve);
  const minutes = downtimeDurationMinutes(event);
  const duration = formatDowntimeDuration(minutes);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downtime event"
        description={`${event.equipment.name} · ${event.equipment.assetNumber}`}
        actions={
          <Link href="/downtime">
            <Button variant="outline">
              <ArrowLeft aria-hidden />
              Back to downtime
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Status
            </dt>
            <dd className="mt-1">
              <DowntimeStatusBadge status={event.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Duration
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {duration}
              {minutes !== null && minutes > 0 ? (
                <span className="text-gray-500"> ({minutes} minutes)</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Started
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDateTime(event.startedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Ended
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.endedAt ? formatDateTime(event.endedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Reason
            </dt>
            <dd className="mt-1">
              <DowntimeReasonBadge reason={event.reason} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Event ID
            </dt>
            <dd className="mt-1 break-all text-xs text-gray-500">{event.id}</dd>
          </div>
          {event.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Notes / details
              </dt>
              <dd className="mt-1 text-sm text-gray-700">{event.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {event.status === 'OPEN' && canResolve ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 border-b border-amber-100 px-6 py-4">
            <TriangleAlert aria-hidden className="size-4 text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Resolve this event
            </h2>
          </div>
          <div className="max-w-md p-6">
            <p className="mb-4 text-sm text-gray-600">
              Set the end time to close the event and record its duration.
            </p>
            <DowntimeResolveForm eventId={event.id} />
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Equipment</h2>
        </div>
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Name
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              <Link
                href={`/equipment/${event.equipment.id}`}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {event.equipment.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Asset tag
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.equipment.assetNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Factory
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.equipment.factory.name}
              <span className="text-gray-500">
                {' '}
                · {event.equipment.factory.location}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Location
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.equipment.location}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Reporter</h2>
        </div>
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Name
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.reportedBy.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Email
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.reportedBy.email}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getMaintenanceRecordById } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { EquipmentStatusBadge } from '@/components/equipment/equipment-status-badge';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenancePriorityBadge } from '@/components/maintenance/maintenance-priority-badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getMaintenanceRecordById(id);
  return {
    title: record
      ? `${record.equipment.name} maintenance record | EMMS`
      : 'Maintenance history | EMMS',
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function MaintenanceRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.maintenanceView);
  const { id } = await params;
  const record = await getMaintenanceRecordById(id);

  if (!record) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance record"
        description={`${record.equipment.name} · ${record.equipment.assetNumber}`}
        actions={
          <Link href="/maintenance/history">
            <Button variant="outline">
              <ArrowLeft aria-hidden />
              Back to history
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Completed on
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDateTime(record.completedDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Technician
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {record.technician.name}
              <span className="text-gray-500">
                {' '}
                · {record.technician.email}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Record ID
            </dt>
            <dd className="mt-1 text-xs text-gray-500 break-all">
              {record.id}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <History aria-hidden className="size-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            Maintenance
          </h2>
        </div>
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Work performed
            </dt>
            <dd className="mt-1 text-sm text-gray-700">{record.description}</dd>
          </div>
          {record.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Findings / notes
              </dt>
              <dd className="mt-1 text-sm text-gray-700">{record.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

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
                href={`/equipment/${record.equipment.id}`}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {record.equipment.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Asset tag
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {record.equipment.assetNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Factory
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {record.equipment.factory.name}
              <span className="text-gray-500">
                {' '}
                · {record.equipment.factory.location}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Status
            </dt>
            <dd className="mt-1">
              <EquipmentStatusBadge status={record.equipment.status} />
            </dd>
          </div>
        </dl>
      </div>

      {record.task ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Task</h2>
          </div>
          <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Title
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Link
                  href={`/maintenance/${record.task.id}`}
                  className="text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  {record.task.title}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Status
              </dt>
              <dd className="mt-1">
                <MaintenanceStatusBadge status={record.task.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Priority
              </dt>
              <dd className="mt-1">
                <MaintenancePriorityBadge priority={record.task.priority} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Originally scheduled
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(record.task.scheduledDate)}
              </dd>
            </div>
            {record.task.description ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Task description
                </dt>
                <dd className="mt-1 text-sm text-gray-700">
                  {record.task.description}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Parts used</h2>
          <span className="text-xs text-gray-500">
            {record.partsUsed.length}{' '}
            {record.partsUsed.length === 1 ? 'part' : 'parts'}
          </span>
        </div>
        <div className="p-6">
          {record.partsUsed.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {record.partsUsed.map((part) => (
                <li
                  key={part.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {part.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    Qty {part.quantity}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No parts were recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { getMaintenanceTaskById } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SectionPlaceholder } from '@/components/section-placeholder';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenancePriorityBadge } from '@/components/maintenance/maintenance-priority-badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getMaintenanceTaskById(id);
  return {
    title: task ? `${task.title} | EMMS` : 'Maintenance | EMMS',
  };
}

function formatScheduledDate(date: Date): string {
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

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.maintenanceView);
  const { id } = await params;
  const task = await getMaintenanceTaskById(id);

  if (!task) {
    notFound();
  }

  const canEdit = hasPermission(session, PERMISSIONS.maintenanceSchedule);

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={`${task.equipment.name} · ${task.equipment.assetNumber}`}
        actions={
          canEdit ? (
            <Link href={`/maintenance/${task.id}/edit`}>
              <Button variant="outline">
                <Pencil aria-hidden />
                Edit
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Equipment
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              <Link
                href={`/equipment/${task.equipment.id}`}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {task.equipment.name}
              </Link>
              <span className="text-gray-500">
                {' '}
                · {task.equipment.assetNumber}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Assigned to
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {task.assignedUser ? task.assignedUser.name : 'Unassigned'}
              {task.assignedUser ? (
                <span className="text-gray-500">
                  {' '}
                  · {task.assignedUser.email}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Scheduled date
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatScheduledDate(task.scheduledDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Status
            </dt>
            <dd className="mt-1">
              <MaintenanceStatusBadge status={task.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Priority
            </dt>
            <dd className="mt-1">
              <MaintenancePriorityBadge priority={task.priority} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Location
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {task.equipment.location}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Created
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(task.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Last updated
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(task.updatedAt)}
            </dd>
          </div>
        </dl>
        {task.description ? (
          <div className="border-t border-gray-100 px-6 py-4">
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Description
            </dt>
            <dd className="mt-1 text-sm text-gray-700">{task.description}</dd>
          </div>
        ) : null}
      </div>

      <SectionPlaceholder
        badge="Upcoming milestone"
        title="Completion and history"
        description="Once this task is performed, the completion workflow (Milestone 7) will attach a maintenance record here — what was done, by whom, when, and which parts were used."
        planned={[
          'Mark the task as performed and record completion details',
          'Maintenance history attached to this task and its equipment',
        ]}
      />
    </div>
  );
}
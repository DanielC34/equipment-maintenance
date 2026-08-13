import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, History } from 'lucide-react';
import { PERMISSIONS, requirePermission, hasPermission } from '@/server/rbac';
import { getMaintenanceTaskById } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SectionPlaceholder } from '@/components/section-placeholder';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenancePriorityBadge } from '@/components/maintenance/maintenance-priority-badge';
import { MaintenanceStartButton } from '@/components/maintenance/maintenance-start-button';
import { MaintenanceCompleteForm } from '@/components/maintenance/maintenance-complete-form';

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
  const canExecute = hasPermission(session, PERMISSIONS.maintenanceComplete);
  const isAssignee = task.assignedUserId === session.user.id;
  const isEditable =
    task.status === 'SCHEDULED' || task.status === 'IN_PROGRESS';
  const record = task.maintenanceRecord;

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={`${task.equipment.name} · ${task.equipment.assetNumber}`}
        actions={
          canEdit && isEditable ? (
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

      {task.status === 'SCHEDULED' && canExecute && isAssignee ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Execute maintenance
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            You are assigned to this task. Start the work to move it to in
            progress, then record the completed maintenance.
          </p>
          <div className="mt-4">
            <MaintenanceStartButton taskId={task.id} />
          </div>
        </div>
      ) : null}

      {task.status === 'IN_PROGRESS' && canExecute && isAssignee ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Complete maintenance
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Record the work performed, any findings, and parts used to complete
            this task and create the maintenance record.
          </p>
          <div className="mt-4">
            <MaintenanceCompleteForm taskId={task.id} />
          </div>
        </div>
      ) : null}

      {record ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <History aria-hidden className="size-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Completed maintenance record
            </h2>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Completed by
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
                Completed on
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatScheduledDate(record.completedDate)}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Work performed
            </dt>
            <dd className="mt-1 text-sm text-gray-700">{record.description}</dd>
          </div>
          {record.notes ? (
            <div className="mt-4">
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Findings / notes
              </dt>
              <dd className="mt-1 text-sm text-gray-700">{record.notes}</dd>
            </div>
          ) : null}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Parts used
            </dt>
            {record.partsUsed.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {record.partsUsed.map((part) => (
                  <li key={part.id} className="flex items-center gap-2">
                    <span aria-hidden className="size-1.5 rounded-full bg-indigo-400" />
                    {part.name} — {part.quantity}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No parts recorded.</p>
            )}
          </div>
        </div>
      ) : null}

      {task.status === 'CANCELLED' ? (
        <SectionPlaceholder
          badge="Cancelled"
          title="This task was cancelled"
          description="No maintenance record was created for this task."
          planned={[]}
        />
      ) : null}

      {!record &&
      task.status !== 'CANCELLED' &&
      !(canExecute && isAssignee) ? (
        <SectionPlaceholder
          badge="Execution"
          title="Completion and history"
          description={
            task.status === 'COMPLETED'
              ? 'This task is completed but its maintenance record could not be loaded.'
              : 'Once this task is performed by the assigned technician, its completion details and parts used will appear here as a maintenance record.'
          }
          planned={
            task.status === 'COMPLETED'
              ? []
              : [
                  'Mark the task as performed and record completion details',
                  'Maintenance history attached to this task and its equipment',
                ]
          }
        />
      ) : null}
    </div>
  );
}
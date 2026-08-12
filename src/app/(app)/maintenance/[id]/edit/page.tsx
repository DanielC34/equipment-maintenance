import { notFound } from 'next/navigation';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  getMaintenanceTaskById,
  listAssignableUsers,
  listEquipmentsForSelect,
} from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { MaintenanceForm } from '@/components/maintenance/maintenance-form';

export const metadata = {
  title: 'Edit maintenance task | EMMS',
};

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.maintenanceSchedule);
  const { id } = await params;

  const [task, equipments, assignableUsers] = await Promise.all([
    getMaintenanceTaskById(id),
    listEquipmentsForSelect(),
    listAssignableUsers(),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${task.title}`}
        description="Update the scheduling details for this task."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <MaintenanceForm
          equipments={equipments}
          assignableUsers={assignableUsers}
          task={task}
        />
      </div>
    </div>
  );
}
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  listAssignableUsers,
  listEquipmentsForSelect,
} from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { MaintenanceForm } from '@/components/maintenance/maintenance-form';

export const metadata = {
  title: 'Schedule maintenance | EMMS',
};

export default async function NewMaintenancePage() {
  await requirePermission(PERMISSIONS.maintenanceSchedule);

  const [equipments, assignableUsers] = await Promise.all([
    listEquipmentsForSelect(),
    listAssignableUsers(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule maintenance"
        description="Plan a maintenance task against registered equipment."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <MaintenanceForm
          equipments={equipments}
          assignableUsers={assignableUsers}
        />
      </div>
    </div>
  );
}
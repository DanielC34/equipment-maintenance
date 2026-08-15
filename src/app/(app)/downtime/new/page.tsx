import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { listEquipmentsForSelect } from '@/server/maintenance';
import { PageHeader } from '@/components/page-header';
import { DowntimeForm } from '@/components/downtime/downtime-form';

export const metadata = {
  title: 'Record downtime | EMMS',
};

export default async function NewDowntimePage() {
  await requirePermission(PERMISSIONS.downtimeRecord);

  const equipments = await listEquipmentsForSelect();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record downtime"
        description="Log when equipment stopped and why — the end time can be added when it is resolved."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <DowntimeForm equipments={equipments} />
      </div>
    </div>
  );
}
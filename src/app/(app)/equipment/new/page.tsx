import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { listFactories } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { EquipmentForm } from '@/components/equipment/equipment-form';

export const metadata = {
  title: 'Register equipment | EMMS',
};

export default async function NewEquipmentPage() {
  await requirePermission(PERMISSIONS.equipmentCreate);
  const factories = await listFactories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register equipment"
        description="Add a new asset to the equipment registry."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <EquipmentForm factories={factories} />
      </div>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getEquipmentById, listFactories } from '@/server/equipment';
import { PageHeader } from '@/components/page-header';
import { EquipmentForm } from '@/components/equipment/equipment-form';

export const metadata = {
  title: 'Edit equipment | EMMS',
};

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.equipmentEdit);
  const { id } = await params;

  const [equipment, factories] = await Promise.all([
    getEquipmentById(id),
    listFactories(),
  ]);

  if (!equipment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${equipment.name}`}
        description="Update the details for this asset."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <EquipmentForm factories={factories} equipment={equipment} />
      </div>
    </div>
  );
}

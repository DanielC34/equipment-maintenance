import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { SectionPlaceholder } from '@/components/section-placeholder';

export default async function EquipmentPage() {
  await requirePermission(PERMISSIONS.equipmentView);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description="The asset registry for every machine and component in the plant."
      />
      <SectionPlaceholder
        badge="Equipment registry"
        title="Equipment management will live here"
        description="This milestone establishes the application shell. The equipment module is the next milestone; until then this area shows where assets will be registered, viewed, and searched."
        planned={[
          'Register new equipment (Administrators and Supervisors)',
          'Edit equipment details and status',
          'Search by name, number, location, and status',
          'Equipment detail views',
        ]}
      />
    </div>
  );
}

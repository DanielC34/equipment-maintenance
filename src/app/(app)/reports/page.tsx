import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { SectionPlaceholder } from '@/components/section-placeholder';

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.reportsView);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Summaries of maintenance, equipment performance, and downtime."
      />
      <SectionPlaceholder
        badge="Reporting"
        title="Reports will live here"
        description="This milestone establishes the application shell. Metrics and exports will be built once the equipment, maintenance, and downtime data exists."
        planned={[
          'Maintenance completion summaries',
          'Equipment performance and availability',
          'Downtime by reason code',
          'Filterable reports and exports',
        ]}
      />
    </div>
  );
}

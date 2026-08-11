import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { SectionPlaceholder } from '@/components/section-placeholder';

export default async function DowntimePage() {
  await requirePermission(PERMISSIONS.appView);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downtime"
        description="Report and resolve downtime events to track production loss."
      />
      <SectionPlaceholder
        badge="Downtime tracking"
        title="Downtime tracking will live here"
        description="This milestone establishes the application shell. Reporting, resolution, and production-loss calculation will be built in a later milestone."
        planned={[
          'Report downtime with reason codes (Operators)',
          'Resolve events and record end times',
          'Calculate downtime duration and production loss',
          'History of resolved incidents',
        ]}
      />
    </div>
  );
}

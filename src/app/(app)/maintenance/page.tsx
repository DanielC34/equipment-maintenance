import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { SectionPlaceholder } from '@/components/section-placeholder';

export default async function MaintenancePage() {
  await requirePermission(PERMISSIONS.appView);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Plan, assign, and complete maintenance work on equipment."
      />
      <SectionPlaceholder
        badge="Maintenance"
        title="Maintenance management will live here"
        description="This milestone establishes the application shell. Scheduling, assignment, and completion workflows will be built in a later milestone."
        planned={[
          'Schedule tasks with priority and due dates (Administrators and Supervisors)',
          'Assign tasks to technicians',
          'Complete tasks and record work (Technicians)',
          'Maintenance history per piece of equipment',
        ]}
      />
    </div>
  );
}

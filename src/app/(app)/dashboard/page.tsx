import { requireAuth } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { SectionPlaceholder } from '@/components/section-placeholder';

export default async function DashboardPage() {
  const session = await requireAuth();
  const { user } = session;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name}. You are signed in with the ${user.role.replace(/_/g, ' ').toLowerCase()} role.`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SectionPlaceholder
          badge="Overview"
          title="Equipment overview"
          description="Equipment counts by status and factory will be summarised here once the asset registry exists."
          planned={[
            'Equipment counts by status',
            'Breakdown by factory',
            'Search and filters',
          ]}
        />
        <SectionPlaceholder
          badge="Overview"
          title="Maintenance status"
          description="Open, scheduled, and overdue maintenance work will appear here."
          planned={[
            'Open and overdue task counts',
            'Work assigned by technician',
            'Due date summaries',
          ]}
        />
        <SectionPlaceholder
          badge="Overview"
          title="Downtime"
          description="Production loss and downtime events will be summarised here."
          planned={[
            'Recently reported events',
            'Reasons and durations',
            'Recovery time',
          ]}
        />
        <SectionPlaceholder
          badge="Overview"
          title="Alerts"
          description="Actionable alerts for the signed-in user will live here."
          planned={[
            'Overdue maintenance tasks',
            'Equipment needing attention',
            'Unscheduled downtime',
          ]}
        />
      </div>
      <SectionPlaceholder
        badge="Activity"
        title="Recent activity"
        description="A chronological feed of equipment, maintenance, and downtime actions will replace this placeholder."
        planned={[
          'Actions by the signed-in user',
          'Assigned and completed work',
          'Reported downtime',
        ]}
      />
    </div>
  );
}

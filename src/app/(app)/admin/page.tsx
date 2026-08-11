import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { SectionPlaceholder } from '@/components/section-placeholder';

export default async function AdminPage() {
  await requirePermission(PERMISSIONS.usersManage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="User management and system configuration, restricted to Administrators."
      />
      <SectionPlaceholder
        badge="Administration"
        title="User management will live here"
        description="This area is enforced server-side and restricted to Administrators. User management will be implemented in a later milestone."
        planned={[
          'Create and deactivate users',
          'Assign roles from the Session 11 permission matrix',
          'Review user activity',
        ]}
      />
    </div>
  );
}

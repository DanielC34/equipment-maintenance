import Link from 'next/link';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { UserForm } from '@/components/users/user-form';

export const metadata = {
  title: 'Add User | EMMS',
};

export default async function NewUserPage() {
  await requirePermission(PERMISSIONS.usersManage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add user"
        description="Create a new account. The user receives access immediately and signs in with the initial password you set."
      />

      <div className="max-w-xl rounded-xl border border-gray-200 bg-white p-6">
        <UserForm />
        <div className="mt-4">
          <Link href="/admin/users">
            <Button type="button" variant="ghost">
              Back to users
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
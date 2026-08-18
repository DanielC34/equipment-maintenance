import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getUserById } from '@/server/users';
import { ROLE_LABELS } from '@/lib/roles';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { UserEditForm } from '@/components/users/user-edit-form';

export const metadata = {
  title: 'Edit User | EMMS',
};

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.usersManage);
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  const isSelf = session.user.id === user.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${user.name}`}
        description={`${user.email} · ${ROLE_LABELS[user.role]} · ${
          user.active ? 'Active' : 'Inactive'
        }`}
      />

      <div className="max-w-xl rounded-xl border border-gray-200 bg-white p-6">
        <UserEditForm
          userId={user.id}
          currentRole={user.role}
          currentActive={user.active}
          isSelf={isSelf}
        />
        <div className="mt-4">
          <Link href={`/admin/users/${user.id}`}>
            <Button type="button" variant="ghost">
              Back to user
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
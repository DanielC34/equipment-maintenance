import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getUserById } from '@/server/users';
import { ROLE_LABELS } from '@/lib/roles';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { UserStatusBadge } from '@/components/users/user-status-badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserById(id);
  return {
    title: user ? `${user.name} | EMMS` : 'User | EMMS',
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function UserDetailPage({
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
        title={user.name}
        description={user.email}
        actions={
          <Link href={`/admin/users/${user.id}/edit`}>
            <Button variant="outline">
              <Pencil aria-hidden />
              Edit
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Name
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user.name}
              {isSelf ? (
                <span className="ml-2 text-xs text-gray-500">(you)</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Email
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Role
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {ROLE_LABELS[user.role]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Status
            </dt>
            <dd className="mt-1">
              <UserStatusBadge active={user.active} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Created
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(user.createdAt)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
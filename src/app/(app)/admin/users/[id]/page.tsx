import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { getUserById } from '@/server/users';
import { listAuditLog } from '@/server/audit';
import { DetailHeader } from '@/components/detail-header';
import { MetadataGrid } from '@/components/ui/metadata-grid';

import { AuditTable } from '@/components/ui/audit-table';
import { Breadcrumb } from '@/components/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserRoleBadge } from '@/components/users/user-role-badge';
import { Button } from '@/components/ui/button';

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


export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.usersManage);
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  // Fetch user activity from audit log
  const activityResult = await listAuditLog({
    q: '',
    actorId: user.id,
    page: 1,
  });

  return (
    <div className="space-y-6">
      <DetailHeader
        title={user.name}
        identity={
          <div className="flex items-center gap-2">
            <Breadcrumb
              items={[
                { label: 'Users', href: '/admin/users' },
                { label: user.name },
              ]}
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/admin/users/${user.id}/edit`}>
              <Button variant="outline">
                <Pencil aria-hidden />
                Edit
              </Button>
            </Link>
          </div>
        }
        status={<StatusBadge status={user.active ? 'active' : 'inactive'} />}
        subline={`User ID: ${user.id}`}
      />

      <div className="rounded-xl border border-[var(--io-border)] bg-white">
        <MetadataGrid
          fields={[
            { label: 'Full Name', children: user.name },
            { label: 'Employee ID', children: user.id },
            { label: 'Email', children: user.email },
            { label: 'Primary Role', children: <UserRoleBadge role={user.role} /> },
          ]}
          columns={2}
        />
      </div>

      <AuditTable
        entries={activityResult.items.map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt,
          actor: {
            id: entry.actor.id,
            name: entry.actor.name,
            role: entry.actor.role,
          },
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityLabel: entry.entityLabel ?? undefined,
        }))}
        entityHref={(entityType, entityId) => {
          switch (entityType) {
            case 'EQUIPMENT':
              return `/equipment/${entityId}`;
            case 'MAINTENANCE_TASK':
              return `/maintenance/${entityId}`;
            case 'MAINTENANCE_RECORD':
              return `/maintenance/history/${entityId}`;
            case 'DOWNTIME_EVENT':
              return `/downtime/${entityId}`;
            case 'USER':
              return `/admin/users/${entityId}`;
            default:
              return null;
          }
        }}
        emptyState={{
          title: 'No activity recorded',
          description: 'No activity has been recorded for this user yet.',
        }}
        headerActions={
          <Link href={`/audit?actorId=${user.id}`}>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        }
        pagination={{
          start: 1,
          end: Math.min(activityResult.items.length, 20),
          total: activityResult.total,
          page: 1,
          totalPages: activityResult.totalPages,
          pageHref: (target) => `/admin/users/${user.id}?page=${target}`,
        }}
      />
    </div>
  );
}
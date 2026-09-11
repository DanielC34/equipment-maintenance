import Link from 'next/link';
import { Inbox, UserPlus } from 'lucide-react';
import {
  USER_ROLES,
  userFilterSchema,
  type UserFilterValues,
} from '@/lib/validations';
import { ROLE_LABELS } from '@/lib/roles';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import { listUsers } from '@/server/users';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { FilterChip } from '@/components/ui/filter-chip';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserRoleBadge } from '@/components/users/user-role-badge';

export const metadata = {
  title: 'Users | EMMS',
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.usersManage);

  const raw = await searchParams;
  const filter: UserFilterValues = userFilterSchema.parse(raw);
  const { q, role, active, page } = filter;

  const result = await listUsers({ q, role, active, page });
  const { items, total, pageSize, totalPages } = result;
  const hasFilters = Boolean(q || role || active !== undefined);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    if (active !== undefined) params.set('active', String(active));
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/admin/users?${query}` : '/admin/users';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Create users, assign roles, and control account access. Restricted to Administrators."
        actions={
          <Link href="/admin/users/new">
            <Button>
              <UserPlus aria-hidden />
              Add user
            </Button>
          </Link>
        }
      />

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-[var(--io-border)] bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1 sm:min-w-48">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email"
            className="mt-1"
          />
        </div>
        <div className="sm:min-w-44">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue={role ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All roles</option>
            {USER_ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="active">Status</Label>
          <Select
            id="active"
            name="active"
            defaultValue={active === undefined ? '' : String(active)}
            statusColored
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">
            Search
          </Button>
          {hasFilters ? (
            <Link href="/admin/users">
              <Button variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </div>
      </form>

      {hasFilters ? (
        <div className="flex flex-wrap gap-2">
          {q && <FilterChip label="Search" value={q} removeParam="q" />}
          {role && (
            <FilterChip
              label="Role"
              value={ROLE_LABELS[role]}
              removeParam="role"
            />
          )}
          {active !== undefined && (
            <FilterChip
              label="Status"
              value={active ? 'Active' : 'Inactive'}
              removeParam="active"
            />
          )}
        </div>
      ) : null}

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (user: (typeof items)[0]) => (
              <Link
                href={`/admin/users/${user.id}`}
                className="font-medium text-[var(--io-accent)] hover:underline"
              >
                {user.name}
              </Link>
            ),
          },
          { key: 'email', header: 'Email' },
          {
            key: 'role',
            header: 'Role',
            render: (u: (typeof items)[0]) => <UserRoleBadge role={u.role} />,
          },
          {
            key: 'active',
            header: 'Status',
            render: (u: (typeof items)[0]) => (
              <StatusBadge status={u.active ? 'active' : 'inactive'} />
            ),
          },
          {
            key: 'createdAt',
            header: 'Created',
            render: (u: (typeof items)[0]) => (
              <span className="whitespace-nowrap text-gray-700">
                {formatDate(u.createdAt)}
              </span>
            ),
          },
        ]}
        data={items}
        keyExtractor={(item) => item.id}
        rowAction={(item) => ({
          href: `/admin/users/${item.id}`,
          label: 'View',
        })}
        emptyState={{
          icon: Inbox,
          title: hasFilters ? 'No users match your filters' : 'No users yet',
          description: hasFilters
            ? 'Try a different search term or clear the filters.'
            : 'Create a user to give them access to the system.',
          action: { href: '/admin/users/new', label: 'Add user' },
        }}
        pagination={{
          start,
          end,
          total,
          page,
          totalPages,
          pageHref,
        }}
        caption="User registry"
      />
    </div>
  );
}

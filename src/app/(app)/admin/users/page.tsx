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
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserStatusBadge } from '@/components/users/user-status-badge';

export const metadata = {
  title: 'Users | EMMS',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

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
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1 sm:min-w-48">
          <label
            htmlFor="q"
            className="block text-sm font-medium text-gray-700"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email"
            className={`${inputClass} sm:mt-1`}
          />
        </div>
        <div className="sm:min-w-44">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue={role ?? ''}
            className={`${inputClass} sm:mt-1`}
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
          <label
            htmlFor="active"
            className="block text-sm font-medium text-gray-700"
          >
            Status
          </label>
          <select
            id="active"
            name="active"
            defaultValue={active === undefined ? '' : String(active)}
            className={`${inputClass} sm:mt-1`}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="flex gap-2">
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Inbox aria-hidden className="size-8 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {hasFilters
              ? 'No users match your filters'
              : 'No users yet'}
          </h2>
          <p className="max-w-md text-sm text-gray-600">
            {hasFilters
              ? 'Try a different search term or clear the filters.'
              : 'Create a user to give them access to the system.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                  <th scope="col" className="px-4 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {ROLE_LABELS[user.role]}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <UserStatusBadge active={user.active} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Showing {start}–{end} of {total}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Previous
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'pointer-events-none opacity-50'
                    )}
                  >
                    Previous
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Next
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'pointer-events-none opacity-50'
                    )}
                  >
                    Next
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  auditFilterSchema,
  type AuditFilterValues,
} from '@/lib/validations';
import { PERMISSIONS, requirePermission } from '@/server/rbac';
import {
  listAuditLog,
  listAuditActors,
  describeAudit,
} from '@/server/audit';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, inputBase } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AuditActionBadge, AuditEntityBadge } from '@/components/audit/audit-badges';

export const metadata = {
  title: 'Audit Log | EMMS',
};

const ACTION_OPTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  START: 'Started',
  COMPLETE: 'Completed',
  RESOLVE: 'Resolved',
  DELETE: 'Deleted',
};

const ENTITY_OPTION_LABELS: Record<string, string> = {
  EQUIPMENT: 'Equipment',
  MAINTENANCE_TASK: 'Maintenance task',
  MAINTENANCE_RECORD: 'Maintenance record',
  DOWNTIME_EVENT: 'Downtime event',
  USER: 'User',
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function entityHref(
  entityType: string,
  entityId: string
): string | null {
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
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.auditView);

  const raw = await searchParams;
  const filter: AuditFilterValues = auditFilterSchema.parse(raw);
  const { q, actorId, action, entityType, from, to, page } = filter;

  const [audit, actors] = await Promise.all([
    listAuditLog({ q, actorId, action, entityType, from, to, page }),
    listAuditActors(),
  ]);

  const { items, total, pageSize, totalPages } = audit;
  const hasFilters = Boolean(q || actorId || action || entityType || from || to);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (actorId) params.set('actorId', actorId);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/audit?${query}` : '/audit';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="A read-only record of who did what, when — created automatically for important actions."
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
            placeholder="User, entity label, or record id"
            className="mt-1"
          />
        </div>
        <div className="sm:min-w-44">
          <Label htmlFor="actorId">User</Label>
          <select
            id="actorId"
            name="actorId"
            defaultValue={actorId ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All users</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="action">Action</Label>
          <select
            id="action"
            name="action"
            defaultValue={action ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {ACTION_OPTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="entityType">Entity</Label>
          <select
            id="entityType"
            name="entityType"
            defaultValue={entityType ?? ''}
            className={cn(inputBase, 'mt-1')}
          >
            <option value="">All entities</option>
            {AUDIT_ENTITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {ENTITY_OPTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ''}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ''}
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Search
          </Button>
          {hasFilters ? (
            <Link href="/audit">
              <Button variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </div>
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--io-border)] bg-white px-6 py-16 text-center">
          <Inbox aria-hidden className="size-8 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {hasFilters
              ? 'No audit entries match your filters'
              : 'No audit entries recorded yet'}
          </h2>
          <p className="max-w-md text-sm text-gray-600">
            {hasFilters
              ? 'Try a different search term or clear the filters.'
              : 'Audit entries are appended automatically when equipment, maintenance, and downtime records are created or updated.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--io-border)] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>What happened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => {
                const href = entityHref(entry.entityType, entry.entityId);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-gray-700">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {entry.actor.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {entry.actor.role
                          .toLowerCase()
                          .replaceAll('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AuditActionBadge action={entry.action} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AuditEntityBadge entityType={entry.entityType} />
                        {href ? (
                          <Link
                            href={href}
                            className="text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            {entry.entityLabel ?? 'View'}
                          </Link>
                        ) : (
                          <span className="text-gray-700">
                            {entry.entityLabel ?? ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <p>{describeAudit(entry)}</p>
                      <p
                        className="mt-0.5 max-w-md truncate font-mono text-xs text-gray-400"
                        title={entry.entityId}
                      >
                        {entry.entityId}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t border-[var(--io-border)] bg-[var(--io-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
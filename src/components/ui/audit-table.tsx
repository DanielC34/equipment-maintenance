import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination, PaginationProps } from '@/components/ui/pagination';
import { EmptyState, EmptyStateProps } from '@/components/ui/empty-state';
import { LoadingState, LoadingStateProps } from '@/components/ui/loading-state';
import { ErrorState, ErrorStateProps } from '@/components/ui/error-state';

export interface AuditEntry {
  id: string;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  details?: string;
}

export interface AuditTableEmptyStateProps {
  icon?: EmptyStateProps['icon'];
  title: string;
  description: string;
  action?: EmptyStateProps['action'];
}

export interface AuditTableProps {
  entries: AuditEntry[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyState?: AuditTableEmptyStateProps;
  loadingState?: LoadingStateProps;
  errorState?: ErrorStateProps;
  pagination?: PaginationProps;
  entityHref?: (entityType: string, entityId: string) => string | null;
  className?: string;
  /** Optional actions in the header (e.g., Export, View All) */
  headerActions?: React.ReactNode;
}

/**
 * AuditTable — shared chronological activity table.
 *
 * Used on: Work Order Detail, User Detail, Downtime Detail, Audit Log page.
 *
 * Per COMPONENTS.md:
 * - Chronological event table with Timestamp + Action/Event + Details/Notes
 * - Action/Event may use StatusBadge for status changes
 * - Optional Export/View All actions in header
 * - Follows DataTable styling: horizontal hairlines, no vertical rules
 * - Responsive horizontal scroll where needed
 */
export function AuditTable({
  entries,
  isLoading = false,
  error = null,
  onRetry,
  emptyState,
  loadingState,
  errorState,
  pagination,
  entityHref,
  className,
  headerActions,
}: AuditTableProps) {
  if (isLoading) {
    return <LoadingState {...loadingState} />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} {...errorState} />;
  }

  if (entries.length === 0) {
    return <EmptyState {...emptyState} icon={emptyState?.icon} title={emptyState?.title ?? 'No activity'} description={emptyState?.description ?? 'No activity recorded'} action={emptyState?.action} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-hidden rounded-xl border border-[var(--io-border)] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--io-border)] px-6 py-4">
          <h2 className="io-h2 text-gray-900">Task Activity Log</h2>
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="io-table-header whitespace-nowrap">When</TableHead>
              <TableHead className="io-table-header">Who</TableHead>
              <TableHead className="io-table-header">Action</TableHead>
              <TableHead className="io-table-header">Entity</TableHead>
              <TableHead className="io-table-header">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="io-table-body whitespace-nowrap text-gray-700">
                  <span className="font-medium text-gray-900">
                    {new Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                    }).format(entry.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="io-table-body whitespace-nowrap">
                  <span className="font-medium text-gray-900">{entry.actor.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {entry.actor.role.toLowerCase().replaceAll('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="io-table-body">
                  <StatusBadge status={entry.action.toLowerCase()} />
                </TableCell>
                <TableCell className="io-table-body">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={entry.entityType.toLowerCase()} />
                    {entityHref?.(entry.entityType, entry.entityId) ? (
                      <Link
                        href={entityHref(entry.entityType, entry.entityId)!}
                        className="text-[var(--io-accent)] hover:underline"
                      >
                        {entry.entityLabel ?? 'View'}
                      </Link>
                    ) : (
                      <span className="text-gray-700">{entry.entityLabel ?? ''}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="io-table-body text-gray-700">
                  <p>{entry.details}</p>
                  <p className="mt-0.5 max-w-md truncate font-mono text-xs text-gray-400" title={entry.entityId}>
                    {entry.entityId}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination && <Pagination {...pagination} />}
      </div>
    </div>
  );
}
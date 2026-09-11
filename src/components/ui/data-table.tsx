import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Pagination, PaginationProps } from '@/components/ui/pagination';
import {
  TableRowAction,
  TableRowActionProps,
} from '@/components/ui/table-row-action';
import { EmptyState, EmptyStateProps } from '@/components/ui/empty-state';
import { LoadingState, LoadingStateProps } from '@/components/ui/loading-state';
import { ErrorState, ErrorStateProps } from '@/components/ui/error-state';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableEmptyStateProps {
  icon?: EmptyStateProps['icon'];
  title: string;
  description: string;
  action?: EmptyStateProps['action'];
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  rowAction?: (item: T) => TableRowActionProps;
  emptyState?: DataTableEmptyStateProps;
  loadingState?: LoadingStateProps;
  errorState?: ErrorStateProps;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  pagination?: PaginationProps;
  className?: string;
  caption?: string;
}

/**
 * DataTable — shared tabular data component.
 *
 * Composes Table, Pagination, TableRowAction, EmptyState, LoadingState, ErrorState.
 * Used on: Equipment List, Maintenance History, Downtime Events, User List.
 *
 * Per COMPONENTS.md: one shared implementation parameterized by columns/data.
 * Row height ~64-80px, horizontal hairlines, no vertical rules.
 * Responsive: horizontal scroll under compression.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  rowAction,
  emptyState,
  loadingState,
  errorState,
  isLoading = false,
  error = null,
  onRetry,
  pagination,
  className,
  caption,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState {...loadingState} />;
  }

  if (error) {
    return (
      <ErrorState message={error.message} onRetry={onRetry} {...errorState} />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        {...emptyState}
        icon={emptyState?.icon}
        title={emptyState?.title ?? 'No data'}
        description={emptyState?.description ?? 'No data available'}
        action={emptyState?.action}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-hidden rounded-xl border border-[var(--io-border)] bg-white">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn('io-table-header', column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
              {rowAction && (
                <TableHead className="text-center io-table-header">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn('io-table-body', column.className)}
                  >
                    {column.render
                      ? column.render(item, index)
                      : ((item as Record<string, unknown>)[
                          column.key
                        ] as React.ReactNode)}
                  </TableCell>
                ))}
                {rowAction && (
                  <TableRowAction
                    href={rowAction(item).href}
                    label={rowAction(item).label}
                    className={rowAction(item).className}
                    hasOverflow={rowAction(item).hasOverflow}
                    overflowContent={rowAction(item).overflowContent}
                  />
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination && <Pagination {...pagination} />}
      </div>
    </div>
  );
}

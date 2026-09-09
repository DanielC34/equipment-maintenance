import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface MiniRecordColumn<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

export interface MiniRecordTableProps<T> {
  columns: MiniRecordColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
  /** Optional caption for accessibility. */
  caption?: string;
  /** Optional action to navigate to the full list. */
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Maximum number of rows to display before showing view all. */
  maxRows?: number;
}

/**
 * MiniRecordTable — domain-specific Dashboard component.
 *
 * Compact embedded table inside a Dashboard card.
 * No filter bar, no pagination — distinct from the page-level DataTable.
 */
export function MiniRecordTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  caption,
  viewAllHref,
  viewAllLabel,
  maxRows = 5,
}: MiniRecordTableProps<T>) {
  const displayData = data.slice(0, maxRows);

  if (displayData.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-[var(--io-border)] bg-white',
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="text-sm text-gray-600">No records to display</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--io-border)] bg-white',
        className
      )}
    >
      <Table className="table-fixed">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((item) => (
            <TableRow key={keyExtractor(item)}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    'io-table-body min-w-0 whitespace-normal wrap-break-word',
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(item)
                    : ((item as Record<string, unknown>)[
                        column.key
                      ] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {viewAllHref && viewAllLabel && (
        <div className="border-t border-gray-100 px-4 py-3">
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-[var(--io-accent)] hover:underline"
          >
            {viewAllLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

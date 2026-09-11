import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  start: number;
  end: number;
  total: number;
  page: number;
  totalPages: number;
  pageHref: (target: number) => string;
}

function PageButton({
  pageNumber,
  currentPage,
  pageHref,
  isEllipsis = false,
}: {
  pageNumber?: number;
  currentPage: number;
  pageHref: (target: number) => string;
  isEllipsis?: boolean;
}) {
  if (isEllipsis) {
    return (
      <span className="px-2 text-xs text-gray-500" aria-hidden>
        …
      </span>
    );
  }

  if (!pageNumber) return null;

  const isCurrent = pageNumber === currentPage;

  return (
    <Link
      href={pageHref(pageNumber)}
      className={cn(
        buttonVariants({ variant: isCurrent ? 'primary' : 'secondary', size: 'sm' }),
        'min-w-[36px]',
      )}
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={isCurrent ? `Page ${pageNumber}, current` : `Go to page ${pageNumber}`}
    >
      {pageNumber}
    </Link>
  );
}

/**
 * Pagination — shared pagination component.
 *
 * Canonical design per DESIGN_SYSTEM §10 and COMPONENTS.md:
 * - numbered page buttons (current filled, others outline)
 * - prev/next chevrons
 * - "Showing X–Y of Z" caption
 * - caption-only when there is only one page
 * - ellipsis when page count is large
 */
export function Pagination({
  start,
  end,
  total,
  page,
  totalPages,
  pageHref,
}: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="flex flex-col gap-3 border-t border-[var(--io-border)] bg-[var(--io-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">Showing {start}–{end} of {total}</p>
      </div>
    );
  }

  // Generate page numbers with ellipsis
  const pageNumbers: (number | 'ellipsis')[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('ellipsis');

    const startPage = Math.max(2, page - 1);
    const endPage = Math.min(totalPages - 1, page + 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (page < totalPages - 2) pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--io-border)] bg-[var(--io-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">Showing {start}–{end} of {total}</p>
      <div className="flex items-center gap-1.5">
        {/* Previous chevron */}
        {page > 1 ? (
          <Link
            href={pageHref(page - 1)}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'p-1.5')}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <span
            aria-disabled
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'pointer-events-none opacity-50 p-1.5'
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </span>
        )}

        {/* Page numbers */}
        <div className="flex items-center gap-0.5">
          {pageNumbers.map((item, index) =>
            typeof item === 'number' ? (
              <PageButton
                key={item}
                pageNumber={item}
                currentPage={page}
                pageHref={pageHref}
              />
            ) : (
              <PageButton key={`ellipsis-${index}`} isEllipsis currentPage={page} pageHref={pageHref} />
            )
          )}
        </div>

        {/* Next chevron */}
        {page < totalPages ? (
          <Link
            href={pageHref(page + 1)}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'p-1.5')}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span
            aria-disabled
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'pointer-events-none opacity-50 p-1.5'
            )}
          >
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}
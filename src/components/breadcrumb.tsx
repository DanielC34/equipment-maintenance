import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BreadcrumbProps {
  /** Array of breadcrumb items. The last item is the current page (non-clickable). */
  items: Array<{
    label: string;
    href?: string; // If undefined, renders as current page (non-link)
  }>;
  className?: string;
}

/**
 * Breadcrumb — hierarchical wayfinding (DESIGN_SYSTEM §13).
 *
 * Example: `Maintenance > Work Orders > WO-8842-A`
 * - Ancestor items are links
 * - Current page is the final item (non-clickable, stronger weight)
 * - Restrained typography, consistent spacing
 * - No decorative treatment
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden className="text-muted-foreground">/</span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-[var(--io-accent)] hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-900" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TableRowActionProps {
  /** The URL to navigate to when the row action is triggered. */
  href: string;
  /** Optional custom label for the action. Defaults to "View". */
  label?: string;
  /** Optional custom className for the action link. */
  className?: string;
  /** Whether this row has additional secondary actions (overflow menu). */
  hasOverflow?: boolean;
  /** Optional overflow menu content (rendered when hasOverflow is true). */
  overflowContent?: React.ReactNode;
}

/**
 * TableRowAction — shared row action component.
 *
 * Renders a consistent "open record" action for every DataTable row.
 * Uses a text link ("View") styled with the InduOps accent color.
 * Optionally supports an overflow menu for rows with multiple secondary actions.
 *
 * Per COMPONENTS.md: one shared open-record interaction used everywhere.
 * Overflow menu is separate and only used when genuinely needed.
 */
export function TableRowAction({
  href,
  label = 'View',
  className,
  hasOverflow = false,
  overflowContent,
}: TableRowActionProps) {
  return (
    <td className={cn('text-center', className)}>
      <div className="flex items-center justify-center gap-2">
        <Link
          href={href}
          className="text-sm font-medium text-[var(--io-accent)] hover:underline transition-colors"
        >
          {label}
        </Link>
        {hasOverflow && (
          <div className="relative">
            <button
              type="button"
              aria-label="More actions"
              aria-expanded="false"
              aria-haspopup="menu"
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--io-accent)]"
            >
              <svg
                aria-hidden
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {overflowContent && (
              <div className="absolute right-0 top-full mt-1 z-10">
                {overflowContent}
              </div>
            )}
          </div>
        )}
      </div>
    </td>
  );
}
import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Status-value colors drawn from the locked §4.2 semantic table.
 * Keys are matched case-insensitively against the selected option's value.
 * Only statuses that have a semantic color are listed — anything else
 * falls back to the default foreground colour.
 */
const STATUS_TEXT_COLORS: Record<string, string> = {
  // Equipment
  operational: 'text-[var(--io-status-operational-text)]',
  under_maintenance: 'text-[var(--io-status-maintenance-text)]',
  offline: 'text-[var(--io-status-offline-text)]',
  // Downtime
  open: 'text-[var(--io-status-offline-text)]',
  resolved: 'text-[var(--io-status-operational-text)]',
  // Maintenance / Work Order
  in_progress: 'text-[var(--io-status-maintenance-text)]',
  completed: 'text-[var(--io-status-operational-text)]',
  scheduled: 'text-[var(--io-status-inactive-text)]',
  cancelled: 'text-[var(--io-status-inactive-text)]',
  // User
  active: 'text-[var(--io-status-operational-text)]',
  inactive: 'text-[var(--io-status-inactive-text)]',
};

/**
 * Returns a Tailwind text-color class for `value` if it maps to a
 * semantic status color, otherwise returns an empty string.
 */
function resolveStatusTextColor(value: string | undefined): string {
  if (!value) return '';
  return STATUS_TEXT_COLORS[value.toLowerCase()] ?? '';
}

interface SelectProps extends React.ComponentProps<'select'> {
  /**
   * When true the currently-selected value text is rendered in its semantic
   * status color (§4.2). Use on Status filter selects.
   */
  statusColored?: boolean;
}

/**
 * InduOps Select primitive.
 *
 * - Height: 40px (h-10), radius: 7px, border: --input (#CBD5E1)
 * - Trailing chevron icon at 16px
 * - When `statusColored` is set, the selected value renders in its semantic
 *   status color from the §4.2 lookup table.
 * - Focus/error/disabled follow the existing app form-control system.
 */
function Select({
  className,
  statusColored,
  value,
  defaultValue,
  ...props
}: SelectProps) {
  // Determine the currently selected value for colour resolution.
  // We accept both controlled (`value`) and uncontrolled (`defaultValue`).
  const resolvedValue =
    typeof value === 'string'
      ? value
      : typeof defaultValue === 'string'
        ? defaultValue
        : undefined;

  const statusClass = statusColored
    ? resolveStatusTextColor(resolvedValue)
    : '';

  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        value={value}
        defaultValue={defaultValue}
        className={cn(
          // geometry
          'h-10 w-full appearance-none rounded-[7px] border border-input bg-background px-3 py-2 pr-9',
          // typography
          'text-sm',
          // interactions
          'transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          // dark
          'dark:bg-input/30 dark:[color-scheme:dark]',
          'dark:[&>option]:bg-popover dark:[&>option]:text-popover-foreground',
          'dark:[&>option:hover]:bg-accent dark:[&>option:checked]:bg-accent',
          'dark:[&>option:hover]:text-accent-foreground dark:[&>option:checked]:text-accent-foreground',
          // placeholder / empty state gets muted colour
          'text-foreground',
          // status colour override
          statusClass,
          className
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select, resolveStatusTextColor };

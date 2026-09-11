import { cn } from '@/lib/utils';

/**
 * Priority → dot colour mapping (DESIGN_SYSTEM §4.3).
 * Uses CSS custom properties from the design system tokens so dark mode works automatically.
 */
const PRIORITY_DOT_CLASS: Record<string, string> = {
  critical: 'bg-[var(--io-status-offline-text)]',           // Red
  high: 'bg-[var(--io-priority-high)]',                     // Red/Orange
  medium: 'bg-[var(--io-status-maintenance-text)]',         // Amber
  routine: 'bg-[var(--io-status-maintenance-text)]',        // Amber (alias)
  low: 'bg-[var(--io-status-operational-text)]',            // Green
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  routine: 'Routine',
  low: 'Low',
};

interface PriorityIndicatorProps {
  /** Raw priority string from the data model (e.g. "CRITICAL", "HIGH"). */
  priority: string;
  className?: string;
}

/**
 * PriorityIndicator — colored dot + plain text label (DESIGN_SYSTEM §9.3).
 *
 * Deliberately NOT a filled pill — that shape is reserved for StatusBadge.
 * Using dot+text keeps urgency visually distinct from lifecycle state.
 *
 * Used on: Work Order Detail, Maintenance History, Maintenance list.
 * Do NOT build a second pill-shaped priority treatment on any screen.
 */
export function PriorityIndicator({ priority, className }: PriorityIndicatorProps) {
  const key = priority.toLowerCase();
  const dotClass = PRIORITY_DOT_CLASS[key] ?? 'bg-muted-foreground';
  const label = PRIORITY_LABELS[key] ?? priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-foreground', className)}>
      <span
        aria-hidden
        className={cn('size-2 shrink-0 rounded-full', dotClass)}
      />
      {label}
    </span>
  );
}

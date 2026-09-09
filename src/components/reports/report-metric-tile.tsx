import { cn } from '@/lib/utils';

export interface ReportMetricTileProps {
  /** The label for the metric. */
  label: string;
  /** The primary value to display. */
  value: string | number;
  /** Optional qualifier text (e.g., "% operational"). */
  qualifier?: string;
  /** Optional flag variant for attention-worthy values. */
  flagged?: boolean;
}

/**
 * ReportMetricTile — domain-specific Reports component.
 *
 * Bordered stat box inside a Reports summary card.
 * Supports a flagged (colored-border) variant for values needing attention.
 * Restrained visual treatment — no giant numbers, no decorative illustrations.
 */
export function ReportMetricTile({
  label,
  value,
  qualifier,
  flagged = false,
}: ReportMetricTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4',
        flagged ? 'border-destructive' : 'border-[var(--io-border)]',
        'space-y-1',
      )}
    >
      <dt className="io-label text-gray-500">{label}</dt>
      <dd className={cn('text-lg font-semibold tabular-nums text-gray-900', 'io-kpi-number')}>
        {value}
        {qualifier && <span className="text-sm font-normal text-gray-500">{qualifier}</span>}
      </dd>
    </div>
  );
}
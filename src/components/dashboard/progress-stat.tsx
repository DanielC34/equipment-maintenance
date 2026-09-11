import { cn } from '@/lib/utils';

export interface ProgressStatProps {
  /** The status label. */
  label: string;
  /** The count/value. */
  count: number;
  /** Optional total for percentage calculation. */
  total?: number;
  /** Optional status badge for the item. */
  status?: string;
  className?: string;
}

/**
 * ProgressStat — domain-specific Dashboard component.
 *
 * Label/count over a horizontal progress bar.
 * Used in Maintenance Status section.
 */
export function ProgressStat({
  label,
  count,
  total,
  status,
  className,
}: ProgressStatProps) {
  const pct = total && total > 0 ? Math.round((count / total) * 100) : 0;
  const statusColor = status
    ? status === 'IN_PROGRESS'
      ? 'bg-warning-foreground'
      : status === 'COMPLETED'
        ? 'bg-success-foreground'
        : status === 'SCHEDULED'
          ? 'bg-[var(--io-accent)]'
          : status === 'CANCELLED'
            ? 'bg-gray-400'
            : 'bg-gray-400'
    : 'bg-gray-400';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium tabular-nums text-gray-900">
          {count} {total ? `(${pct}%)` : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full', statusColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

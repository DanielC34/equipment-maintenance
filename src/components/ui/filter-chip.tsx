import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  /** Label text shown before the colon (e.g. "Status"). */
  label: string;
  /** Currently active value shown after the colon (e.g. "Operational"). */
  value: string;
  /** Called when the user clicks the × dismiss button. */
  onRemove: () => void;
  className?: string;
}

/**
 * FilterChip — removable active-filter indicator (DESIGN_SYSTEM §14).
 *
 * Structure: "Label: Value ×"
 * Visual: compact neutral rounded-rectangle with a dismiss icon.
 * Used beneath the FilterBar when one or more filters are active.
 */
export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[5px]',
        'bg-[var(--io-status-inactive-bg)] text-[var(--io-status-inactive-text)]',
        'px-2.5 py-1 text-xs font-medium',
        className,
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
        className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

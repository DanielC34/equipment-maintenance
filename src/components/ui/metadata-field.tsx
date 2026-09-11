import { cn } from '@/lib/utils';

export interface MetadataFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Whether the value should use KPI styling (larger, bold). */
  isKpi?: boolean;
  /** Optional leading icon for the value. */
  icon?: React.ReactNode;
  /** Optional qualifier text for KPI variant (e.g., "% operational"). */
  qualifier?: string;
  /** Optional semantic color class for the qualifier text. */
  qualifierClassName?: string;
}

/**
 * MetadataField — single label/value pair.
 *
 * Canonical per DESIGN_SYSTEM §2 and COMPONENTS.md:
 * - Label: uppercase, 11-12px, medium, ~0.5px letter-spacing
 * - Value: 16-18px, regular-medium
 * - KPI variant: larger, bold, optional colored qualifier
 * - Optional leading icon per field
 */
export function MetadataField({
  label,
  children,
  className,
  isKpi = false,
  icon,
  qualifier,
  qualifierClassName,
}: MetadataFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="io-label text-gray-500">{label}</dt>
      <dd
        className={cn(
          isKpi ? 'flex items-baseline gap-1.5' : '',
          isKpi ? 'io-kpi-number text-gray-900' : 'io-value text-gray-900'
        )}
      >
        {icon && (
          <span aria-hidden className="text-[var(--io-accent)]">
            {icon}
          </span>
        )}
        <span>{children}</span>
        {qualifier && (
          <span
            className={cn(
              isKpi ? 'io-kpi-qualifier text-gray-500' : 'text-gray-500',
              qualifierClassName
            )}
          >
            {qualifier}
          </span>
        )}
      </dd>
    </div>
  );
}

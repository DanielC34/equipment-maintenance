import { cn } from '@/lib/utils';
import { MetadataField, MetadataFieldProps } from '@/components/ui/metadata-field';

export interface MetadataGridProps {
  fields: MetadataFieldProps[];
  columns?: 2 | 3;
  className?: string;
  /** Whether to apply full-width to the last field (e.g., Description). */
  fullWidthLast?: boolean;
}

/**
 * MetadataGrid — label/value grid for detail pages.
 *
 * Used on: Equipment Detail, Downtime Detail, User Detail, Work Order Detail.
 *
 * Per COMPONENTS.md:
 * - 2-3 column grid with consistent spacing
 * - Responsive stacking
 * - Consistent row gaps regardless of entity
 * - Optional small leading icon per field
 * - No uneven legacy whitespace
 */
export function MetadataGrid({ fields, columns = 2, className, fullWidthLast = false }: MetadataGridProps) {
  const gridCols = columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <dl className={cn('grid gap-x-6 gap-y-4 p-6', gridCols, className)}>
      {fields.map((field, index) => {
        const isLast = index === fields.length - 1;
        const fieldClassName = cn(
          fullWidthLast && isLast ? 'sm:col-span-2 lg:col-span-3' : '',
          field.className
        );
        return (
          <MetadataField key={field.label} {...field} className={fieldClassName} />
        );
      })}
    </dl>
  );
}
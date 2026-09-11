import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';

export interface EquipmentStatusListItem {
  name: string;
  status: string;
}

export interface EquipmentStatusListProps {
  items: EquipmentStatusListItem[];
  title?: string;
  className?: string;
}

/**
 * EquipmentStatusList — domain-specific Dashboard component.
 *
 * Status dot + name + outline status pill list.
 * The outline pill reuses StatusBadge's color mapping in an outline visual treatment.
 */
export function EquipmentStatusList({
  items,
  title,
  className,
}: EquipmentStatusListProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-[var(--io-border)] bg-white',
        className
      )}
    >
      {title && (
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                aria-hidden
                className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  item.status === 'OPERATIONAL' && 'bg-success-foreground',
                  item.status === 'UNDER_MAINTENANCE' &&
                    'bg-warning-foreground',
                  item.status === 'OFFLINE' && 'bg-destructive-foreground'
                )}
              />
              <span className="truncate text-sm text-gray-900">
                {item.name}
              </span>
            </div>
            <div className="shrink-0">
              <StatusBadge
                status={item.status}
                className="bg-transparent border-[var(--io-border)] text-[var(--io-text-primary)]"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

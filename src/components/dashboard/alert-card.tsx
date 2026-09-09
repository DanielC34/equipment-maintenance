import { cn } from '@/lib/utils';

export interface AlertCardProps {
  /** The alert variant determines the border color. */
  variant: 'critical' | 'warning';
  /** Optional icon to display. */
  icon?: React.ReactNode;
  /** Title of the alert. */
  title: string;
  /** Description or count. */
  description?: React.ReactNode;
  /** Optional action link. */
  action?: {
    href: string;
    label: string;
  };
  className?: string;
}

/**
 * AlertCard — domain-specific Dashboard component.
 *
 * Colored-left-border card for critical/overdue conditions.
 * Per DESIGN_HANDOFF.md: red for open downtime, amber/orange for overdue maintenance.
 */
export function AlertCard({
  variant,
  icon,
  title,
  description,
  action,
  className,
}: AlertCardProps) {
  const borderColor =
    variant === 'critical'
      ? 'border-destructive-foreground bg-destructive/5'
      : 'border-l-warning-foreground bg-warning/5';
  const iconColor =
    variant === 'critical'
      ? 'text-destructive-foreground'
      : 'text-warning-foreground';
  const titleColor =
    variant === 'critical'
      ? 'text-destructive-foreground'
      : 'text-warning-foreground';

  return (
    <section
      className={cn(
        'rounded-lg border border-[var(--io-border)]',
        borderColor,
        'p-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span aria-hidden className={cn('size-5', iconColor)}>
            {icon}
          </span>
        )}
        <h3 className={cn('font-semibold text-gray-900', titleColor)}>
          {title}
        </h3>
      </div>
      {description && (
        <div className="mt-1 text-sm text-gray-600">{description}</div>
      )}
      {action && (
        <div className="mt-3">
          <a
            href={action.href}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {action.label}
          </a>
        </div>
      )}
    </section>
  );
}

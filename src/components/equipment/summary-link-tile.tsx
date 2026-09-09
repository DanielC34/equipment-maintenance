import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface SummaryLinkTileProps {
  /** The icon to display. */
  icon: React.ReactNode;
  /** The count to display. */
  count: number;
  /** The main title/heading. */
  title: string;
  /** The description text. */
  description: string;
  /** The destination URL. */
  href: string;
  /** Border color variant. */
  variant?: 'indigo' | 'amber';
  className?: string;
}

/**
 * SummaryLinkTile — domain-specific Equipment component.
 *
 * Colored-left-border tile linking to related records (maintenance/downtime history) from Equipment Detail.
 */
export function SummaryLinkTile({
  icon,
  count,
  title,
  description,
  href,
  variant = 'indigo',
  className,
}: SummaryLinkTileProps) {
  const borderColor = variant === 'indigo' ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50';

  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border transition-colors p-6',
        borderColor,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', variant === 'indigo' ? 'text-indigo-700' : 'text-amber-700')}>
          {icon}
          {title}
        </span>
        <span className={cn('text-sm font-semibold', variant === 'indigo' ? 'text-indigo-700' : 'text-amber-700')}>
          {count}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-gray-900">
        {variant === 'indigo' ? 'View completed work' : 'View downtime history'}
      </h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </Link>
  );
}
import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Badge — shared visual primitive.
 *
 * Geometry (§5, §9.1): rounded rectangle (4–6px radius via --io-radius-badge = 5px),
 * ~4px vertical / 10–12px horizontal padding, 12–13px medium text, no border.
 *
 * Colour is supplied either via a named `variant` or, for custom color pairs,
 * via the `style` prop. Domain-specific wrappers (StatusBadge, etc.) should
 * NOT hardcode colours directly — they must drive them through this primitive.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-[5px] px-3 py-1 text-xs font-semibold',
  {
    variants: {
      variant: {
        neutral: 'bg-[var(--io-status-inactive-bg)] text-[var(--io-status-inactive-text)]',
        success: 'bg-[var(--io-status-operational-bg)] text-[var(--io-status-operational-text)]',
        warning: 'bg-[var(--io-status-maintenance-bg)] text-[var(--io-status-maintenance-text)]',
        danger: 'bg-[var(--io-status-offline-bg)] text-[var(--io-status-offline-text)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

function Badge({
  className,
  variant = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export { Badge, badgeVariants, type BadgeVariant };

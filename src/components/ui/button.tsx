import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Primary — filled dark slate. Primary CTA on each screen. */
        primary:
          'bg-[var(--io-btn-primary-bg)] text-[var(--io-btn-primary-text)] border-transparent hover:bg-[var(--io-btn-primary-bg)]/90 focus-visible:border-[var(--io-btn-primary-bg)]',
        /** Secondary — outline. Secondary actions. */
        secondary:
          'border border-[var(--io-btn-secondary-border)] bg-[var(--io-btn-secondary-bg)] text-[var(--io-btn-secondary-text)] hover:bg-[var(--io-bg)] focus-visible:border-[var(--io-accent)]',
        /** Tertiary — link-style with brand-blue text. No border, no background. */
        tertiary:
          'bg-transparent text-[var(--io-accent)] underline-offset-4 hover:underline focus-visible:border-[var(--io-accent)]',
        /** Icon-only — no label, square. */
        icon: 'bg-[var(--io-btn-primary-bg)] text-[var(--io-btn-primary-text)] border-transparent hover:bg-[var(--io-btn-primary-bg)]/90',
        /** @deprecated Use "secondary" instead */
        outline:
          'border border-[var(--io-btn-secondary-border)] bg-[var(--io-btn-secondary-bg)] text-[var(--io-btn-secondary-text)] hover:bg-[var(--io-bg)] focus-visible:border-[var(--io-accent)]',
        /** @deprecated Use "tertiary" instead */
        ghost:
          'bg-transparent text-[var(--io-accent)] underline-offset-4 hover:underline focus-visible:border-[var(--io-accent)]',
        /** @deprecated Use "primary" with destructive styling via className */
        destructive:
          'bg-destructive/15 text-destructive-foreground hover:bg-destructive/25 focus-visible:border-destructive-foreground/40 focus-visible:ring-destructive-foreground/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive-foreground/40',
      },
      size: {
        /** 40px — standard InduOps button height, 7px radius, 16-20px horizontal padding */
        default: 'h-10 gap-2 rounded-[7px] px-4 text-sm font-medium',
        /** 44px — slightly taller for prominent CTAs */
        lg: 'h-11 gap-2 rounded-[7px] px-5 text-sm font-medium',
        /** 36-40px square icon-only */
        icon: "size-10 rounded-[7px] [&_svg:not([class*='size-'])]:size-5",
        /** @deprecated Use "default" or "lg" instead */
        sm: 'h-9 gap-2 rounded-[7px] px-3 text-sm font-medium',
        /** @deprecated Use "icon" instead */
        xs: 'h-8 gap-1.5 rounded-[7px] px-2.5 text-xs font-medium',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'primary',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

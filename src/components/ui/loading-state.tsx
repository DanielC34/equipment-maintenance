import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface LoadingStateProps {
  /** Optional custom message. */
  message?: string;
  /** Optional custom icon component. */
  Icon?: LucideIcon;
  /** Custom className. */
  className?: string;
}

/**
 * LoadingState — standard in-progress presentation.
 *
 * Per COMPONENTS.md:
 * - Communicates "loading" using the app's existing loading pattern
 * - Avoids blank/broken layouts
 * - Consumes shared tokens
 * - Works in light and dark mode
 * - No decorative spinners or excessive animation
 */
export function LoadingState({ message = 'Loading...', Icon, className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      {Icon ? (
        <Icon aria-hidden className="size-8 animate-spin text-[var(--io-accent)]" />
      ) : (
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--io-accent)]" />
      )}
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
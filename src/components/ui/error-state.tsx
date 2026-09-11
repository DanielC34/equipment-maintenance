import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

export interface ErrorStateProps {
  /** Error message to display. */
  message?: string;
  /** Optional custom retry handler. */
  onRetry?: () => void;
  /** Custom className. */
  className?: string;
  /** Whether this is a full-page error or inline. */
  fullPage?: boolean;
}

/**
 * ErrorState — standard error presentation.
 *
 * Per COMPONENTS.md:
 * - Communicates error using existing error-handling pattern
 * - Preserves existing messages
 * - No invented recovery actions
 * - No decorative error graphics
 * - Uses semantic/destructive tokens
 * - Works in light and dark mode
 * - Accessible
 */
export function ErrorState({ message = 'Something went wrong', onRetry, className, fullPage = false }: ErrorStateProps) {
  const baseClasses = 'flex flex-col items-center justify-center gap-4 text-center';
  const pageClasses = 'py-24';
  const inlineClasses = 'p-6 rounded-xl border border-[var(--io-destructive-bg)] bg-[var(--io-destructive-bg)]/50';

  return (
    <div className={cn(baseClasses, fullPage ? pageClasses : inlineClasses, className)}>
      <RotateCcw className="size-8 text-[var(--io-destructive-text)]" aria-hidden />
      <p className="text-base font-medium text-gray-900">Something went wrong</p>
      <p className="max-w-md text-sm text-gray-600">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          <RotateCcw className="size-4 mr-1.5" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
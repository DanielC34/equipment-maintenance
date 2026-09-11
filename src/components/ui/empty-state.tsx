import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    href: string;
    label: string;
    variant?: 'outline' | 'ghost';
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-[var(--io-border)] bg-white px-6 py-12 text-center">
      {Icon && <Icon aria-hidden className="size-8 text-gray-400" />}
      <h2 className="io-h2 text-gray-900">{title}</h2>
      <p className="max-w-md io-body text-gray-600">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: action.variant ?? 'outline', size: 'sm' }))}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
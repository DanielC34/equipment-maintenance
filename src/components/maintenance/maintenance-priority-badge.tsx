import type { Priority } from '@prisma/client';
import { cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  HIGH: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CRITICAL: 'bg-red-50 text-red-700 ring-red-600/20',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function MaintenancePriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        PRIORITY_STYLES[priority]
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
import type { DowntimeStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<DowntimeStatus, string> = {
  OPEN: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

const STATUS_LABELS: Record<DowntimeStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

export function DowntimeStatusBadge({
  status,
}: {
  status: DowntimeStatus;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
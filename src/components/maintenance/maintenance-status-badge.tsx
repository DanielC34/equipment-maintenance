import type { MaintenanceStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus;
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
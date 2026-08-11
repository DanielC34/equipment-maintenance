import type { EquipmentStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  OFFLINE: 'bg-red-50 text-red-700 ring-red-600/20',
};

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under maintenance',
  OFFLINE: 'Offline',
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
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

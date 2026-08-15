import type { DowntimeReason } from '@prisma/client';
import { cn } from '@/lib/utils';

const REASON_LABELS: Record<DowntimeReason, string> = {
  MECHANICAL: 'Mechanical',
  ELECTRICAL: 'Electrical',
  HYDRAULIC: 'Hydraulic',
  PNEUMATIC: 'Pneumatic',
  MATERIAL: 'Material',
  OPERATOR_ERROR: 'Operator error',
  QUALITY: 'Quality',
  CHANGEOVER: 'Changeover',
};

const REASON_STYLES: Record<DowntimeReason, string> = {
  MECHANICAL: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  ELECTRICAL: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  HYDRAULIC: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  PNEUMATIC: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  MATERIAL: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  OPERATOR_ERROR: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  QUALITY: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  CHANGEOVER: 'bg-teal-50 text-teal-700 ring-teal-600/20',
};

export function DowntimeReasonBadge({
  reason,
}: {
  reason: DowntimeReason;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        REASON_STYLES[reason]
      )}
    >
      {REASON_LABELS[reason]}
    </span>
  );
}
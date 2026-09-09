import type { DowntimeReason } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

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

export function DowntimeReasonBadge({
  reason,
}: {
  reason: DowntimeReason;
}) {
  return <Badge variant="neutral">{REASON_LABELS[reason]}</Badge>;
}
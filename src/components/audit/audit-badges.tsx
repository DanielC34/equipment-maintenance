import type { AuditAction, AuditEntityType } from '@prisma/client';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

const ACTION_VARIANT: Record<AuditAction, BadgeVariant> = {
  CREATE: 'neutral',
  UPDATE: 'neutral',
  START: 'warning',
  COMPLETE: 'success',
  RESOLVE: 'success',
  DELETE: 'danger',
};

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  START: 'Started',
  COMPLETE: 'Completed',
  RESOLVE: 'Resolved',
  DELETE: 'Deleted',
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  EQUIPMENT: 'Equipment',
  MAINTENANCE_TASK: 'Maintenance task',
  MAINTENANCE_RECORD: 'Maintenance record',
  DOWNTIME_EVENT: 'Downtime event',
  USER: 'User',
};

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return (
    <Badge variant={ACTION_VARIANT[action]}>{ACTION_LABELS[action]}</Badge>
  );
}

export function AuditEntityBadge({
  entityType,
}: {
  entityType: AuditEntityType;
}) {
  return <Badge variant="neutral">{ENTITY_LABELS[entityType]}</Badge>;
}
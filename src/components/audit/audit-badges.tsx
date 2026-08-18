import type { AuditAction, AuditEntityType } from '@prisma/client';
import { cn } from '@/lib/utils';

const ACTION_STYLES: Record<AuditAction, string> = {
  CREATE: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  UPDATE: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  START: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  COMPLETE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  RESOLVE: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  DELETE: 'bg-red-50 text-red-700 ring-red-600/20',
};

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  START: 'Started',
  COMPLETE: 'Completed',
  RESOLVE: 'Resolved',
  DELETE: 'Deleted',
};

const ENTITY_STYLES: Record<AuditEntityType, string> = {
  EQUIPMENT: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  MAINTENANCE_TASK: 'bg-indigo-50 text-indigo-700 ring-indigo-500/20',
  MAINTENANCE_RECORD: 'bg-blue-50 text-blue-700 ring-blue-500/20',
  DOWNTIME_EVENT: 'bg-rose-50 text-rose-700 ring-rose-500/20',
  USER: 'bg-purple-50 text-purple-700 ring-purple-500/20',
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
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        ACTION_STYLES[action]
      )}
    >
      {ACTION_LABELS[action]}
    </span>
  );
}

export function AuditEntityBadge({
  entityType,
}: {
  entityType: AuditEntityType;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        ENTITY_STYLES[entityType]
      )}
    >
      {ENTITY_LABELS[entityType]}
    </span>
  );
}
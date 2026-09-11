import { Badge, type BadgeVariant } from '@/components/ui/badge';

/**
 * Canonical status → Badge variant mapping (DESIGN_SYSTEM §4.2).
 *
 * This is the single lookup table for the entire application.
 * Every domain's status string is normalised to lowercase before lookup.
 * Adding a new status means adding ONE row here — nowhere else.
 */
const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  // Equipment
  operational: 'success',
  under_maintenance: 'warning',
  offline: 'danger',

  // Downtime
  open: 'danger',
  resolved: 'success',

  // Maintenance / Work Order
  scheduled: 'neutral',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'neutral',

  // User account
  active: 'success',
  inactive: 'neutral',
};

/**
 * Human-readable labels for known status values.
 * When a value isn't in this map the raw string is rendered (title-cased).
 */
const STATUS_LABELS: Record<string, string> = {
  operational: 'Operational',
  under_maintenance: 'Under maintenance',
  offline: 'Offline',
  open: 'Open',
  resolved: 'Resolved',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
};

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  /** The raw status string from the data model (e.g. "OPERATIONAL", "IN_PROGRESS"). */
  status: string;
  className?: string;
}

/**
 * StatusBadge — semantic wrapper over Badge.
 *
 * Takes any status string, normalises it, resolves the fixed §4.2 color pair,
 * and renders via the Badge primitive. Screens must NOT override the color
 * per-screen; change §4.2 / STATUS_VARIANT_MAP if a color needs to change.
 *
 * One implementation, used on: Equipment, Downtime, Maintenance, User screens.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const variant = STATUS_VARIANT_MAP[key] ?? 'neutral';
  const label = STATUS_LABELS[key] ?? toTitleCase(status);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

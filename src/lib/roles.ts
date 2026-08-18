import type { Role } from '@prisma/client';

export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRATOR: 'Administrator',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Technician',
  OPERATOR: 'Operator',
  PLANT_MANAGER: 'Plant Manager',
  RELIABILITY_ENGINEER: 'Reliability Engineer',
};
import type { Role } from '@prisma/client'

export const PERMISSIONS = {
  appView: 'app:view',
  equipmentView: 'equipment:view',
  equipmentCreate: 'equipment:create',
  equipmentEdit: 'equipment:edit',
  maintenanceView: 'maintenance:view',
  maintenanceSchedule: 'maintenance:schedule',
  maintenanceComplete: 'maintenance:complete',
  downtimeRecord: 'downtime:record',
  downtimeResolve: 'downtime:resolve',
  reportsView: 'reports:view',
  usersManage: 'users:manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const APP_BASE: readonly Permission[] = [
  PERMISSIONS.appView,
  PERMISSIONS.equipmentView,
]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMINISTRATOR: [
    ...APP_BASE,
    PERMISSIONS.equipmentCreate,
    PERMISSIONS.equipmentEdit,
    PERMISSIONS.maintenanceView,
    PERMISSIONS.maintenanceSchedule,
    PERMISSIONS.maintenanceComplete,
    PERMISSIONS.downtimeRecord,
    PERMISSIONS.downtimeResolve,
    PERMISSIONS.reportsView,
    PERMISSIONS.usersManage,
  ],
  SUPERVISOR: [
    ...APP_BASE,
    PERMISSIONS.equipmentCreate,
    PERMISSIONS.equipmentEdit,
    PERMISSIONS.maintenanceView,
    PERMISSIONS.maintenanceSchedule,
    PERMISSIONS.maintenanceComplete,
    PERMISSIONS.reportsView,
  ],
  TECHNICIAN: [
    ...APP_BASE,
    PERMISSIONS.maintenanceView,
    PERMISSIONS.maintenanceComplete,
    PERMISSIONS.downtimeResolve,
  ],
  OPERATOR: [...APP_BASE, PERMISSIONS.downtimeRecord],
  PLANT_MANAGER: [...APP_BASE, PERMISSIONS.reportsView],
  RELIABILITY_ENGINEER: [...APP_BASE, PERMISSIONS.reportsView],
}

export function roleHasPermission(
  role: Role,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
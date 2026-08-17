import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarClock,
  History,
  LayoutDashboard,
  Settings,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/lib/permissions';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
}

export interface NavSection {
  title: string;
  items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        description: 'Key metrics at a glance',
        icon: LayoutDashboard,
        permission: PERMISSIONS.appView,
      },
    ],
  },
  {
    title: 'Plant Operations',
    items: [
      {
        href: '/equipment',
        label: 'Equipment',
        description: 'The asset registry',
        icon: Wrench,
        permission: PERMISSIONS.equipmentView,
      },
      {
        href: '/maintenance',
        label: 'Maintenance',
        description: 'Scheduled and completed work',
        icon: CalendarClock,
        permission: PERMISSIONS.maintenanceView,
      },
      {
        href: '/downtime',
        label: 'Downtime',
        description: 'Production loss events',
        icon: TriangleAlert,
        permission: PERMISSIONS.appView,
      },
      {
        href: '/reports',
        label: 'Reports',
        description: 'Summaries and exports',
        icon: BarChart3,
        permission: PERMISSIONS.reportsView,
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        href: '/audit',
        label: 'Audit Log',
        description: 'Recorded user activity',
        icon: History,
        permission: PERMISSIONS.auditView,
      },
      {
        href: '/admin',
        label: 'Administration',
        description: 'Users and system configuration',
        icon: Settings,
        permission: PERMISSIONS.usersManage,
      },
    ],
  },
];

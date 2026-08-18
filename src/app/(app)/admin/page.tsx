import { redirect } from 'next/navigation';
import { PERMISSIONS, requirePermission } from '@/server/rbac';

export default async function AdminPage() {
  await requirePermission(PERMISSIONS.usersManage);
  redirect('/admin/users');
}
import type { ReactNode } from 'react';
import { requireAuth } from '@/server/rbac';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();
  return <AppShell session={session}>{children}</AppShell>;
}

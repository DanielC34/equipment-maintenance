import type { ReactNode } from 'react';
import type { Session } from 'next-auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { PageContainer } from '@/components/page-container';

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader session={session} />
        <PageContainer>
          {children}
        </PageContainer>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import type { Session } from 'next-auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader session={session} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

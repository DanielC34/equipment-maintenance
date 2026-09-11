import type { Session } from 'next-auth';
import { AppNav } from '@/components/app-nav';
import { Brand } from '@/components/brand';

export function AppSidebar({ session }: { session: Session }) {
  return (
    <aside className="hidden shrink-0 border-r border-[var(--io-border)] bg-white lg:flex lg:w-72 lg:flex-col">
      <div className="flex h-20 shrink-0 items-center border-b border-[var(--io-border)] px-6">
        <Brand />
      </div>
      <AppNav session={session} />
    </aside>
  );
}

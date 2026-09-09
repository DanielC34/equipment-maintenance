import type { Session } from 'next-auth';
import { SignOutButton } from '@/components/sign-out-button';
import { MobileNav } from '@/components/mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Brand } from '@/components/brand';

export function AppHeader({ session }: { session: Session }) {
  const { user } = session;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--io-border)] bg-white">
      <div className="flex h-20 items-center gap-3 px-4 md:px-6">
        <MobileNav session={session} />
        <div className="hidden items-center lg:flex">
          <span className="font-semibold text-gray-900">InduOps v4.2</span>
        </div>
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="flex-1" />
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <div className="hidden min-w-0 text-right sm:block border-l border-[var(--io-border)] pl-3">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.name}
            </p>
            <p className="truncate text-xs tracking-wide text-gray-500 uppercase">
              {user.role.replace(/_/g, ' ')}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

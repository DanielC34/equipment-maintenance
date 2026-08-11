import Link from 'next/link';
import type { Session } from 'next-auth';
import { SignOutButton } from '@/components/sign-out-button';
import { MobileNav } from '@/components/mobile-nav';

export function AppHeader({ session }: { session: Session }) {
  const { user } = session;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <MobileNav session={session} />
        <Link
          href="/dashboard"
          className="font-bold tracking-tight text-indigo-600 lg:hidden"
        >
          EMMS
        </Link>
        <div className="flex-1" />
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-medium text-gray-900">
            {user.name}
          </p>
          <p className="truncate text-xs tracking-wide text-gray-500 uppercase">
            {user.role.replace(/_/g, ' ')}
          </p>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}

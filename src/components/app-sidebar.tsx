import Link from 'next/link';
import type { Session } from 'next-auth';
import { AppNav } from '@/components/app-nav';

export function AppSidebar({ session }: { session: Session }) {
  return (
    <aside className="hidden shrink-0 border-r border-gray-200 bg-white lg:flex lg:w-64 lg:flex-col">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Link
          href="/dashboard"
          className="text-base font-bold tracking-tight text-indigo-600"
        >
          EMMS
        </Link>
      </div>
      <AppNav session={session} />
    </aside>
  );
}

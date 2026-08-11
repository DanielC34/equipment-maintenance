'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import { NAV_SECTIONS, type NavItem } from '@/lib/navigation';
import { roleHasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export function AppNav({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { role } = session.user;

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) =>
          roleHasPermission(role, item.permission)
        );
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={section.title}>
            <p className="px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {section.title}
            </p>
            <ul className="mt-2 space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isActive(pathname, item.href)}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={item.description}
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'size-4 shrink-0',
          active ? 'text-indigo-600' : 'text-gray-400'
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

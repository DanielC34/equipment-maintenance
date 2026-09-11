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
  label = 'Primary navigation',
}: {
  session: Session;
  onNavigate?: () => void;
  label?: string;
}) {
  const pathname = usePathname();
  const { role } = session.user;

  return (
    <nav
      aria-label={label}
      className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
    >
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) =>
          roleHasPermission(role, item.permission)
        );
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={section.title}>
            <p className="px-2.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {section.title}
            </p>
            <ul className="mt-2 space-y-0.5">
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
        'flex min-h-[48px] items-center gap-2.5 rounded-lg px-3 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
        active
          ? 'bg-[var(--io-nav-active-bg)] font-semibold text-[var(--io-accent)]'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'size-4 shrink-0',
          active ? 'text-[var(--io-accent)]' : 'text-gray-500'
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

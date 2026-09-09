'use client';

import { useEffect, useState } from 'react';
import type { Session } from 'next-auth';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppNav } from '@/components/app-nav';
import { Brand } from '@/components/brand';

export function MobileNav({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden className="size-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--io-border)] bg-white shadow-lg"
          >
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-[var(--io-border)] pr-2 pl-4">
              <Brand onNavigate={() => setOpen(false)} />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden className="size-5" />
              </Button>
            </div>
            <AppNav
              session={session}
              label="Mobile navigation"
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

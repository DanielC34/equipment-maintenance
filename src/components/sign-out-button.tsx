'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: '/login' })}
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}

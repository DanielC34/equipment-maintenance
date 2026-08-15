'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      }
      title={
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      }
      className="text-gray-500 hover:text-gray-900 dark:text-gray-600 dark:hover:text-gray-900"
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun aria-hidden className="size-5" />
      ) : (
        <Moon aria-hidden className="size-5" />
      )}
    </Button>
  );
}

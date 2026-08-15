'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'emms-theme';
const subscribers = new Set<() => void>();

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function getEffectiveTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerSnapshot(): Theme {
  return 'light';
}

function emitChange() {
  subscribers.forEach((callback) => callback());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const mediaHandler = () => {
    if (readStoredTheme() === null) {
      emitChange();
    }
  };
  media.addEventListener('change', mediaHandler);
  return () => {
    subscribers.delete(callback);
    media.removeEventListener('change', mediaHandler);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable; theme still applies for this session
  }
  emitChange();
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getEffectiveTheme,
    getServerSnapshot
  );

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  return { theme, toggleTheme };
}

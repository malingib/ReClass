import { writable, get } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'reclass.theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'light';
}

export const theme = writable<Theme>(getInitialTheme());

function applyTheme(t: Theme) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch { /* ignore */ }

  let resolved: string;
  if (t === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = t;
  }

  document.documentElement.setAttribute('data-theme', resolved);
}

// Persist to localStorage and apply to <html>
theme.subscribe(applyTheme);

// Listen for system preference changes when in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get(theme) === 'system') {
      const resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', resolved);
    }
  });
}

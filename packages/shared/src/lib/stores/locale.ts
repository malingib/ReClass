import { writable } from 'svelte/store';

// Re-export types for convenience

export type Locale = 'en' | 'sw';

const STORAGE_KEY = 'reclass.locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'sw') return stored;
  } catch { /* ignore */ }
  return 'en';
}

export const locale = writable<Locale>(getInitialLocale());

locale.subscribe(($locale) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, $locale);
  } catch { /* ignore */ }
  document.documentElement.setAttribute('lang', $locale);
});

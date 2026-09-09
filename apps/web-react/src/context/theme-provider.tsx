import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getCookie, setCookie } from '@/lib/utils';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = Exclude<Theme, 'system'>;

const THEME_KEY = 'vite-ui-theme';

type ThemeCtx = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx>({ theme: 'system', resolvedTheme: 'light', setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = 'system' as Theme }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, _setTheme] = useState<Theme>(() => (getCookie(THEME_KEY) as Theme) || defaultTheme);
  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return theme as ResolvedTheme;
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (t: ResolvedTheme) => {
      root.classList.remove('light', 'dark');
      root.classList.add(t);
    };
    apply(resolvedTheme);
    const handler = () => {
      if (theme === 'system') apply(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, resolvedTheme]);

  const setTheme = (t: Theme) => {
    setCookie(THEME_KEY, t, 60 * 60 * 24 * 365);
    _setTheme(t);
  };

  return <Ctx.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be used within ThemeProvider');
  return c;
}

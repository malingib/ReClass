import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { Header } from './app-sidebar';
import { CommandPalette, useCommandPalette } from './command-palette';
import { useEscape } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROUTE_TITLES: [RegExp, string][] = [
  [/^\/login$/, 'Sign in'],
  [/^\/admin$/, 'Dashboard'],
  [/^\/admin\/sis/, 'Student information'],
  [/^\/admin\/students/, 'Students'],
  [/^\/admin\/teachers/, 'Teachers'],
  [/^\/admin\/parents/, 'Parents'],
  [/^\/admin\/subjects/, 'Subjects'],
  [/^\/admin\/admissions/, 'Admissions'],
  [/^\/admin\/attendance/, 'Remedial attendance'],
  [/^\/admin\/committee/, 'Committee'],
  [/^\/admin\/reclass/, 'ReClass'],
  [/^\/admin\/scheduling/, 'Scheduling'],
  [/^\/admin\/calendar/, 'Calendar'],
  [/^\/admin\/operations/, 'Operations'],
  [/^\/admin\/communications/, 'Communications'],
  [/^\/admin\/notifications/, 'Notifications'],
  [/^\/admin\/reports/, 'Reports'],
  [/^\/admin\/fees/, 'Fees'],
  [/^\/admin\/users/, 'Users'],
  [/^\/admin\/settings/, 'Settings'],
  [/^\/admin\/audit/, 'Audit'],
  [/^\/finance$/, 'Finance'],
  [/^\/finance\//, 'Finance'],
  [/^\/reclass/, 'ReClass'],
  [/^\/receipts/, 'Receipts'],
  [/^\/comms/, 'Communications'],
  [/^\/notifications/, 'Notifications'],
  [/^\/parent/, 'Parent portal'],
  [/^\/teacher/, 'Teacher workspace'],
  [/^\/principal/, 'Principal oversight'],
  [/^\/bursar/, 'Bursar'],
  [/^\/payroll/, 'Payroll'],
  [/^\/super-admin/, 'System administration'],
  [/^\/account/, 'Account'],
  [/^\/about/, 'About'],
];

function titleFor(pathname: string): string {
  return ROUTE_TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'eShule';
}

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('reclass:sidebar-collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const palette = useCommandPalette();

  useEffect(() => {
    localStorage.setItem('reclass:sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  // Close the mobile drawer on route change (welfare-connect pattern)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useEscape(closeMobile);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* Mobile overlay */}
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden />}
      {/* Sidebar: drawer on mobile, static collapsible on desktop */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 md:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="h-full [&>aside]:h-full [&>aside]:w-full">
          <AppSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>
      </div>
      <div className="hidden md:sticky md:top-0 md:block md:h-screen [&>aside]:h-full">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onToggleSidebar={() => setMobileOpen(true)} title={titleFor(pathname)} onSearch={() => palette.setOpen(true)} />
        <main id="main-content" tabIndex={-1} className="min-h-screen flex-1 overflow-x-hidden bg-muted/35 outline-none pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="page-transition mx-auto w-full max-w-[1600px] p-3 sm:p-4 md:p-6 lg:p-10">{children}</div>
        </main>
      </div>
      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  );
}

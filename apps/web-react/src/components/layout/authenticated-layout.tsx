import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppSidebar, Header } from './app-sidebar';
import { CommandPalette, useCommandPalette } from './command-palette';
import { Breadcrumbs, useEscape } from '@/components/ui';

// Single spelling for the sidebar-collapsed localStorage key.
const SIDEBAR_COLLAPSED_KEY = 'preskool:sidebar-collapsed';

function prettifySegment(seg: string): string {
  return seg
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function trailForPath(pathname: string): { label: string; to?: string }[] {
  if (pathname === '/' || pathname === '/login') return [];
  const segs = pathname.split('/').filter(Boolean);
  // Skip dynamic ids (uuid-ish / long segments) in labels but keep nav stable.
  const trail: { label: string; to?: string }[] = [{ label: 'Home', to: '/' }];
  let acc = '';
  segs.forEach((seg, i) => {
    acc += `/${seg}`;
    const isId = /^[0-9a-f-]{8,}$/i.test(seg) || /^\d+$/.test(seg) || (seg.startsWith(':'));
    if (isId) {
      trail.push({ label: 'Details' });
    } else {
      trail.push({ label: prettifySegment(seg), to: i === segs.length - 1 ? undefined : acc });
    }
  });
  return trail;
}

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const palette = useCommandPalette();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  // Guard: only close the drawer when it is actually open, so Escape doesn't
  // fire a stale close while another overlay owns the keypress.
  const handleEscape = useCallback(() => {
    if (mobileOpen) closeMobile();
  }, [mobileOpen, closeMobile]);
  useEscape(handleEscape);
  const trail = useMemo(() => trailForPath(pathname), [pathname]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Sidebar - mobile drawer + desktop collapsible */}
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onToggleSidebar={() => setMobileOpen(true)}
          onSearch={() => palette.setOpen(true)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-screen flex-1 overflow-x-hidden bg-muted/30 outline-none"
        >
          <div className="mx-auto w-full max-w-[1280px] p-4 sm:p-5 md:p-6 lg:p-8">
            {trail.length > 0 && (
              <div className="mb-4">
                <Breadcrumbs trail={trail} />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  );
}

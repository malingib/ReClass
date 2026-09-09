import { useState } from 'react';
import { AppSidebar } from './app-sidebar';

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 bg-muted/30">
          <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

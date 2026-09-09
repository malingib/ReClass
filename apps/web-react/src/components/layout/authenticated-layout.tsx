import { AppSidebar } from './app-sidebar';

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar collapsed={false} onToggle={() => undefined} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-screen flex-1 bg-muted/35">
          <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

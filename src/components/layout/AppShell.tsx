import type { ReactNode } from "react";

import { SideNavigation } from "./SideNavigation";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SideNavigation />
      <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
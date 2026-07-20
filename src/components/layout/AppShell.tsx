import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger, SheetTítulo } from "@/components/ui/sheet";

import { SideNavigation } from "./SideNavigation";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {/* Desktop sidebar — fixed at md+ */}
      <div className="hidden md:block">
        <SideNavigation />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — compact, with drawer trigger + read-only marker */}
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-background px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                aria-label="Open navigation"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-4 w-4" aria-hidden />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTítulo className="sr-only">Navigation</SheetTítulo>
                <SideNavigation onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-xs font-semibold text-primary">
                HG
              </span>
              <span className="truncate text-sm font-semibold">Hidden Grain</span>
            </div>
          </div>
          <span className="shrink-0 rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            read-only
          </span>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

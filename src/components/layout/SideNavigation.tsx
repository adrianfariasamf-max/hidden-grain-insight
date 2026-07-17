import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Network, LayoutDashboard, Activity } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: typeof Compass;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, exact: true },
  { label: "Explorer", to: "/explorer", icon: Compass },
  { label: "Knowledge Graph", to: "/graph", icon: Network },
  { label: "System", to: "/system", icon: Activity },
];

interface SideNavigationProps {
  onNavigate?: () => void;
}

export function SideNavigation({ onNavigate }: SideNavigationProps = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
          <span className="font-mono text-sm font-semibold">HG</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Hidden Grain</span>
          <span className="text-[11px] text-muted-foreground">Knowledge OS</span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-3 text-[11px] text-muted-foreground">
        <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono">
          read-only
        </span>
      </div>
    </nav>
  );
}
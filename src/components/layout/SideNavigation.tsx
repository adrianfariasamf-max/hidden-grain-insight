import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  Network,
  LayoutDashboard,
  Activity,
  Sparkles,
  FlaskConical,
  Settings,
  LogIn,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth/session";

type NavItem = {
  label: string;
  to: string;
  icon: typeof Compass;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, exact: true },
  { label: "Experiments", to: "/experiments", icon: FlaskConical },
  { label: "Explorer", to: "/explorer", icon: Compass },
  { label: "Grafo de conocimiento", to: "/graph", icon: Network },
  { label: "Discovery", to: "/discover", icon: Sparkles },
  { label: "System", to: "/system", icon: Activity },
  { label: "Configuración", to: "/settings", icon: Settings },
];

interface SideNavigationProps {
  onNavigate?: () => void;
}

export function SideNavigation({ onNavigate }: SideNavigationProps = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = useSession();

  return (
    <nav
      aria-label="Principal"
      className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
          <span className="font-mono text-sm font-semibold">HG</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Perception Studio</span>
          <span className="text-[11px] text-muted-foreground">by Hidden Grain</span>
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

      <div className="mt-auto border-t border-sidebar-border px-3 py-3 text-[11px] text-muted-foreground">
        {session.status === "authenticated" ? (
          <div className="space-y-2">
            <div className="truncate px-1" title={session.user?.email ?? ""}>
              <span className="text-foreground/80">
                {session.user?.email ?? "Investigador"}
              </span>
              {session.roles.length > 0 && (
                <span className="ml-1 rounded border border-border/60 px-1 py-0.5 font-mono uppercase text-[9px]">
                  {session.roles[0]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                void signOut();
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        ) : session.status === "anonymous" ? (
          <Link
            to="/auth"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            Iniciar sesión
          </Link>
        ) : (
          <span className="px-1 opacity-60">Verificando sesión…</span>
        )}
      </div>
    </nav>
  );
}

import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useSession } from "@/lib/auth/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.status === "anonymous") {
      navigate({ to: "/auth", replace: true });
    }
  }, [session.status, navigate]);

  if (session.status === "loading") {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Verificando sesión…
      </div>
    );
  }
  if (session.status === "anonymous") {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Redirigiendo…
      </div>
    );
  }
  return <Outlet />;
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "../components/layout/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No pudimos cargar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un problema. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Overview — Perception Studio" },
      {
        name: "description",
        content:
        "Perception Studio: diseña, publica y comparte estudios de percepción, y explora el repositorio de conocimiento.",
      },
      { name: "author", content: "Hidden Grain" },
      { property: "og:title", content: "Overview — Perception Studio" },
      {
        property: "og:description",
        content: "Perception Studio: diseña, publica y comparte estudios de percepción, y explora el repositorio de conocimiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Overview — Perception Studio" },
      { name: "twitter:description", content: "Perception Studio: diseña, publica y comparte estudios de percepción, y explora el repositorio de conocimiento." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d179b58-ed90-4423-a442-02b0891346f0/id-preview-aedf3fa5--069e677f-fc9c-46cf-bc23-b7e868660414.lovable.app-1784511928599.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d179b58-ed90-4423-a442-02b0891346f0/id-preview-aedf3fa5--069e677f-fc9c-46cf-bc23-b7e868660414.lovable.app-1784511928599.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const chromeless = useRouterState({
    select: (s) =>
      s.location.pathname.startsWith("/e/") || s.location.pathname === "/auth",
  });

  return (
    <QueryClientProvider client={queryClient}>
      {chromeless ? (
        // Participant surface: no researcher chrome, full-viewport neutral canvas.
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
        </div>
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
    </QueryClientProvider>
  );
}

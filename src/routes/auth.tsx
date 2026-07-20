import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth/session";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Hidden Grain" },
      { name: "description", content: "Acceso privado para investigadores autorizados." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated") {
      navigate({ to: "/experiments", replace: true });
    }
  }, [session.status, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate({ to: "/experiments", replace: true });
      return;
    }
    // forgot
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(
      "Si el correo existe, recibirás un enlace para restablecer la contraseña. Nota: la entrega de correo depende de la infraestructura de email institucional, aún no configurada en el piloto.",
    );
  };

  const title = mode === "signin" ? "Acceso investigador" : "Recuperar contraseña";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Introduce tus credenciales institucionales. El registro público está deshabilitado; el alta de nuevos investigadores se realiza por invitación del OWNER."
            : "Te enviaremos un enlace para restablecer la contraseña."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {mode !== "forgot" && (
          <div>
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          )}
          {error && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Procesando…" : mode === "signin" ? "Iniciar sesión" : "Enviar enlace"}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground">
          {mode === "signin" && (
            <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setNotice(null); }}
                className="text-left text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
            </button>
          )}
          {mode !== "signin" && (
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setNotice(null); }}
              className="text-left text-primary hover:underline"
            >
              ← Volver a iniciar sesión
            </button>
          )}
        </div>
        <div className="mt-6 border-t border-border/60 pt-4">
          <Link to="/" className="text-xs text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { Eye, X } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";

/**
 * Preview mode is signalled with `?preview=1` in the URL. It is a
 * developer-experience tool for the investigator: the participant flow
 * runs identically but no session, response or metric is persisted.
 */
export function usePreviewMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("preview") === "1";
  }, []);
}

export function PreviewBanner({ active }: { active: boolean }) {
  if (!active) return null;
  // Best-effort: recover experimentId from the participant route so the
  // researcher can exit preview back to the experiment panel.
  const params = useParams({ strict: false }) as { experimentId?: string };
  const experimentId = params.experimentId;
  return (
    <div
      role="status"
      aria-label="Modo previsualización"
      className="fixed left-1/2 top-2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/40 bg-background/90 px-3 py-1 text-[11px] font-medium text-primary shadow-sm backdrop-blur"
    >
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3 w-3" aria-hidden />
        MODO PREVIEW · sólo visible para el investigador
      </span>
      {experimentId ? (
        <Link
          to="/experiments/$id"
          params={{ id: experimentId }}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10"
          title="Salir de la vista previa"
        >
          <X className="h-3 w-3" aria-hidden />
          Salir
        </Link>
      ) : null}
    </div>
  );
}
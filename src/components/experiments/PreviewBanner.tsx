import { useMemo } from "react";
import { Eye } from "lucide-react";

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
  return (
    <div
      role="status"
      aria-label="Modo previsualización"
      className="pointer-events-none fixed left-1/2 top-2 z-50 -translate-x-1/2 rounded-full border border-primary/40 bg-background/90 px-3 py-1 text-[11px] font-medium text-primary shadow-sm backdrop-blur"
    >
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3 w-3" aria-hidden />
        MODO PREVIEW · sólo visible para el investigador
      </span>
    </div>
  );
}
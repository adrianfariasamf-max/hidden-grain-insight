import { Lock } from "lucide-react";

interface ReadOnlyNoticeProps {
  variant?: "default" | "compact";
}

/**
 * Product-level architectural notice. This text is a fixed invariant of
 * Hidden Grain, NOT a value returned by /health.
 */
export function ReadOnlyNotice({ variant = "default" }: ReadOnlyNoticeProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p>
          Sólo lectura projection. Canonical Objetos de conocimiento are authored outside this
          interface — no create, edit, delete, approve or publish actions exist by design.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="read-only-heading"
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card px-5 py-5"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <h2 id="read-only-heading" className="text-sm font-semibold text-foreground">
          Sólo lectura interface
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Hidden Grain is a read-only projection of a canonical knowledge repository. The frontend
        never mutates state — it observes.
      </p>
      <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        <li>• Canonical Objetos de conocimiento remain outside the frontend.</li>
        <li>• No direct Markdown or generated JSON access.</li>
        <li>• No create, edit, delete, approve or publish operations.</li>
        <li>• The API is the only frontend data boundary.</li>
      </ul>
    </section>
  );
}

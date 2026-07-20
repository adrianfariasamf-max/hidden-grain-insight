import { cn } from "@/lib/utils";

interface EstadoBadgeProps {
  status: string;
  className?: string;
}

// Tone-mapping is paired with a text label so status is never conveyed by
// color alone.
const TONE: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  stable: "bg-success/15 text-success border-success/30",
  draft: "bg-warning/15 text-warning border-warning/30",
  review: "bg-warning/15 text-warning border-warning/30",
  deprecated: "bg-destructive/15 text-destructive border-destructive/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export function EstadoBadge({ status, className }: EstadoBadgeProps) {
  const tone = TONE[status.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        tone,
        className,
      )}
    >
      {status}
    </span>
  );
}

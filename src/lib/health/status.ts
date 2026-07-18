// Conservative visual classification for the `status` string returned by
// /health. The original text is always kept visible to the user — this only
// maps well-known synonyms to a tone token so unknown statuses degrade to
// neutral rather than being invented.

export type HealthTone = "success" | "warning" | "destructive" | "neutral";

const SUCCESS = new Set(["ok", "healthy", "up", "pass", "passing", "ready"]);
const WARNING = new Set(["degraded", "warn", "warning", "partial"]);
const FAILURE = new Set(["fail", "failed", "failing", "down", "error", "offline", "unhealthy"]);

export function classifyHealth(status: string | undefined | null): HealthTone {
  if (!status) return "neutral";
  const key = status.trim().toLowerCase();
  if (!key) return "neutral";
  if (SUCCESS.has(key)) return "success";
  if (WARNING.has(key)) return "warning";
  if (FAILURE.has(key)) return "destructive";
  return "neutral";
}

export const HEALTH_TONE_CLASSES: Record<HealthTone, string> = {
  success: "border-success/30 bg-success/15 text-success",
  warning: "border-warning/30 bg-warning/15 text-warning",
  destructive: "border-destructive/30 bg-destructive/15 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

export const HEALTH_DOT_CLASSES: Record<HealthTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/60",
};

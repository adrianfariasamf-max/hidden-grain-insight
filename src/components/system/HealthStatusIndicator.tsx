import { cn } from "@/lib/utils";
import { HEALTH_DOT_CLASSES, HEALTH_TONE_CLASSES, classifyStatus } from "@/lib/health/status";

interface HealthStatusIndicatorProps {
  status: string;
  className?: string;
}

/**
 * Text + color badge for a health status. Original text is always shown;
 * unknown values collapse to a neutral tone rather than being invented.
 */
export function HealthStatusIndicator({ status, className }: HealthStatusIndicatorProps) {
  const tone = classifyStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
        HEALTH_TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", HEALTH_DOT_CLASSES[tone])} />
      <span>{status || "unknown"}</span>
    </span>
  );
}

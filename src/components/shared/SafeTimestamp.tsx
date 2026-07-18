import { formatTimestampHuman, formatTimestampIso } from "@/lib/format/timestamp";

interface SafeTimestampProps {
  value?: string | null;
  fallback?: string;
  className?: string;
}

/**
 * Renders a timestamp defensively:
 * - missing/invalid → neutral "Timestamp unavailable" (or provided fallback)
 * - valid → human-readable UTC label with the ISO string as tooltip + <time datetime>
 */
export function SafeTimestamp({
  value,
  fallback = "Timestamp unavailable",
  className,
}: SafeTimestampProps) {
  const iso = formatTimestampIso(value);
  const human = formatTimestampHuman(value);
  if (!iso || !human) {
    return (
      <span className={className} aria-label={fallback} title={fallback}>
        <span className="text-muted-foreground italic">{fallback}</span>
      </span>
    );
  }
  return (
    <time dateTime={iso} title={iso} className={className}>
      {human}
    </time>
  );
}

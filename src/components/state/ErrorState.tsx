import { AlertTriangle } from "lucide-react";

import { ApiError, ApiNetworkError, ApiNotFoundError } from "@/lib/api/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

function describe(error: unknown): { title: string; message: string } {
  if (error instanceof ApiNotFoundError) {
    return { title: "Not found", message: "The requested resource does not exist." };
  }
  if (error instanceof ApiNetworkError) {
    return {
      title: "Network error",
      message:
        "Could not reach the Hidden Grain API. Check your connection and VITE_HG_API_BASE.",
    };
  }
  if (error instanceof ApiError) {
    return { title: `Request failed (${error.status})`, message: error.message };
  }
  if (error instanceof Error) {
    return { title: "Something went wrong", message: error.message };
  }
  return { title: "Something went wrong", message: "Unknown error." };
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const info = describe(error);
  return (
    <div
      role="alert"
      className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      <h2 className="text-sm font-medium text-foreground">{title ?? info.title}</h2>
      <p className="max-w-md text-xs text-muted-foreground">{info.message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
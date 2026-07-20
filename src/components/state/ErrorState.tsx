import { AlertTriangle } from "lucide-react";

import {
  ApiContractError,
  ApiError,
  ApiNetworkError,
  ApiNotFoundError,
  ApiTimeoutError,
} from "@/lib/api/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

function describe(error: unknown): { title: string; message: string } {
  if (error instanceof ApiNotFoundError) {
    return { title: "No encontrado", message: "El recurso solicitado no existe." };
  }
  if (error instanceof ApiTimeoutError) {
    return {
      title: "Se agotó el tiempo de espera",
      message: "La API no respondió a tiempo. Puede estar saturada o inaccesible.",
    };
  }
  if (error instanceof ApiNetworkError) {
    return {
      title: "Error de red",
      message: "Could not reach the Hidden Grain API. Check your connection and VITE_HG_API_BASE.",
    };
  }
  if (error instanceof ApiContractError) {
    return {
      title: "Contrato incompatible",
      message:
        "La respuesta de la API no coincidió con el esquema esperado. El backend puede estar desincronizado.",
    };
  }
  if (error instanceof ApiError) {
    return { title: `Request failed (${error.status})`, message: error.message };
  }
  if (error instanceof Error) {
    return { title: "Ocurrió un problema", message: error.message };
  }
  return { title: "Ocurrió un problema", message: "Error desconocido." };
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const info = describe(error);
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div
      role="alert"
      className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      <h2 className="text-sm font-medium text-foreground">{title ?? info.title}</h2>
      <p className="max-w-md text-xs text-muted-foreground">{info.message}</p>
      {requestId ? (
        <p className="font-mono text-[10px] text-muted-foreground">Request ID: {requestId}</p>
      ) : null}
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

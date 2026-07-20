// Error taxonomy for the Hidden Grain API client.
// NotFound is kept separate so the UI can render an "unknown object" view
// instead of a generic error boundary. Only transient errors (network /
// timeout / 5xx) are retried; 4xx and contract errors are surfaced
// immediately.

export interface ApiErrorMeta {
  code?: string;
  requestId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;
  constructor(message: string, status: number, url: string, meta: ApiErrorMeta = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.code = meta.code;
    this.requestId = meta.requestId;
    this.details = meta.details;
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(url: string, meta: ApiErrorMeta = {}) {
    super("Resource not found", 404, url, meta);
    this.name = "ApiNotFoundError";
  }
}

export class ApiNetworkError extends ApiError {
  constructor(url: string, cause?: unknown, meta: ApiErrorMeta = {}) {
    super("Error de red while contacting the API", 0, url, meta);
    this.name = "ApiNetworkError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(url: string, timeoutMs: number, meta: ApiErrorMeta = {}) {
    super(`Se agotó el tiempo de espera after ${timeoutMs}ms`, 0, url, meta);
    this.name = "ApiTimeoutError";
  }
}

export class ApiContractError extends ApiError {
  constructor(url: string, details: unknown, meta: ApiErrorMeta = {}) {
    super("API response did not match the expected contract", 0, url, {
      ...meta,
      details: meta.details ?? details,
    });
    this.name = "ApiContractError";
  }
}

export function isTransient(err: unknown): boolean {
  if (err instanceof ApiContractError) return false;
  if (err instanceof ApiNetworkError) return true;
  if (err instanceof ApiTimeoutError) return true;
  if (err instanceof ApiError) return err.status >= 500;
  return false;
}

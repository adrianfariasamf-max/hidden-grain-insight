// Error taxonomy for the Hidden Grain API client.
// NotFound is kept separate so the UI can render an "unknown object" view
// instead of a generic error boundary. Only transient errors (network /
// 5xx) are retried; 4xx are surfaced immediately.

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(url: string) {
    super("Resource not found", 404, url);
    this.name = "ApiNotFoundError";
  }
}

export class ApiNetworkError extends ApiError {
  constructor(url: string, cause?: unknown) {
    super("Network error while contacting the API", 0, url);
    this.name = "ApiNetworkError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

export function isTransient(err: unknown): boolean {
  if (err instanceof ApiNetworkError) return true;
  if (err instanceof ApiError) return err.status >= 500;
  return false;
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const api = window as Window & { __lovableEvents?: { captureException?: (error: unknown, context?: Record<string, unknown>) => void } };
  api.__lovableEvents?.captureException?.(error, { source: "react_error_boundary", route: window.location.pathname, ...context });
}
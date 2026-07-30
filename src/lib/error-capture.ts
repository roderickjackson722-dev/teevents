let lastCapturedError: { error: unknown; at: number } | undefined;
const record = (error: unknown) => { lastCapturedError = { error, at: Date.now() }; };
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) => record((event as PromiseRejectionEvent).reason));
}
export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError || Date.now() - lastCapturedError.at > 5000) { lastCapturedError = undefined; return undefined; }
  const error = lastCapturedError.error; lastCapturedError = undefined; return error;
}
/**
 * Returns the caller-supplied origin only when it belongs to a TeeVents-owned
 * host; otherwise the default. Prevents checkout return links from sending
 * buyers to a site chosen by the caller.
 */
const DEFAULT_ORIGIN = "https://www.teevents.golf";

export function safeAppOrigin(raw: unknown, fallback: string = DEFAULT_ORIGIN): string {
  if (typeof raw !== "string" || !raw) return fallback;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return fallback;
  }
  const host = u.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal && u.protocol !== "https:") return fallback;
  if (isLocal && u.protocol !== "http:" && u.protocol !== "https:") return fallback;
  const allowed =
    isLocal ||
    host === "teevents.golf" ||
    host.endsWith(".teevents.golf") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  return allowed ? u.origin : fallback;
}

/** Only same-site absolute paths like "/dashboard/upgrade". */
export function safeReturnPath(raw: unknown, fallback: string): string {
  return typeof raw === "string" && /^\/[A-Za-z0-9\-_/]*$/.test(raw) ? raw : fallback;
}

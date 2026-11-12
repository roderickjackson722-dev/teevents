// Only redirect checkout back to TeeVents-owned hosts; anything else falls back.
export const DEFAULT_SITE_ORIGIN = "https://www.teevents.golf";

export function trustedOrigin(candidate: string | null | undefined, fallback = DEFAULT_SITE_ORIGIN): string {
  try {
    const u = new URL(String(candidate || ""));
    const h = u.hostname.toLowerCase();
    const ok =
      (u.protocol === "https:" &&
        (h === "teevents.golf" || h.endsWith(".teevents.golf") || h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com"))) ||
      h === "localhost";
    return ok ? u.origin : fallback;
  } catch {
    return fallback;
  }
}

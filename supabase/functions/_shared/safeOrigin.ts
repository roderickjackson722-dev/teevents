// Returns a trusted site origin for Stripe/auth return links.
// The caller-supplied Origin (or URL) is only honored when its host is a TeeVents
// host, a Lovable preview host, or a tournament custom domain on file.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_ORIGIN = "https://www.teevents.golf";

function staticAllowed(host: string): boolean {
  return host === "teevents.golf" || host.endsWith(".teevents.golf") ||
    host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") ||
    host === "localhost";
}

export async function trustedOriginFor(candidate: string | null | undefined): Promise<string | null> {
  if (!candidate) return null;
  let u: URL;
  try { u = new URL(candidate); } catch { return null; }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && u.hostname === "localhost")) return null;
  const host = u.hostname.toLowerCase();
  if (staticAllowed(host)) return u.origin;
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const bare = host.replace(/^www\./, "");
    const { data } = await admin.from("tournaments").select("id")
      .in("custom_domain", [host, bare, `www.${bare}`]).limit(1);
    if (data && data.length) return u.origin;
  } catch { /* fall through */ }
  return null;
}

export async function safeOrigin(req: Request, fallback = DEFAULT_ORIGIN): Promise<string> {
  return (await trustedOriginFor(req.headers.get("origin"))) || fallback;
}

// For full return URLs supplied by the caller: keep only trusted-origin URLs.
export async function safeReturnUrl(url: unknown, fallback: string): Promise<string> {
  if (typeof url !== "string" || !url) return fallback;
  const o = await trustedOriginFor(url);
  if (!o) return fallback;
  try { const u = new URL(url); return `${u.origin}${u.pathname}`; } catch { return fallback; }
}

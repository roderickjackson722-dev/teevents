/**
 * Enterprise course branding for golfer-facing emails, texts and pages.
 * Pure module (no Deno or browser APIs) shared by the email senders and the
 * in-app previews so both always produce the same branding.
 *
 * Branding applies only to Enterprise events whose Web address & branding has a
 * saved logo. Otherwise every caller keeps its current TeeVents default.
 */

export type WhiteLabel = { name: string; logoUrl: string; primary: string };

export const WHITE_LABEL_FIELDS = "is_enterprise, site_logo_url, site_primary_color, course_name, title";

const HEX = /^#[0-9a-f]{3,8}$/i;

export function whiteLabelFrom(t: any): WhiteLabel | null {
  if (!t || t.is_enterprise !== true) return null;
  const logoUrl = String(t.site_logo_url || "").trim();
  if (!logoUrl) return null;
  const name = String(t.course_name || "").trim() || String(t.title || "").trim();
  if (!name) return null;
  const primary = HEX.test(String(t.site_primary_color || "")) ? String(t.site_primary_color) : "#1a5c38";
  return { name, logoUrl, primary };
}

export async function loadWhiteLabel(client: any, tournamentId: string | null | undefined): Promise<WhiteLabel | null> {
  if (!client || !tournamentId) return null;
  try {
    const { data } = await client.from("tournaments").select(WHITE_LABEL_FIELDS).eq("id", tournamentId).maybeSingle();
    return whiteLabelFrom(data);
  } catch {
    return null;
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function whiteLabelFooterHtml(wl: WhiteLabel): string {
  return `<p style="margin:0;color:#6b7280;font-size:12px;text-align:center;"><img src="${esc(wl.logoUrl)}" alt="${esc(wl.name)}" style="height:28px;max-width:160px;object-fit:contain;display:block;margin:0 auto 6px;" /><span style="color:${wl.primary};font-weight:600;">${esc(wl.name)}</span></p>`;
}

/** Any footer paragraph that starts with "Sent by TeeVents". */
const TEEVENTS_FOOTER = /<p\b[^>]*>\s*Sent by TeeVents[\s\S]*?<\/p>/gi;

export function brandEmailHtml(html: string, wl: WhiteLabel | null): string {
  if (!wl) return html;
  return html.replace(TEEVENTS_FOOTER, whiteLabelFooterHtml(wl));
}

/** Swaps only the display name of a "Name <address>" sender; the address is unchanged. */
export function brandSender(from: string, wl: WhiteLabel | null): string {
  if (!wl) return from;
  const m = from.match(/<([^>]+)>\s*$/);
  const safe = wl.name.replace(/["<>\r\n]/g, "").trim();
  return m && safe ? `"${safe}" <${m[1]}>` : from;
}

/** Text signature: the course name when branded, otherwise the existing TeeVents signature. */
export function smsSignature(wl: WhiteLabel | null): string {
  return wl ? wl.name : "TeeVents";
}

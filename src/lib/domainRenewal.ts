/**
 * Custom domain renewal lifecycle — one pure rule module shared by the daily
 * renewal job, the custom-domain router redirect and the dashboard card.
 *
 * Timeline (no renewal saved):
 *   event end + 30 days -> renewal notice #1 (domain stays live)
 *   event end + 60 days -> domain archived: visitors redirect to the
 *                          TeeVents event page, final notice #2 is sent
 * A paid renewal sets an explicit expiry one year out; notice #1 then goes
 * 30 days before that expiry.
 */
export const DAY_MS = 86_400_000;
export const DEFAULT_ACTIVE_DAYS = 60;
export const NOTICE_LEAD_DAYS = 30;
export const RENEWAL_DAYS = 365;
export const RENEWAL_PRICE_CENTS = 9900;

export type DomainRenewalInput = {
  custom_domain?: string | null;
  date?: string | null;
  end_date?: string | null;
  custom_domain_expires_at?: string | null;
};

export type DomainStage = "none" | "active" | "renewal_due" | "archived";

function dayEndMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T23:59:59Z` : s;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** When the custom domain stops serving the event (redirects to archive). */
export function domainExpiresAtMs(t: DomainRenewalInput): number | null {
  const explicit = dayEndMs(t.custom_domain_expires_at ?? null);
  if (explicit != null) return explicit;
  const end = dayEndMs(t.end_date || t.date || null);
  return end == null ? null : end + DEFAULT_ACTIVE_DAYS * DAY_MS;
}

export function domainStage(t: DomainRenewalInput, nowMs: number = Date.now()): DomainStage {
  if (!t.custom_domain) return "none";
  const exp = domainExpiresAtMs(t);
  if (exp == null) return "active";
  if (nowMs >= exp) return "archived";
  if (nowMs >= exp - NOTICE_LEAD_DAYS * DAY_MS) return "renewal_due";
  return "active";
}

/** New expiry after a paid renewal: one year from today or from the current expiry, whichever is later. */
export function renewedExpiryMs(t: DomainRenewalInput, nowMs: number = Date.now()): number {
  const current = domainExpiresAtMs(t) ?? nowMs;
  return Math.max(current, nowMs) + RENEWAL_DAYS * DAY_MS;
}

export function archiveUrl(slug: string): string {
  return `https://www.teevents.golf/t/${encodeURIComponent(slug)}?archived=1`;
}

/** Which renewal email is due. The "moved" notice only follows a sent 30-day notice. */
export function noticeDue(
  t: DomainRenewalInput & { custom_domain_notice1_sent_at?: string | null; custom_domain_notice2_sent_at?: string | null },
  nowMs: number = Date.now(),
): "notice1" | "notice2" | null {
  const stage = domainStage(t, nowMs);
  if (stage === "renewal_due" && !t.custom_domain_notice1_sent_at) return "notice1";
  if (stage === "archived" && t.custom_domain_notice1_sent_at && !t.custom_domain_notice2_sent_at) return "notice2";
  return null;
}

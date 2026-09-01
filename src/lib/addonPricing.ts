/**
 * Single source of truth for TeeVents per-event add-on and plan pricing (in cents).
 * Admin overrides live in public.admin_addon_pricing (addon_key → price_cents).
 */

export const FLAT_RATE_PRO_CENTS = 39900; // $399 per event, no 5% platform fee
export const BRANDING_SPONSOR_CENTS = 49900; // Branding Removal + Digital Sponsor
export const LEAGUE_ANNUAL_CENTS = 39900; // $399/year golf league subscription
export const LEAGUE_EVENT_LIMIT = 24;
export const FREE_MANUAL_ENTRIES = 10;

/** Standard per-event add-ons ($199 each). */
export const ADDON_PRICE_CENTS: Record<string, number> = {
  live_leaderboard: 19900,
  unlimited_manual_entries: 19900,
  auction_raffle: 19900,
  custom_event_page: 19900,
  custom_domain: 9900,
};

/** College Golf Scoring is priced by the number of divisions (1–4). */
export const COLLEGE_SCORING_CENTS: Record<number, number> = {
  1: 19900,
  2: 37500,
  3: 55000,
  4: 72000,
};

export function collegeScoringKey(divisions: number) {
  return `college_scoring_${Math.min(4, Math.max(1, divisions))}`;
}

export function collegeScoringCents(
  divisions: number,
  overrides?: Record<string, number> | null,
) {
  const d = Math.min(4, Math.max(1, Math.round(divisions || 1)));
  return overrides?.[collegeScoringKey(d)] ?? COLLEGE_SCORING_CENTS[d];
}

export function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

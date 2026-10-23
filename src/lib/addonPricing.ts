/**
 * Single source of truth for TeeVents per-event add-on and plan pricing (in cents).
 * Admin overrides live in public.admin_addon_pricing (addon_key → price_cents).
 */

export const LEGACY_FLAT_RATE_PRO_CENTS = 15000;
export const FLAT_RATE_PRO_CENTS = 39900; // New-customer Per-Event price
export const BRANDING_SPONSOR_CENTS = 9900; // Branding Removal + Digital Sponsor
export const LEGACY_LEAGUE_ANNUAL_CENTS = 39900;
export const LEAGUE_ANNUAL_CENTS = 59900; // New-customer Per-League price
export const LEAGUE_EVENT_LIMIT = 24;
export const FREE_MANUAL_ENTRIES = 10;

/** Standard per-event add-ons ($99 each). */
export const ADDON_PRICE_CENTS: Record<string, number> = {
  live_leaderboard: 9900,
  unlimited_manual_entries: 9900,
  auction_raffle: 9900,
  custom_event_page: 9900,
  custom_domain: 9900,
};

export function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

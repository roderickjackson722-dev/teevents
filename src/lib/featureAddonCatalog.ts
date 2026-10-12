export const FEATURE_ADDONS: Record<string, { name: string; cents: number }> = {
  live_leaderboard: { name: "Live Leaderboard and Mobile Scoring", cents: 9900 },
  unlimited_manual_entries: { name: "Unlimited Manual Entries", cents: 9900 },
  auction_raffle: { name: "Auction Dashboard", cents: 9900 },
  custom_event_page: { name: "Custom Event Page Design", cents: 9900 },
  custom_domain: { name: "Custom Domain", cents: 9900 },
  branding_sponsor: { name: "Branding Removal and Digital Sponsor", cents: 9900 },
  college_scoring: { name: "College Golf Scoring", cents: 19900 },
};

export const COLLEGE_ADDON_AMOUNTS: Record<number, number> = { 1: 19900, 2: 37500, 3: 55000, 4: 72000 };
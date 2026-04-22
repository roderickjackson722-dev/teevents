// Shared definition of public tournament page tabs.
// The Overview/Hero is always shown and is not part of this list.

export type PublicTabKey =
  | "leaderboard"
  | "sponsors"
  | "gallery"
  | "volunteers"
  | "auction"
  | "donations"
  | "course_details"
  | "contests"
  | "travel"
  | "schedule";

export interface PublicTabMeta {
  key: PublicTabKey;
  label: string;
  /** Anchor used by the public page nav links. */
  href: string;
  /** Short helper text shown in the dashboard. */
  helper: string;
}

export const PUBLIC_TABS: PublicTabMeta[] = [
  { key: "leaderboard",    label: "Leaderboard",    href: "#leaderboard",       helper: "Live leaderboard" },
  { key: "sponsors",       label: "Sponsors",       href: "#sponsors",          helper: "Sponsor showcase" },
  { key: "auction",        label: "Auction / Raffle", href: "#auction",         helper: "Silent auction & raffle items" },
  { key: "donations",      label: "Donations",      href: "#donation",          helper: "Fundraising progress" },
  { key: "course_details", label: "Course Details", href: "#course-details",    helper: "Course map, par, slope, rating" },
  { key: "schedule",       label: "Schedule",       href: "#schedule",          helper: "Event day schedule" },
  { key: "gallery",        label: "Gallery",        href: "#photos",            helper: "Photo gallery" },
  { key: "volunteers",     label: "Volunteers",     href: "#volunteers",        helper: "Volunteer sign-up & info" },
  { key: "contests",       label: "Contests",       href: "#contests",          helper: "Closest-to-pin, long drive, etc." },
  { key: "travel",         label: "Location / Travel", href: "#location",       helper: "Accommodations & travel info" },
];

export const PUBLIC_TABS_DEFAULT_VISIBILITY: Record<PublicTabKey, boolean> = {
  leaderboard: true,
  sponsors: true,
  gallery: false,
  volunteers: false,
  auction: true,
  donations: true,
  course_details: true,
  contests: false,
  travel: false,
  schedule: true,
};

export const PUBLIC_TABS_DEFAULT_ORDER: PublicTabKey[] = [
  "leaderboard", "sponsors", "auction", "donations",
  "course_details", "schedule", "gallery", "volunteers",
  "contests", "travel",
];

/** Merge a stored visibility map with defaults so missing keys still resolve. */
export function normalizeVisibility(
  stored: Partial<Record<string, boolean>> | null | undefined,
): Record<PublicTabKey, boolean> {
  const out = { ...PUBLIC_TABS_DEFAULT_VISIBILITY };
  if (stored && typeof stored === "object") {
    for (const k of Object.keys(out) as PublicTabKey[]) {
      if (typeof stored[k] === "boolean") out[k] = stored[k] as boolean;
    }
  }
  return out;
}

/**
 * Merge a stored order with defaults: keep stored order, then append any
 * missing keys at the end (so newly-added tabs are not silently dropped).
 */
export function normalizeOrder(stored: string[] | null | undefined): PublicTabKey[] {
  const valid = new Set<string>(PUBLIC_TABS_DEFAULT_ORDER);
  const seen = new Set<PublicTabKey>();
  const out: PublicTabKey[] = [];
  if (Array.isArray(stored)) {
    for (const k of stored) {
      if (valid.has(k) && !seen.has(k as PublicTabKey)) {
        out.push(k as PublicTabKey);
        seen.add(k as PublicTabKey);
      }
    }
  }
  for (const k of PUBLIC_TABS_DEFAULT_ORDER) {
    if (!seen.has(k)) out.push(k);
  }
  return out;
}

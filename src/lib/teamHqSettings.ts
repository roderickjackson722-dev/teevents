/**
 * Settings for the public mobile Team Homepage (`/team/:slug`).
 * Stored on `tournaments.team_hq_settings` (jsonb) so organizers control
 * exactly which resources players see.
 */
export interface TeamHqCustomBox {
  id: string;
  title: string;
  body: string;
  link_url?: string;
  link_label?: string;
  enabled: boolean;
}

export interface TeamHqSettings {
  enabled: boolean;
  show_welcome: boolean;
  show_quick_links: boolean;
  show_alpha_list: boolean;
  /** Show each player's division / tier on the Team HQ alpha list. */
  show_divisions: boolean;
  show_hole_assignments: boolean;
  show_tee_times: boolean;
  show_leaderboard: boolean;
  show_scoring: boolean;
  show_qr_codes: boolean;
  show_announcements: boolean;
  show_contact: boolean;
  show_share: boolean;
  intro_note: string;
  custom_boxes: TeamHqCustomBox[];
}

export const DEFAULT_TEAM_HQ_SETTINGS: TeamHqSettings = {
  enabled: true,
  show_welcome: true,
  show_quick_links: true,
  show_alpha_list: true,
  show_divisions: false,
  show_hole_assignments: true,
  show_tee_times: true,
  show_leaderboard: true,
  show_scoring: true,
  show_qr_codes: true,
  show_announcements: true,
  show_contact: true,
  show_share: true,
  intro_note: "",
  custom_boxes: [],
};


/** Merge stored jsonb with defaults so older tournaments keep working. */
export function parseTeamHqSettings(raw: unknown): TeamHqSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TEAM_HQ_SETTINGS };
  const merged = { ...DEFAULT_TEAM_HQ_SETTINGS, ...(raw as Partial<TeamHqSettings>) };
  merged.custom_boxes = Array.isArray(merged.custom_boxes)
    ? merged.custom_boxes.filter((b) => b && typeof b === "object").map((b) => ({
        id: String(b.id ?? Math.random().toString(36).slice(2)),
        title: String(b.title ?? ""),
        body: String(b.body ?? ""),
        link_url: b.link_url ? String(b.link_url) : "",
        link_label: b.link_label ? String(b.link_label) : "",
        enabled: b.enabled !== false,
      }))
    : [];
  return merged;
}


export const TEAM_HQ_SECTION_LABELS: Array<{ key: keyof TeamHqSettings; label: string; help: string }> = [
  { key: "show_welcome", label: "Welcome message", help: "Shows the day-of welcome message at the top." },
  { key: "show_quick_links", label: "Quick links grid", help: "Tap targets that jump to each section." },
  { key: "show_alpha_list", label: "Alpha list (A–Z players)", help: "Every registered player, alphabetical." },
  { key: "show_divisions", label: "Show divisions / tiers", help: "Adds each player's division or tier next to their name on the alpha list." },
  { key: "show_hole_assignments", label: "Hole assignments & pairings", help: "Groups with their starting hole." },
  { key: "show_tee_times", label: "Tee times", help: "Shows tee times next to each group." },
  { key: "show_leaderboard", label: "Live leaderboard button", help: "Opens the live leaderboard." },
  { key: "show_scoring", label: "Scoring entry button", help: "Opens the score entry page." },
  { key: "show_qr_codes", label: "QR codes", help: "Printable QR codes for each resource." },
  { key: "show_announcements", label: "Announcements", help: "Day-of announcements list." },
  { key: "show_contact", label: "Contact info", help: "Tournament director and emergency contacts." },
  { key: "show_share", label: "Share tools", help: "Copy link and social share shortcuts." },
];

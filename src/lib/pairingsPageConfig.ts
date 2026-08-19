/** Shared template + types for the public "Tee Times & Pairings" page. */

export interface PairingsPageConfig {
  headline: string;
  intro: string;
  show_logo: boolean;
  show_course: boolean;
  show_date: boolean;
  show_tee_times: boolean;
  show_starting_hole: boolean;
  show_flights: boolean;
  show_team_names: boolean;
  show_contact: boolean;
  notes_title: string;
  notes: string;
  footer_note: string;
  accent: string;
  /** Overrides the event date shown on the page ("YYYY-MM-DD"). */
  date_override: string;
  /** Free text shown instead of the formatted date (wins over date_override). */
  date_text: string;
  /** Overrides the course name shown on the page. */
  course_override: string;
  /** Overrides the contact email shown in the footer. */
  contact_override: string;
}


export const PAIRINGS_PAGE_DEFAULTS: PairingsPageConfig = {
  headline: "",
  intro:
    "Find your group below. Please arrive at least 30 minutes before your scheduled time to check in, grab your cart and warm up.",
  show_logo: true,
  show_course: true,
  show_date: true,
  show_tee_times: true,
  show_starting_hole: true,
  show_flights: true,
  show_team_names: true,
  show_contact: true,
  notes_title: "Day-of Details",
  notes:
    "Check-in opens 45 minutes before the first start. Range balls and lunch are included with your registration.",
  footer_note: "Pairings are subject to change. Refresh this page on event day for the latest version.",
  accent: "#1a5c38",
  date_override: "",
  date_text: "",
  course_override: "",
  contact_override: "",
};


export function resolvePairingsPageConfig(raw: unknown): PairingsPageConfig {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<PairingsPageConfig>;
  return { ...PAIRINGS_PAGE_DEFAULTS, ...value };
}

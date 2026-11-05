/**
 * Software vs Managed Service distinction. Exact wording is set by the site
 * owner — use these constants everywhere a program is named so the tags and
 * definitions never diverge. Presentation-only; no prices, fees, schedules,
 * or scope live here.
 */
export const SOFTWARE_TAG = "SOFTWARE";
export const MANAGED_TAG = "MANAGED SERVICE, ON SITE";

export const SOFTWARE_DEFINITION =
  "Use the TeeVents software. A dedicated rep builds your event page for you. You run event day yourself, using the software.";

export const MANAGED_DEFINITION =
  "Everything in the software, plus a dedicated tournament manager who works with you from agreement through event day, on site.";

export const ON_SITE_HEADING = "On Site, What Your Manager Does On Event Day";

export const ON_SITE_BULLETS = [
  "On site event day coordination, from check in through awards",
  "Check in setup and live scoring management on event day",
  "Timeline and run sheet, managed on the day, not just sent in advance",
  "Course, food, awards, and vendor coordination on the day, with the group paying those costs directly",
  "Consulting throughout, from agreement through event day, plus post event closeout",
] as const;

export const SOFTWARE_PROGRAMS = ["No Cost to Start", "Per Event", "Per League", "Enterprise"] as const;
export const MANAGED_PROGRAMS = ["Full Service Management"] as const;
export const FULL_SERVICE_NAME = "Full Service Management";
export const FULL_SERVICE_PRICE = "Contact us for a quote";
export const FULL_SERVICE_SCOPE = "Branded TeeVents event page, registration, sponsor tiers, course negotiation and course communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers, pairings, check in setup, live scoring, timeline and consulting throughout, on site event day coordination, post event closeout";
export const FULL_SERVICE_GROUP = "Recruiting players, selling sponsorships, paying course, food, awards, and vendor costs directly, providing logo and tournament details, and naming one contact who can approve decisions";
export const FULL_SERVICE_LIMITS = "TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit. Travel is quoted separately.";

/**
 * Draft (unpublished) public pages. They stay in the project and still open by
 * direct URL, but are kept out of navigation, related links and the sitemap,
 * and carry a noindex tag so search engines skip them.
 */
export const HIDDEN_PAGE_PATHS = new Set<string>([
  // Eventbrite comparison pages
  "/compare/eventbrite-vs-teevents",
  "/compare/teevents-vs-eventbrite",
  "/compare/eventbrite-vs-teevents/pdf",
  // Competitor guides on hold
  "/eventbrite-vs-golf-tournament-software",
  "/golfstatus-vs-golf-genius",
  "/eventbrite-for-golf-tournaments",
  "/best-golf-tournament-management-software",
  "/golfstatus-alternatives",
  "/golf-genius-alternatives",
  "/perfect-golf-event-reviews",
  "/rsvpify-for-golf-tournaments",
]);

export function isHiddenPage(path: string): boolean {
  const p = (path || "/").split("?")[0].replace(/\/+$/, "") || "/";
  return HIDDEN_PAGE_PATHS.has(p);
}

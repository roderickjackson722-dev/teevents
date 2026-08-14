import { scramble, charityGuide, formats, websiteBuilder, sponsorManagement } from "./contentA";
import { liveScoring, eventbrite, competitors, shotgun, pricing } from "./contentB";
import {
  eventbriteForGolf,
  registrationPlatform,
  bestSoftware,
  onlineRegistration,
  golfstatusAlternatives,
  golfGeniusAlternatives,
  perfectGolfEventReviews,
  rsvpifyForGolf,
} from "./contentC";
import {
  pairingsManagement,
  handicapSystem,
  sponsorPackages,
  liveScoringGuide,
  websiteBuilderPage,
  websiteDesign,
  brandedEventPage,
  pageCustomization,
} from "./contentD";
import type { GuideContent } from "./types";

export const guides: GuideContent[] = [
  scramble, charityGuide, formats, websiteBuilder, sponsorManagement,
  liveScoring, eventbrite, competitors, shotgun, pricing,
];

/** Newer guides, resolved by slug. */
export const extraGuides: GuideContent[] = [
  eventbriteForGolf,
  registrationPlatform,
  bestSoftware,
  onlineRegistration,
  golfstatusAlternatives,
  golfGeniusAlternatives,
  perfectGolfEventReviews,
  rsvpifyForGolf,
  pairingsManagement,
  handicapSystem,
  sponsorPackages,
  liveScoringGuide,
  websiteBuilderPage,
  websiteDesign,
  brandedEventPage,
  pageCustomization,
];

export const guideBySlug: Record<string, GuideContent> = Object.fromEntries(
  [...guides, ...extraGuides].map((g) => [g.slug, g]),
);

export type MockupKind = "leaderboard" | "site" | "sponsor" | "scoring" | "pricing";

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  mockup?: MockupKind;
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideLink {
  to: string;
  label: string;
}

export interface GuideContent {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  heroSubtitle: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
  related: GuideLink[];
  ctaHeading: string;
  ctaText: string;
}

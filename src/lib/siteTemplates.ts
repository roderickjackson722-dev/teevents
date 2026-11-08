// Public event page templates. Each template changes the page LAYOUT (logo
// position, hero shape, headline alignment, button count/placement, page
// background) — not just colors. IDs are kept stable so saved events keep
// their selected template.

export type LogoPlacement = "above-nav-center" | "nav-left" | "top-center" | "in-hero";
export type NavStyle = "bar" | "sticky" | "none";
export type HeroType = "photo" | "split" | "banner" | "dark-split" | "framed";
export type Align = "left" | "center" | "right";

export interface SiteTemplateLayout {
  logo: LogoPlacement;
  nav: NavStyle;
  hero: HeroType;
  align: Align;
  buttons: 1 | 2 | 3;
  pillButtons: boolean;
  /** Default page background when the organizer hasn't picked one. */
  pageBg: string;
  /** Section treatment applied below the hero. */
  sections: "plain" | "cream" | "dark" | "summer-band";
  dark: boolean;
}

export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  whatChanges: string;
  colors: { primary: string; secondary: string };
  layout: SiteTemplateLayout;
  /** Legacy summary used by onboarding thumbnails. */
  preview: { navStyle: "centered" | "left-logo"; heroAlign: Align; ctaCount: number };
}

const TEMPLATE_DEFS: Omit<SiteTemplate, "preview">[] = [
  {
    id: "classic",
    name: "Centered Photo Hero",
    description: "Deep green and gold on a white page.",
    whatChanges: "Logo on top center. Big photo across the top. Headline in the middle. Three buttons under it.",
    colors: { primary: "#1a5c38", secondary: "#c8a84e" },
    layout: { logo: "above-nav-center", nav: "bar", hero: "photo", align: "center", buttons: 3, pillButtons: false, pageBg: "#ffffff", sections: "plain", dark: false },
  },
  {
    id: "modern",
    name: "Split Hero, Nav Left",
    description: "Navy blue and white on a white page.",
    whatChanges: "Logo on the left in a menu that stays at the top. Words on the left, photo on the right. Two buttons on the left.",
    colors: { primary: "#1e3a5f", secondary: "#ffffff" },
    layout: { logo: "nav-left", nav: "sticky", hero: "split", align: "left", buttons: 2, pillButtons: false, pageBg: "#ffffff", sections: "plain", dark: false },
  },
  {
    id: "charity",
    name: "Banner First, No Photo",
    description: "Warm reds and amber on a cream page.",
    whatChanges: "No photo. A solid color banner with a big headline and one large Register button in the middle.",
    colors: { primary: "#8b2500", secondary: "#e0a028" },
    layout: { logo: "in-hero", nav: "bar", hero: "banner", align: "center", buttons: 1, pillButtons: false, pageBg: "#fbf6ec", sections: "cream", dark: false },
  },
  {
    id: "midnight",
    name: "Dark Evening",
    description: "Dark charcoal page with silver and gold accents.",
    whatChanges: "Dark page with light text. Logo on the left. Words on the left, framed photo on the right. Three buttons in a row.",
    colors: { primary: "#2a2a35", secondary: "#d4af37" },
    layout: { logo: "nav-left", nav: "bar", hero: "dark-split", align: "left", buttons: 3, pillButtons: false, pageBg: "#16161d", sections: "dark", dark: true },
  },
  {
    id: "sunrise",
    name: "Bright Summer",
    description: "Bright coral and teal on a white page.",
    whatChanges: "No menu bar. Logo on top center. Rounded photo box, headline in the middle, two big round buttons. Coral band behind Registration.",
    colors: { primary: "#e8604c", secondary: "#2a9d8f" },
    layout: { logo: "top-center", nav: "none", hero: "framed", align: "center", buttons: 2, pillButtons: true, pageBg: "#ffffff", sections: "summer-band", dark: false },
  },
  {
    id: "country_club",
    name: "Classic Club",
    description: "Hunter green on a cream page. Quiet, lots of white space.",
    whatChanges: "Logo on the left in the menu. Big photo with the headline on the right. Two buttons on the right.",
    colors: { primary: "#2d5016", secondary: "#b89a6a" },
    layout: { logo: "nav-left", nav: "bar", hero: "photo", align: "right", buttons: 2, pillButtons: false, pageBg: "#f7f3e8", sections: "cream", dark: false },
  },
];

export const SITE_TEMPLATES: SiteTemplate[] = TEMPLATE_DEFS.map((t) => ({
  ...t,
  preview: { navStyle: t.layout.logo === "nav-left" ? "left-logo" : "centered", heroAlign: t.layout.align, ctaCount: t.layout.buttons },
}));

export function getTemplateById(id: string | null | undefined): SiteTemplate | undefined {
  return SITE_TEMPLATES.find((t) => t.id === id);
}

export function templateOrDefault(id: string | null | undefined): SiteTemplate {
  return getTemplateById(id) ?? SITE_TEMPLATES[0];
}

/** Scoped section treatments below the hero (cream/dark/coral band). */
export function templateSectionCss(t: SiteTemplate): string {
  const s = `.tv-public[data-tv-tpl="${t.id}"]`;
  switch (t.layout.sections) {
    case "cream":
      return `${s} section:not(#hero){background-color:${t.layout.pageBg}!important}${s} section:not(#hero)[data-tv-band]{background-color:${t.colors.primary}!important}${s} section:not(#hero){padding-top:5rem;padding-bottom:5rem}`;
    case "dark":
      return `${s}{color:#e5e7eb}${s} section:not(#hero):not([data-tv-band]){background-color:${t.layout.pageBg}!important;color:#e5e7eb}${s} section:not(#hero):not([data-tv-band]) h2,${s} section:not(#hero):not([data-tv-band]) h3{color:#f3f4f6!important}${s} section:not(#hero):not([data-tv-band]) p{color:#c7cad1}${s} section:not(#hero) .bg-white{background-color:#23232d!important;border-color:#3a3a46!important;color:#e5e7eb}${s} footer{background-color:#0f0f14!important}`;
    case "summer-band":
      return `${s} #register{background-color:${t.colors.primary}!important}`;
    default:
      return "";
  }
}

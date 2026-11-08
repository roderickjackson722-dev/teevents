// Per-area color controls for the public tournament page, plus design
// undo/reset snapshots. Pure helpers shared by SiteBuilder (editor) and
// PublicTournament (renderer). An empty value means "use the theme color".

import { cleanElementEdits, elementEditsToCss, type ElementEdits } from "./liveEdits";

export type StyleOverrides = Partial<Record<StyleAreaKey, string>> & { elements?: ElementEdits };

export type StyleAreaKey =
  | "nav_bg" | "nav_text"
  | "hero_title" | "hero_subtitle" | "hero_badge_bg" | "hero_badge_text"
  | "hero_btn_bg" | "hero_btn_text"
  | "section_bg" | "section_heading" | "section_divider" | "body_text" | "muted_text" | "link"
  | "card_bg" | "card_border" | "card_title" | "price" | "icon"
  | "btn_bg" | "btn_text"
  | "band_bg" | "band_text"
  | "form_label" | "form_input_bg" | "form_input_text"
  | "footer_bg" | "footer_text";

export interface StyleArea { key: StyleAreaKey; label: string }
export interface StyleGroup { title: string; areas: StyleArea[] }

export const STYLE_GROUPS: StyleGroup[] = [
  { title: "Top menu", areas: [
    { key: "nav_bg", label: "Menu background" },
    { key: "nav_text", label: "Menu text & icons" },
  ] },
  { title: "Top banner", areas: [
    { key: "hero_title", label: "Event title" },
    { key: "hero_subtitle", label: "Subtitle" },
    { key: "hero_badge_bg", label: "Date & course badges" },
    { key: "hero_badge_text", label: "Badge text" },
    { key: "hero_btn_bg", label: "Banner buttons" },
    { key: "hero_btn_text", label: "Banner button text" },
  ] },
  { title: "Page sections", areas: [
    { key: "section_bg", label: "Section background" },
    { key: "section_heading", label: "Section headings" },
    { key: "section_divider", label: "Lines under headings" },
    { key: "body_text", label: "Paragraph text" },
    { key: "muted_text", label: "Small / light text" },
    { key: "link", label: "Links" },
    { key: "icon", label: "Icons" },
  ] },
  { title: "Cards (sponsors, tickets, store)", areas: [
    { key: "card_bg", label: "Card background" },
    { key: "card_border", label: "Card border" },
    { key: "card_title", label: "Card titles" },
    { key: "price", label: "Prices" },
  ] },
  { title: "Buttons", areas: [
    { key: "btn_bg", label: "Button color" },
    { key: "btn_text", label: "Button text" },
  ] },
  { title: "Colored bands (Ready to Play, Donate)", areas: [
    { key: "band_bg", label: "Band background" },
    { key: "band_text", label: "Band text" },
  ] },
  { title: "Registration form", areas: [
    { key: "form_label", label: "Field labels" },
    { key: "form_input_bg", label: "Field background" },
    { key: "form_input_text", label: "Field text" },
  ] },
  { title: "Footer", areas: [
    { key: "footer_bg", label: "Footer background" },
    { key: "footer_text", label: "Footer text" },
  ] },
];

const ALL_KEYS = new Set<string>(STYLE_GROUPS.flatMap((g) => g.areas.map((a) => a.key)));
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i;

/** Keep only known areas with valid hex colors; anything else is dropped. */
export function cleanOverrides(raw: unknown): StyleOverrides {
  const out: StyleOverrides = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ALL_KEYS.has(k) && typeof v === "string" && HEX.test(v.trim())) out[k as StyleAreaKey] = v.trim();
  }
  const elements = cleanElementEdits((raw as Record<string, unknown>).elements);
  if (Object.keys(elements).length) out.elements = elements;
  return out;
}

const S = ".tv-public";
const NOT_HERO_BAND = ':not(#hero):not([data-tv-band])';
const RULES: Record<StyleAreaKey, (c: string) => string> = {
  nav_bg: (c) => `${S} [data-tv="nav"],${S} [data-tv="nav"] > div{background:${c}!important}`,
  nav_text: (c) => `${S} [data-tv="nav"] button,${S} [data-tv="nav"] svg{color:${c}!important}`,
  hero_title: (c) => `${S} [data-tv="hero-title"]{color:${c}!important}`,
  hero_subtitle: (c) => `${S} [data-tv="hero-subtitle"]{color:${c}!important}`,
  hero_badge_bg: (c) => `${S} [data-tv="hero-badges"] > span{background:${c}!important}`,
  hero_badge_text: (c) => `${S} [data-tv="hero-badges"] > span,${S} [data-tv="hero-badges"] svg{color:${c}!important}`,
  hero_btn_bg: (c) => `${S} .tv-design-btn{background:${c}!important}`,
  hero_btn_text: (c) => `${S} .tv-design-btn{color:${c}!important}`,
  section_bg: (c) => `${S} section${NOT_HERO_BAND}{background:${c}!important}`,
  section_heading: (c) => `${S} section${NOT_HERO_BAND} h2{color:${c}!important}`,
  section_divider: (c) => `${S} section .w-16.h-0\\.5{background:${c}!important}`,
  body_text: (c) => `${S} section${NOT_HERO_BAND} p,${S} section${NOT_HERO_BAND} li,${S} section${NOT_HERO_BAND} .prose{color:${c}!important}`,
  muted_text: (c) => `${S} section${NOT_HERO_BAND} .text-xs,${S} section${NOT_HERO_BAND} .text-sm.text-muted-foreground,${S} section${NOT_HERO_BAND} [style*="color: rgb(136"]{color:${c}!important}`,
  link: (c) => `${S} section${NOT_HERO_BAND} a:not(.tv-design-btn):not([data-tv-btn]){color:${c}!important}`,
  icon: (c) => `${S} section${NOT_HERO_BAND} svg{color:${c}!important}`,
  card_bg: (c) => `${S} section${NOT_HERO_BAND} .bg-white{background:${c}!important}`,
  card_border: (c) => `${S} section${NOT_HERO_BAND} .bg-white,${S} section${NOT_HERO_BAND} .rounded-xl.border{border-color:${c}!important}`,
  card_title: (c) => `${S} section${NOT_HERO_BAND} h3,${S} section${NOT_HERO_BAND} h4{color:${c}!important}`,
  price: (c) => `${S} section${NOT_HERO_BAND} .text-2xl.font-bold,${S} section${NOT_HERO_BAND} .text-lg.font-bold,${S} section${NOT_HERO_BAND} .text-lg.font-semibold{color:${c}!important}`,
  btn_bg: (c) => `${S} [data-tv-btn],${S} section${NOT_HERO_BAND} button[type="submit"]{background:${c}!important;border-color:${c}!important}`,
  btn_text: (c) => `${S} [data-tv-btn],${S} [data-tv-btn] *,${S} section${NOT_HERO_BAND} button[type="submit"]{color:${c}!important}`,
  band_bg: (c) => `${S} [data-tv-band]{background:${c}!important}`,
  band_text: (c) => `${S} [data-tv-band] h2,${S} [data-tv-band] h3,${S} [data-tv-band] p,${S} [data-tv-band] label,${S} [data-tv-band] span:not([data-tv-btn] *){color:${c}!important}`,
  form_label: (c) => `${S} section label{color:${c}!important}`,
  form_input_bg: (c) => `${S} section input:not([type="checkbox"]):not([type="radio"]),${S} section select,${S} section textarea{background:${c}!important}`,
  form_input_text: (c) => `${S} section input,${S} section select,${S} section textarea{color:${c}!important}`,
  footer_bg: (c) => `${S} [data-tv="footer"],${S} [data-tv="footer"] footer{background:${c}!important}`,
  footer_text: (c) => `${S} [data-tv="footer"] *{color:${c}!important}`,
};

/** CSS rules applied on top of the theme. Order matters: specific areas last. */
export function overridesToCss(raw: unknown): string {
  const o = cleanOverrides(raw);
  return [...(Object.keys(RULES) as StyleAreaKey[])
    .filter((k) => o[k])
    .map((k) => RULES[k](o[k]!)), elementEditsToCss(o.elements)]
    .filter(Boolean)
    .join("\n");
}

// ---------- Undo / reset ----------

export const DESIGN_FIELDS = [
  "site_primary_color", "site_secondary_color", "site_background_color", "site_text_color",
  "site_font_family", "site_heading_font_size", "site_body_font_size", "site_button_font_size",
  "site_logo_position", "site_title_position", "site_button_position",
  "site_button_radius", "site_button_hover_effect", "site_show_logo", "site_style_overrides",
] as const;

export type DesignSnapshot = Record<string, unknown> & { saved_at?: string };
export const MAX_DESIGN_HISTORY = 20;

export function designSnapshot(src: Record<string, unknown>, savedAt = new Date().toISOString()): DesignSnapshot {
  const snap: DesignSnapshot = { saved_at: savedAt };
  for (const f of DESIGN_FIELDS) snap[f] = f === "site_style_overrides" ? cleanOverrides(src[f]) : (src[f] ?? null);
  return snap;
}

export function sameDesign(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return DESIGN_FIELDS.every((f) => JSON.stringify(f === "site_style_overrides" ? cleanOverrides(a[f]) : a[f] ?? null)
    === JSON.stringify(f === "site_style_overrides" ? cleanOverrides(b[f]) : b[f] ?? null));
}

/** Push the previously saved design onto history when this save changes it. */
export function pushDesignHistory(history: unknown, previousSaved: Record<string, unknown>, next: Record<string, unknown>): DesignSnapshot[] {
  const list = Array.isArray(history) ? (history as DesignSnapshot[]) : [];
  if (sameDesign(previousSaved, next)) return list;
  return [...list, designSnapshot(previousSaved)].slice(-MAX_DESIGN_HISTORY);
}

/** Fields to apply from a snapshot (saved_at removed). */
export function snapshotPatch(snap: DesignSnapshot): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of DESIGN_FIELDS) if (f in snap) patch[f] = f === "site_style_overrides" ? cleanOverrides(snap[f]) : snap[f];
  return patch;
}

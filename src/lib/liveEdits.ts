// Click-to-edit changes for the public tournament page. Each edit targets one
// element by a selector built from the nearest id / data-tv anchor, and is
// stored under site_style_overrides.elements. Pure helpers shared by the
// renderer (PublicTournament) and the on-page editor (LiveEditor).

export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing?: number;
  lineHeight?: number;
  padding?: number;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
}

export interface ElementEdit {
  style?: ElementStyle;
  text?: string;
  src?: string;
  hidden?: boolean;
}

export type ElementEdits = Record<string, ElementEdit>;

export const EDIT_FONTS = [
  "Inter", "Roboto", "Montserrat", "Open Sans", "Lato", "Poppins", "Oswald", "Raleway",
  "Playfair Display", "Merriweather", "Lora", "EB Garamond", "Bebas Neue", "Archivo Black",
  "DM Sans", "Space Grotesk", "Georgia", "Arial", "Times New Roman",
];
const SYSTEM_FONTS = new Set(["Georgia", "Arial", "Times New Roman"]);

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i;
const SELECTOR = /^[\w#\-\[\]="' >:().]+$/;
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
const pick = <T extends string>(v: unknown, allowed: readonly T[]) =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : undefined;

export function isSafeSelector(s: string): boolean {
  return s.length < 400 && SELECTOR.test(s) && !/[{};]/.test(s);
}

export function isSafeUrl(u: string): boolean {
  return /^https:\/\/[^\s"'()<>]+$/i.test(u);
}

export function cleanStyle(raw: unknown): ElementStyle {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s: ElementStyle = {};
  for (const k of ["color", "backgroundColor", "borderColor"] as const) {
    if (typeof r[k] === "string" && HEX.test(r[k] as string)) s[k] = r[k] as string;
  }
  if (typeof r.fontFamily === "string" && EDIT_FONTS.includes(r.fontFamily)) s.fontFamily = r.fontFamily;
  s.fontSize = num(r.fontSize, 8, 160);
  s.fontWeight = num(r.fontWeight, 100, 900);
  s.fontStyle = pick(r.fontStyle, ["normal", "italic"] as const);
  s.textDecoration = pick(r.textDecoration, ["none", "underline", "line-through"] as const);
  s.textAlign = pick(r.textAlign, ["left", "center", "right", "justify"] as const);
  s.textTransform = pick(r.textTransform, ["none", "uppercase", "lowercase", "capitalize"] as const);
  s.letterSpacing = num(r.letterSpacing, -5, 30);
  s.lineHeight = num(r.lineHeight, 0.8, 3);
  s.padding = num(r.padding, 0, 120);
  s.borderRadius = num(r.borderRadius, 0, 200);
  s.borderWidth = num(r.borderWidth, 0, 20);
  s.opacity = num(r.opacity, 0, 1);
  for (const k of Object.keys(s) as (keyof ElementStyle)[]) if (s[k] === undefined) delete s[k];
  return s;
}

export function cleanElementEdits(raw: unknown): ElementEdits {
  const out: ElementEdits = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [sel, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSafeSelector(sel) || !v || typeof v !== "object") continue;
    const e = v as Record<string, unknown>;
    const edit: ElementEdit = {};
    const style = cleanStyle(e.style);
    if (Object.keys(style).length) edit.style = style;
    if (typeof e.text === "string") edit.text = e.text.slice(0, 5000);
    if (typeof e.src === "string" && isSafeUrl(e.src)) edit.src = e.src;
    if (e.hidden === true) edit.hidden = true;
    if (Object.keys(edit).length) out[sel] = edit;
  }
  return out;
}

const fontStack = (f: string) => (SYSTEM_FONTS.has(f) ? `'${f}', serif` : `'${f}', system-ui, sans-serif`);

export function styleToCss(s: ElementStyle): string {
  const d: string[] = [];
  if (s.color) d.push(`color:${s.color}`);
  if (s.backgroundColor) d.push(`background:${s.backgroundColor}`);
  if (s.fontFamily) d.push(`font-family:${fontStack(s.fontFamily)}`);
  if (s.fontSize !== undefined) d.push(`font-size:${s.fontSize}px`);
  if (s.fontWeight !== undefined) d.push(`font-weight:${s.fontWeight}`);
  if (s.fontStyle) d.push(`font-style:${s.fontStyle}`);
  if (s.textDecoration) d.push(`text-decoration:${s.textDecoration}`);
  if (s.textAlign) d.push(`text-align:${s.textAlign}`);
  if (s.textTransform) d.push(`text-transform:${s.textTransform}`);
  if (s.letterSpacing !== undefined) d.push(`letter-spacing:${s.letterSpacing}px`);
  if (s.lineHeight !== undefined) d.push(`line-height:${s.lineHeight}`);
  if (s.padding !== undefined) d.push(`padding:${s.padding}px`);
  if (s.borderRadius !== undefined) d.push(`border-radius:${s.borderRadius}px`);
  if (s.borderWidth !== undefined) d.push(`border-width:${s.borderWidth}px;border-style:solid`);
  if (s.borderColor) d.push(`border-color:${s.borderColor}`);
  if (s.opacity !== undefined) d.push(`opacity:${s.opacity}`);
  return d.map((x) => `${x}!important`).join(";");
}

/** CSS for every element edit, scoped to the public page root. */
export function elementEditsToCss(raw: unknown): string {
  const edits = cleanElementEdits(raw);
  const rules: string[] = [];
  for (const [sel, e] of Object.entries(edits)) {
    if (e.style) {
      const css = styleToCss(e.style);
      if (css) rules.push(`.tv-public ${sel}{${css}}`);
    }
    if (e.hidden) {
      rules.push(`.tv-public:not([data-tv-editing]) ${sel}{display:none!important}`);
      rules.push(`.tv-public[data-tv-editing] ${sel}{opacity:.35!important;outline:2px dashed #999!important}`);
    }
  }
  return rules.join("\n");
}

export function googleFontsHref(raw: unknown): string | null {
  const fams = new Set<string>();
  for (const e of Object.values(cleanElementEdits(raw))) {
    const f = e.style?.fontFamily;
    if (f && !SYSTEM_FONTS.has(f)) fams.add(f);
  }
  if (!fams.size) return null;
  return `https://fonts.googleapis.com/css2?${[...fams].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:ital,wght@0,400;0,700;1,400`).join("&")}&display=swap`;
}

/** True when an element holds only text (safe to replace its words). */
export function isTextLeaf(el: Element): boolean {
  return el.children.length === 0 && (el.textContent ?? "").trim().length > 0;
}

/** Build a stable selector from the nearest id / data-tv anchor inside root. */
export function selectorFor(el: Element, root: Element): string | null {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root) {
    const id = cur.getAttribute("id");
    if (id && /^[A-Za-z][\w-]*$/.test(id)) { parts.unshift(`#${id}`); return parts.join(" > "); }
    const tv = cur.getAttribute("data-tv");
    if (tv && /^[\w-]+$/.test(tv)) { parts.unshift(`[data-tv="${tv}"]`); return parts.join(" > "); }
    const parent: Element | null = cur.parentElement;
    if (!parent) return null;
    const idx = Array.prototype.indexOf.call(parent.children, cur) + 1;
    parts.unshift(`:nth-child(${idx})`);
    cur = parent;
  }
  if (!parts.length) return null;
  return `:scope > ${parts.join(" > ")}`.replace(":scope > ", "");
}

/** Apply text and image edits to the rendered page (styles come from CSS). */
export function applyContentEdits(root: Element, raw: unknown) {
  const edits = cleanElementEdits(raw);
  for (const [sel, e] of Object.entries(edits)) {
    if (e.text === undefined && !e.src) continue;
    let nodes: NodeListOf<Element>;
    try { nodes = root.querySelectorAll(sel.startsWith(":nth-child") ? `:scope > ${sel}` : sel); } catch { continue; }
    nodes.forEach((n) => {
      if (e.text !== undefined && isTextLeaf(n) && n.textContent !== e.text) n.textContent = e.text;
      if (e.src && n instanceof HTMLImageElement && n.src !== e.src) { n.src = e.src; n.removeAttribute("srcset"); }
    });
  }
}

/** Selectors that start at the root need :scope when used in CSS too. */
export function cssSelector(sel: string): string {
  return sel.startsWith(":nth-child") ? `> ${sel}` : sel;
}

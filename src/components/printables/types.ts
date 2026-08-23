export interface Tournament {
  id: string;
  title: string;
  site_logo_url: string | null;
  printable_logo_url?: string | null;
  course_name: string | null;
  course_par: number | null;
  site_primary_color: string | null;
  site_secondary_color: string | null;
  printable_font: string | null;
  printable_layout: string | null;
  hole_pars: number[] | null;
  /** "tee_times" | "shotgun" — set on the Players & Pairings page */
  pairings_start_format?: string | null;
}

/** Logo used on printables: the dedicated printable logo, else the site logo */
export function getPrintLogo(t: Tournament | null): string | null {
  return t?.printable_logo_url || t?.site_logo_url || null;
}

export interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  payment_status?: string | null;
  group_number: number | null;
  group_position: number | null;
  /** Flight / division id (tournament_tiers) */
  flight_id?: string | null;
  /** Exact starting-hole label from pairings, e.g. "11A" */
  starting_hole_label?: string | null;
  /** Resolved flight / division name for printables */
  flight_name?: string | null;
}



export interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logo_url: string | null;
  website_url: string | null;
}

/** Get the primary color for print HTML, falling back to forest green */
export function getPrimaryColor(t: Tournament | null): string {
  return t?.site_primary_color || "#1a5c38";
}

/** Get the secondary/accent color for print HTML */
export function getSecondaryColor(t: Tournament | null): string {
  return t?.site_secondary_color || "#c8a84e";
}

/** Font family CSS string from tournament setting */
export function getFontFamily(t: Tournament | null): string {
  const fonts: Record<string, string> = {
    georgia: "'Georgia', serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    playfair: "'Playfair Display', Georgia, serif",
    roboto: "'Roboto', 'Helvetica Neue', sans-serif",
    courier: "'Courier New', Courier, monospace",
  };
  return fonts[t?.printable_font || "georgia"] || fonts.georgia;
}

export const PRINTABLE_FONTS = [
  { id: "georgia", name: "Georgia", preview: "Georgia, serif" },
  { id: "helvetica", name: "Helvetica", preview: "Helvetica, sans-serif" },
  { id: "playfair", name: "Playfair Display", preview: "'Playfair Display', serif" },
  { id: "roboto", name: "Roboto", preview: "'Roboto', sans-serif" },
  { id: "courier", name: "Courier", preview: "'Courier New', monospace" },
];

export const PRINTABLE_LAYOUTS = [
  { id: "classic", name: "Classic", description: "Traditional bordered layout with centered content" },
  { id: "modern", name: "Modern", description: "Clean minimalist design with subtle accents" },
  { id: "bold", name: "Bold", description: "High contrast with prominent color blocks" },
];

/**
 * Starting hole for a printable row. Group numbers are NOT holes — the starting
 * hole comes from the Pairings tab (`starting_hole`), so shotgun and tee-time
 * setups print exactly what the organizer assigned.
 */
export function startingHoleOf(r: { starting_hole?: number | null; group_number?: number | null } | null | undefined): number | null {
  if (!r) return null;
  const v = (r as any).starting_hole;
  if (v != null) return Number(v);
  return r.group_number ?? null;
}

/**
 * Printed starting-hole label. Organizers can split a hole into lettered slots
 * ("11A", "11B") on the Pairings tab, stored in `group_label`. Prefer that exact
 * label so printables match the pairing sheet; fall back to the numeric hole.
 */
export function startingHoleLabelOf(
  r:
    | {
        starting_hole?: number | null;
        group_number?: number | null;
        group_label?: string | null;
        starting_hole_label?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!r) return null;
  const explicit = (r as any).starting_hole_label as string | null | undefined;
  if (explicit && String(explicit).trim()) return String(explicit).trim().toUpperCase();
  const label = (r as any).group_label as string | null | undefined;
  if (label && /^\s*\d{1,2}\s*[A-Za-z]?\s*$/.test(label)) return label.trim().toUpperCase();
  const hole = startingHoleOf(r);
  return hole != null ? String(hole) : null;
}

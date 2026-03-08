export interface Tournament {
  id: string;
  title: string;
  site_logo_url: string | null;
  course_name: string | null;
  course_par: number | null;
  site_primary_color: string | null;
  site_secondary_color: string | null;
  printable_font: string | null;
  printable_layout: string | null;
  hole_pars: number[] | null;
}

export interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  group_number: number | null;
  group_position: number | null;
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

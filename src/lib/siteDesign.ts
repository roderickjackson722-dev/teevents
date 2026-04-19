// Public tournament page design system.
// Used by SiteBuilder (editor) and PublicTournament (renderer).

export type Position = "left" | "center" | "right";
export type HoverEffect = "darken" | "lighten" | "none";

export const FONT_FAMILIES: { id: string; label: string; stack: string }[] = [
  { id: "Inter", label: "Inter (clean & modern)", stack: "'Inter', system-ui, sans-serif" },
  { id: "Roboto", label: "Roboto (neutral)", stack: "'Roboto', system-ui, sans-serif" },
  { id: "Montserrat", label: "Montserrat (geometric)", stack: "'Montserrat', sans-serif" },
  { id: "Lato", label: "Lato (friendly)", stack: "'Lato', sans-serif" },
  { id: "Open Sans", label: "Open Sans (legible)", stack: "'Open Sans', sans-serif" },
  { id: "Poppins", label: "Poppins (rounded)", stack: "'Poppins', sans-serif" },
  { id: "Playfair Display", label: "Playfair Display (classic serif)", stack: "'Playfair Display', Georgia, serif" },
  { id: "Merriweather", label: "Merriweather (editorial serif)", stack: "'Merriweather', Georgia, serif" },
];

export function fontStack(id: string | null | undefined): string {
  return FONT_FAMILIES.find((f) => f.id === (id || "Inter"))?.stack || "system-ui, sans-serif";
}

export const POSITION_CLASS: Record<Position, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

export const FLEX_JUSTIFY: Record<Position, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  values: {
    site_font_family: string;
    site_heading_font_size: number;
    site_body_font_size: number;
    site_button_font_size: number;
    site_text_color: string;
    site_background_color: string;
    site_primary_color: string;
    site_secondary_color: string;
    site_logo_position: Position;
    site_title_position: Position;
    site_button_position: Position;
    site_button_radius: number;
    site_button_hover_effect: HoverEffect;
    site_show_logo: boolean;
  };
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Centered, traditional serif heading, deep green & gold",
    values: {
      site_font_family: "Playfair Display",
      site_heading_font_size: 56,
      site_body_font_size: 17,
      site_button_font_size: 16,
      site_text_color: "#1F2937",
      site_background_color: "#FFFFFF",
      site_primary_color: "#1a5c38",
      site_secondary_color: "#c8a84e",
      site_logo_position: "center",
      site_title_position: "center",
      site_button_position: "center",
      site_button_radius: 6,
      site_button_hover_effect: "darken",
      site_show_logo: true,
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Bold sans-serif, generous spacing, fully-rounded buttons",
    values: {
      site_font_family: "Montserrat",
      site_heading_font_size: 64,
      site_body_font_size: 18,
      site_button_font_size: 17,
      site_text_color: "#0F172A",
      site_background_color: "#F8FAFC",
      site_primary_color: "#1e3a5f",
      site_secondary_color: "#e8b931",
      site_logo_position: "left",
      site_title_position: "left",
      site_button_position: "left",
      site_button_radius: 50,
      site_button_hover_effect: "lighten",
      site_show_logo: true,
    },
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean, monochrome, lots of whitespace, square buttons",
    values: {
      site_font_family: "Inter",
      site_heading_font_size: 48,
      site_body_font_size: 16,
      site_button_font_size: 15,
      site_text_color: "#111111",
      site_background_color: "#FFFFFF",
      site_primary_color: "#111111",
      site_secondary_color: "#6B7280",
      site_logo_position: "center",
      site_title_position: "center",
      site_button_position: "center",
      site_button_radius: 0,
      site_button_hover_effect: "darken",
      site_show_logo: true,
    },
  },
];

export function buttonHoverStyle(effect: HoverEffect): string {
  if (effect === "lighten") return "filter: brightness(1.12);";
  if (effect === "none") return "";
  return "filter: brightness(0.88);";
}

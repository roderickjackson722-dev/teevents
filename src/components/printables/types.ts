export interface Tournament {
  id: string;
  title: string;
  site_logo_url: string | null;
  course_name: string | null;
  course_par: number | null;
  site_primary_color: string | null;
  site_secondary_color: string | null;
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

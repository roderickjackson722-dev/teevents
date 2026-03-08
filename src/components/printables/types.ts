export interface Tournament {
  id: string;
  title: string;
  site_logo_url: string | null;
  course_name: string | null;
  course_par: number | null;
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

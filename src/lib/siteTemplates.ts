export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  colors: { primary: string; secondary: string };
  preview: { navStyle: "centered" | "left-logo"; heroAlign: "center" | "right" | "left"; ctaCount: number };
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: "classic",
    name: "Classic Green",
    description: "Centered logo, timeless golf aesthetic with deep greens and gold accents. 3 CTA buttons in hero.",
    colors: { primary: "#1a5c38", secondary: "#c8a84e" },
    preview: { navStyle: "centered", heroAlign: "center", ctaCount: 3 },
  },
  {
    id: "modern",
    name: "Modern Navy",
    description: "Logo in navigation, right-aligned hero text with navy blue and bold accents.",
    colors: { primary: "#1e3a5f", secondary: "#e8b931" },
    preview: { navStyle: "left-logo", heroAlign: "right", ctaCount: 3 },
  },
  {
    id: "charity",
    name: "Charity Warmth",
    description: "Centered banner layout with warm tones, perfect for fundraising events. 2 CTA buttons.",
    colors: { primary: "#8b2500", secondary: "#d4a017" },
    preview: { navStyle: "centered", heroAlign: "center", ctaCount: 2 },
  },
  {
    id: "midnight",
    name: "Midnight Luxe",
    description: "Dark, premium feel with charcoal tones and silver accents. Left-aligned hero, 3 CTAs.",
    colors: { primary: "#1c1c2e", secondary: "#c0c0c0" },
    preview: { navStyle: "left-logo", heroAlign: "left", ctaCount: 3 },
  },
  {
    id: "sunrise",
    name: "Sunrise Coral",
    description: "Bright and energetic with coral and teal. Centered layout, perfect for summer events.",
    colors: { primary: "#d94f4f", secondary: "#2a9d8f" },
    preview: { navStyle: "centered", heroAlign: "center", ctaCount: 3 },
  },
  {
    id: "country_club",
    name: "Country Club",
    description: "Refined cream and hunter green palette. Logo in nav, right-aligned hero. 2 CTAs.",
    colors: { primary: "#2d5016", secondary: "#8b7355" },
    preview: { navStyle: "left-logo", heroAlign: "right", ctaCount: 2 },
  },
];

export function getTemplateById(id: string): SiteTemplate | undefined {
  return SITE_TEMPLATES.find((t) => t.id === id);
}

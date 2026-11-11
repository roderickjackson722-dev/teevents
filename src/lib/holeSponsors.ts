/** Pure rules for the "This hole is sponsored by" banner on player scoring screens. */
export interface HoleSponsor {
  id: string;
  name: string;
  logo_url: string | null;
  hole_banner_enabled?: boolean | null;
  hole_banner_display?: string | null; // logo | name | both
  hole_banner_name?: string | null;
  hole_banner_logo_url?: string | null;
  hole_banner_placement?: string | null; // top | bottom
  hole_banner_scope?: string | null; // per_hole | all | holes
  hole_banner_holes?: number[] | null;
}

/** Does this sponsor's banner show on the given hole? */
export function sponsorShowsOnHole(s: HoleSponsor, hole: number): boolean {
  if (!s.hole_banner_enabled) return false;
  const holes = s.hole_banner_holes || [];
  switch (s.hole_banner_scope || "all") {
    case "all":
      return true;
    case "per_hole":
      return holes.length > 0 && holes[0] === hole;
    case "holes":
      return holes.includes(hole);
    default:
      return false;
  }
}

/** Sponsors whose banner shows on this hole at this placement. */
export function holeSponsorsFor(list: HoleSponsor[], hole: number, placement: "top" | "bottom"): HoleSponsor[] {
  return list.filter((s) => sponsorShowsOnHole(s, hole) && (s.hole_banner_placement || "top") === placement);
}

/** True when the organizer configured any hole banner (otherwise the old display stays as-is). */
export function hasHoleBanners(list: HoleSponsor[]): boolean {
  return list.some((s) => !!s.hole_banner_enabled);
}

export function bannerLogo(s: HoleSponsor): string | null {
  return s.hole_banner_logo_url || s.logo_url || null;
}
export function bannerName(s: HoleSponsor): string {
  return (s.hole_banner_name || s.name || "").trim();
}

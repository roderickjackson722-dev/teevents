import { describe, it, expect } from "vitest";
import { holeSponsorsFor, sponsorShowsOnHole, hasHoleBanners } from "./holeSponsors";

const base = { id: "a", name: "Acme", logo_url: null, hole_banner_enabled: true };

describe("hole sponsor banner", () => {
  it("per hole shows on its one hole only", () => {
    const s = { ...base, hole_banner_scope: "per_hole", hole_banner_holes: [7] };
    expect(sponsorShowsOnHole(s, 7)).toBe(true);
    expect(sponsorShowsOnHole(s, 8)).toBe(false);
  });
  it("all 18 shows on every hole", () => {
    const s = { ...base, hole_banner_scope: "all" };
    expect([1, 9, 18].every((h) => sponsorShowsOnHole(s, h))).toBe(true);
  });
  it("specific holes show only on chosen holes", () => {
    const s = { ...base, hole_banner_scope: "holes", hole_banner_holes: [2, 4] };
    expect(sponsorShowsOnHole(s, 4)).toBe(true);
    expect(sponsorShowsOnHole(s, 3)).toBe(false);
  });
  it("respects placement and disabled sponsors", () => {
    const list = [
      { ...base, id: "t", hole_banner_placement: "top" },
      { ...base, id: "b", hole_banner_placement: "bottom" },
      { ...base, id: "off", hole_banner_enabled: false },
    ];
    expect(holeSponsorsFor(list, 1, "bottom").map((s) => s.id)).toEqual(["b"]);
    expect(hasHoleBanners([{ ...base, hole_banner_enabled: false }])).toBe(false);
  });
});

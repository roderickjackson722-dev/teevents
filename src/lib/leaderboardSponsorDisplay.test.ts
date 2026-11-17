import { describe, expect, it } from "vitest";
import { fallbackSponsorDisplayMode, parseSponsorDisplayMode, sponsorPartsForMode } from "./leaderboardSponsorDisplay";

describe("leaderboard Sponsored by display choice", () => {
  it("shows only the dedicated headline image in single-image mode", () => {
    expect(sponsorPartsForMode("single")).toEqual({ headline: true, rotating: false, otherPlacements: false });
  });

  it("shows rotating and placed event sponsor images in multiple-image mode", () => {
    expect(sponsorPartsForMode("multiple")).toEqual({ headline: false, rotating: true, otherPlacements: true });
  });

  it("removes every Sponsored by image area in no-sponsor mode", () => {
    expect(sponsorPartsForMode("none")).toEqual({ headline: false, rotating: false, otherPlacements: false });
  });

  it("keeps the legacy single-image choice when no explicit mode has been saved", () => {
    expect(fallbackSponsorDisplayMode(true, true)).toBe("single");
    expect(fallbackSponsorDisplayMode(false, true)).toBe("multiple");
    expect(fallbackSponsorDisplayMode(false, false)).toBe("none");
    expect(parseSponsorDisplayMode("unexpected")).toBeNull();
  });
});

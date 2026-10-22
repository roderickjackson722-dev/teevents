import { describe, expect, it } from "vitest";
import { showAddonSaleOption } from "./addonSaleVisibility";

describe("page-build sale retirement", () => {
  it("does not offer unpurchased page build-out", () => {
    expect(showAddonSaleOption("custom_event_page", false)).toBe(false);
  });
  it("keeps existing purchased page build-out visible", () => {
    expect(showAddonSaleOption("custom_event_page", true)).toBe(true);
  });
  it.each(["live_leaderboard", "unlimited_manual_entries", "auction_raffle", "branding_sponsor", "custom_domain"])("keeps %s available for sale", key => {
    expect(showAddonSaleOption(key, false)).toBe(true);
  });
});
import { describe, expect, it } from "vitest";
import { normalizeSectionTitles, publicSectionTitle, registrationCopy } from "./publicTabs";

describe("per-tournament public section titles", () => {
  it("keeps existing wording when settings are missing or blank", () => {
    expect(normalizeSectionTitles(null)).toEqual({});
    expect(publicSectionTitle({ registration: "  " }, "registration", "Registration")).toBe("Registration");
    expect(registrationCopy().confirmed).toBe("You're Registered!");
    expect(registrationCopy().tier).toBe("Select Registration Tier");
  });
  it("limits settings to known keys and trims short titles", () => {
    expect(normalizeSectionTitles({ registration: " Tickets ", unknown: "No", schedule: 8 })).toEqual({ registration: "Tickets" });
    expect(publicSectionTitle({ schedule: "x".repeat(100) }, "schedule", "Schedule")).toHaveLength(80);
  });
  it("uses ticket language across actions, prices and confirmations", () => {
    const copy = registrationCopy("Spectator Tickets");
    expect(copy.action).toBe("Get Tickets");
    expect(copy.complete).toBe("Confirm Tickets");
    expect(copy.confirmed).toBe("Tickets Confirmed!");
    expect(copy.fee).toBe("Ticket Price");
    expect(copy.tier).toBe("Select Ticket Type");
    expect(copy.closed).toBe("Spectator Tickets Closed");
  });
});
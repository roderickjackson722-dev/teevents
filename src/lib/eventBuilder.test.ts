import { describe, it, expect } from "vitest";
import { fillBlanks, descriptionText, emptyValues, scheduleText } from "./eventBuilder";

describe("event builder fill-blanks", () => {
  it("never overwrites a value already set, and flags the difference", () => {
    const r = fillBlanks({ event_name: "Spring Classic", primary_color: "#123456", sponsors: [{ name: "Acme", tier: "Gold" }] },
      { event_name: "Spring Classic", primary_color: "#abcdef", course_name: "Pine Hills", sponsors: [{ name: "Other", tier: "" }] }, "flyer");
    expect(r.values.primary_color).toBe("#123456");
    expect(r.values.sponsors).toEqual([{ name: "Acme", tier: "Gold" }]);
    expect(r.values.course_name).toBe("Pine Hills");
    expect(r.sources.primary_color).toBe("already");
    expect(r.sources.course_name).toBe("flyer");
    expect(r.sources.location).toBe("blank");
    expect(r.conflicts.sort()).toEqual(["primary_color", "sponsors"]);
  });
  it("marks typed input as typed", () => {
    expect(fillBlanks(null, { location: "Atlanta, GA" }, "typed").sources.location).toBe("typed");
  });
  it("builds schedule and package text only from given values", () => {
    expect(scheduleText({ registration: "7:00 AM", shotgun: "", lunch: "", awards: "2:00 PM" })).toBe("Registration: 7:00 AM\nAwards: 2:00 PM");
    const v = { ...emptyValues(), tiers: [{ name: "Foursome", price: "600.00", includes: "Cart, lunch" }] };
    expect(descriptionText(v)).toBe("Registration packages:\n• Foursome — $600.00 (Cart, lunch)");
  });
});

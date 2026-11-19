import { describe, it, expect } from "vitest";
import { documentSchema, emptyDocument, showValidityLine } from "./content";

describe("proposal closing validity line", () => {
  it("is removed from new proposals by default", () => {
    expect(showValidityLine(emptyDocument())).toBe(false);
  });

  it("stays removed on saved proposals that never chose it", () => {
    const saved = documentSchema.parse({
      fields: emptyDocument().fields,
      recommended: "Full Service Management",
      intro: "Saved introduction",
      reason: "Saved reason",
      packages: ["Full Service Management"],
    });
    expect(saved.validityLineEnabled).toBeUndefined();
    expect(showValidityLine(saved)).toBe(false);
  });

  it("appears only when the organizer turns it on", () => {
    const d = documentSchema.parse({ ...emptyDocument(), validityLineEnabled: true });
    expect(showValidityLine(d)).toBe(true);
    expect(showValidityLine(documentSchema.parse({ ...d, validityLineEnabled: false }))).toBe(false);
  });
});

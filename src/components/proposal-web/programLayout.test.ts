import { describe, it, expect } from "vitest";
import { emptyDocument, programSubsections, withProgramLayout } from "./content";
describe("program subsection layout", () => {
  it("hides Platform fee and Includes and moves Payment Schedule first", () => {
    const d = withProgramLayout(emptyDocument(), "Full Service Management", { hidden: ["Platform fee", "Includes"], order: ["Payment Schedule"] });
    const subs = programSubsections(d, "Full Service Management");
    expect(subs[0].label).toBe("Payment Schedule");
    expect(subs.filter(s => s.shown).map(s => s.label)).not.toContain("Platform fee");
    expect(subs.filter(s => s.shown).map(s => s.label)).not.toContain("Includes");
  });
});

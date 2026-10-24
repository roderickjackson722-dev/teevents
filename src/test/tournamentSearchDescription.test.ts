import { describe, expect, it } from "vitest";
import { tournamentSearchDescription } from "@/lib/serverMeta";

describe("public event search data formatting", () => {
  it("includes supplied event, course, location and date without changing the input", () => {
    const row = Object.freeze({ title: "Annual Classic", course_name: "Pine Golf Club", location: "Phoenix, AZ", date: "2026-10-24", description: "Supports local youth." });
    const result = tournamentSearchDescription(row);
    for (const value of [row.title, row.course_name, row.location, "October 24, 2026", row.description]) expect(result).toContain(value);
  });
  it("omits invalid or missing dates and unavailable locations", () => {
    const result = tournamentSearchDescription({ title: "Classic", date: "invalid", location: null, course_name: undefined });
    expect(result).not.toMatch(/Invalid Date|null|undefined|invalid/);
  });
  it("deduplicates equivalent course and location data", () => {
    const result = tournamentSearchDescription({ title: "Classic", course_name: "Pine Golf Club", location: "pine golf club" });
    expect(result.match(/pine golf club/gi)).toHaveLength(1);
  });
  it("normalizes markup and bounds long supplied descriptions", () => {
    const result = tournamentSearchDescription({ title: "Classic", description: `<p>Charity &amp; golf</p> ${"Support youth programs. ".repeat(50)}` });
    expect(result).toContain("Charity & golf");
    expect(result).not.toContain("<p>");
    expect(result.length).toBeLessThanOrEqual(300);
  });
});
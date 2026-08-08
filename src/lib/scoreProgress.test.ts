import { describe, it, expect } from "vitest";
import { computeScoreProgress, resolveScore, type ProgressRow } from "./scoreProgress";

const holes = [1, 2, 3];
const rows: ProgressRow[] = [
  { label: "Team A", registrationId: "regA", saved: { 1: 4 } },
  { label: "Team B", registrationId: "regB", saved: {} },
];

describe("score progress (yellow highlight + remaining summary)", () => {
  it("counts every hole entry without a score", () => {
    const p = computeScoreProgress(rows, holes, {});
    expect(p.total).toBe(6);
    expect(p.missing).toHaveLength(5);
    expect(p.complete).toBe(false);
  });

  it("drops a hole from the summary as soon as an unsaved edit is entered", () => {
    const p = computeScoreProgress(rows, holes, { regA: { 2: 5 } });
    expect(p.missing).toHaveLength(4);
    expect(p.missing.some((m) => m.label === "Team A" && m.hole === 2)).toBe(false);
  });

  it("reports complete once every entry resolves to a score", () => {
    const edited = { regA: { 2: 5, 3: 3 }, regB: { 1: 4, 2: 4, 3: 4 } };
    const p = computeScoreProgress(rows, holes, edited);
    expect(p.missing).toEqual([]);
    expect(p.complete).toBe(true);
  });

  it("keeps saved scores highlighted-free after edits are flushed", () => {
    // After saving, edits clear and the saved map carries the value.
    const savedRows: ProgressRow[] = [
      { label: "Team A", registrationId: "regA", saved: { 1: 4, 2: 5, 3: 3 } },
      { label: "Team B", registrationId: "regB", saved: { 1: 4, 2: 4, 3: 4 } },
    ];
    expect(computeScoreProgress(savedRows, holes, {}).complete).toBe(true);
  });

  it("resolveScore prefers the unsaved edit over the saved score", () => {
    expect(resolveScore({ regA: { 1: 6 } }, "regA", 1, { 1: 4 })).toBe(6);
    expect(resolveScore({}, "regA", 1, { 1: 4 })).toBe(4);
    expect(resolveScore({}, "regA", 9, { 1: 4 })).toBeUndefined();
  });
});

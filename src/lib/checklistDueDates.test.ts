import { describe, expect, it } from "vitest";
import { checklistDueDatePatch } from "./checklistDueDates";

describe("shared checklist dates", () => {
  it("saves exactly one due date without changing completion fields", () => {
    expect(checklistDueDatePatch("2026-12-01")).toEqual({ due_date: "2026-12-01" });
  });
  it("clears only the due date", () => {
    expect(checklistDueDatePatch("")).toEqual({ due_date: null });
    expect(() => checklistDueDatePatch("broken")).toThrow("Enter a valid due date.");
  });
});
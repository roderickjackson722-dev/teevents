import { describe, it, expect } from "vitest";
import { applyHoleInput, isAllowedScoreKey } from "./scoreEntryFocus";

describe("applyHoleInput", () => {
  it("single digit into an empty hole sets the score and advances", () => {
    expect(applyHoleInput("4", false)).toEqual({ kind: "set", value: 4, advance: true });
  });

  it("a fast second digit in the same hole stays as a double-digit score and advances", () => {
    expect(applyHoleInput("12", false)).toEqual({ kind: "set", value: 12, advance: true });
  });

  it("returning to a hole that already has a score never auto-advances", () => {
    expect(applyHoleInput("5", true)).toEqual({ kind: "set", value: 5, advance: false });
    expect(applyHoleInput("11", true)).toEqual({ kind: "set", value: 11, advance: false });
  });

  it("backspace (empty string) clears the hole without advancing", () => {
    expect(applyHoleInput("", false)).toEqual({ kind: "clear" });
    expect(applyHoleInput("", true)).toEqual({ kind: "clear" });
  });

  it("rejects non-digits, zero, and scores above 20", () => {
    expect(applyHoleInput("a", false).kind).toBe("invalid");
    expect(applyHoleInput("-3", false).kind).toBe("invalid");
    expect(applyHoleInput("4.5", false).kind).toBe("invalid");
    expect(applyHoleInput("0", false).kind).toBe("invalid");
    expect(applyHoleInput("21", false).kind).toBe("invalid");
  });
});

describe("isAllowedScoreKey", () => {
  it("allows digit keys 0-9", () => {
    for (const d of "0123456789") expect(isAllowedScoreKey(d)).toBe(true);
  });

  it("blocks letters and symbols", () => {
    expect(isAllowedScoreKey("a")).toBe(false);
    expect(isAllowedScoreKey("+")).toBe(false);
    expect(isAllowedScoreKey(".")).toBe(false);
  });

  it("allows Tab, Enter and Backspace", () => {
    expect(isAllowedScoreKey("Tab")).toBe(true);
    expect(isAllowedScoreKey("Enter")).toBe(true);
    expect(isAllowedScoreKey("Backspace")).toBe(true);
  });
});

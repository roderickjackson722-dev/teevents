import { describe, it, expect } from "vitest";
import { scoreMarkKind } from "./scoreMarks";
describe("scoreMarkKind", () => {
  it("classifies against par", () => {
    expect(scoreMarkKind(4, 4)).toBe("par");
    expect(scoreMarkKind(3, 4)).toBe("birdie");
    expect(scoreMarkKind(3, 5)).toBe("eagle");
    expect(scoreMarkKind(2, 5)).toBe("albatross");
    expect(scoreMarkKind(5, 4)).toBe("bogey");
    expect(scoreMarkKind(6, 4)).toBe("double");
    expect(scoreMarkKind(7, 4)).toBe("triple");
    expect(scoreMarkKind(10, 4)).toBe("triple");
  });
  it("shows no mark without a par or score", () => {
    expect(scoreMarkKind(4, null)).toBeNull();
    expect(scoreMarkKind(undefined, 4)).toBeNull();
  });
});

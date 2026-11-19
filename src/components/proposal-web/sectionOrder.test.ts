import { describe, it, expect } from "vitest";
import { emptyDocument, extraPagesOrder, moveItem, documentSchema } from "./content";
describe("proposal ordering", () => {
  it("defaults References before Event Photo Links", () => expect(extraPagesOrder(emptyDocument())).toEqual(["references", "photos"]));
  it("puts References after photos when swapped", () => expect(extraPagesOrder({ ...emptyDocument(), extraPagesOrder: ["photos", "references"] })).toEqual(["photos", "references"]));
  it("saves the chosen order", () => expect(documentSchema.safeParse({ ...emptyDocument(), extraPagesOrder: ["photos", "references"] }).success).toBe(true));
  it("moves a photo up one place", () => expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]));
  it("leaves the first photo when moved up", () => expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]));
});

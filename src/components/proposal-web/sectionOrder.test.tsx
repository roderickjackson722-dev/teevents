import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ProposalPage from "./ProposalPage";
import { emptyDocument, extraPagesOrder, moveItem, documentSchema, proposalSectionOrder, defaultSectionOrder, type SectionOrderId } from "./content";

afterEach(cleanup);
describe("proposal ordering", () => {
  it("defaults References before Event Photo Links", () => expect(extraPagesOrder(emptyDocument())).toEqual(["references", "photos"]));
  it("puts References after photos when swapped", () => expect(extraPagesOrder({ ...emptyDocument(), extraPagesOrder: ["photos", "references"] })).toEqual(["photos", "references"]));
  it("saves the chosen order", () => expect(documentSchema.safeParse({ ...emptyDocument(), extraPagesOrder: ["photos", "references"] }).success).toBe(true));
  it("moves a photo up one place", () => expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]));
  it("leaves the first photo when moved up", () => expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]));
});
describe("proposal section order", () => {
  it("defaults to the standard order with References before Event Photo Links", () => {
    expect(proposalSectionOrder(emptyDocument())).toEqual(["about", "intro", "programs", "details", "addons", "screens", "questions", "sample-event", "references", "photos", "next", "closure", "notice"]);
  });
  it("honors a saved order that moves References above Sample screens", () => {
    const d = { ...emptyDocument(), sectionOrder: ["about", "references", "intro", "programs", "details", "addons", "screens", "questions", "sample-event", "photos", "next", "closure", "notice"] as SectionOrderId[] };
    expect(proposalSectionOrder(d)[1]).toBe("references");
    expect(proposalSectionOrder(d).indexOf("references")).toBeLessThan(proposalSectionOrder(d).indexOf("screens"));
  });
  it("appends sections missing from a partial saved order", () => {
    const d = { ...emptyDocument(), sectionOrder: ["photos", "about"] as SectionOrderId[] };
    const order = proposalSectionOrder(d);
    expect(order.slice(0, 2)).toEqual(["photos", "about"]);
    expect(order).toHaveLength(defaultSectionOrder(d).length);
    expect(order).toContain("closure");
  });
  it("drops unknown or duplicate entries from a saved order", () => {
    const d = { ...emptyDocument(), sectionOrder: ["about", "about", "bogus" as never] as SectionOrderId[] };
    expect(proposalSectionOrder(d).filter(x => x === "about")).toHaveLength(1);
  });
  it("saves a full custom section order", () => {
    const d = { ...emptyDocument(), sectionOrder: [...defaultSectionOrder(emptyDocument())].reverse() };
    expect(documentSchema.safeParse(d).success).toBe(true);
  });
  it("keeps historical extraPagesOrder as the seed when no section order is saved", () => {
    const d = { ...emptyDocument(), extraPagesOrder: ["photos", "references"] as ("photos" | "references")[] };
    const order = proposalSectionOrder(d);
    expect(order.indexOf("photos")).toBeLessThan(order.indexOf("references"));
  });
  it("renders the client page sections in the saved order", () => {
    const d = emptyDocument();
    d.sectionOrder = ["about", "intro", "questions", "programs", "details", "addons", "screens", "sample-event", "references", "photos", "next", "closure", "notice"];
    const { container } = render(<ProposalPage document={d} />);
    const ids = [...container.querySelectorAll(".proposal-doc section[data-track]")].map(el => el.id);
    expect(ids[0]).toBe("cover");
    expect(ids.indexOf("questions")).toBeLessThan(ids.indexOf("programs"));
    expect(ids.indexOf("notice")).toBe(ids.length - 1);
  });
  it("renders the standard order when nothing is saved", () => {
    const { container } = render(<ProposalPage document={emptyDocument()} />);
    const ids = [...container.querySelectorAll(".proposal-doc section[data-track]")].map(el => el.id);
    expect(ids).toEqual(["cover", "about", "intro", "programs", "details", "addons", "questions", "sample-event", "next", "closure", "notice"]);
  });
});

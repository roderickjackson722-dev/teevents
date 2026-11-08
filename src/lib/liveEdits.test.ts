import { describe, expect, it } from "vitest";
import { cleanElementEdits, elementEditsToCss } from "./liveEdits";
import { cleanOverrides } from "./siteStyleOverrides";

describe("live page edits", () => {
  it("keeps on-page edits when a design is saved or undone", () => {
    const o = cleanOverrides({ nav_bg: "#000000", elements: { '[data-tv="hero-title"]': { style: { color: "#ff0000" } } } });
    expect(o.elements?.['[data-tv="hero-title"]']?.style?.color).toBe("#ff0000");
    expect(o.nav_bg).toBe("#000000");
  });

  it("drops unsafe selectors, colors and image links", () => {
    const e = cleanElementEdits({
      "a{}body": { style: { color: "#fff" } },
      "#hero": { style: { color: "red" }, src: "javascript:alert(1)", text: "Hi" },
    });
    expect(Object.keys(e)).toEqual(["#hero"]);
    expect(e["#hero"]).toEqual({ text: "Hi" });
  });

  it("hides a part on the public page but keeps it visible while editing", () => {
    const css = elementEditsToCss({ "#sponsors > :nth-child(1)": { hidden: true } });
    expect(css).toContain(".tv-public:not([data-tv-editing]) #sponsors > :nth-child(1){display:none!important}");
    expect(css).toContain("[data-tv-editing]");
  });

  it("scopes root-level paths to direct children of the page", () => {
    expect(elementEditsToCss({ ":nth-child(2) > :nth-child(1)": { style: { fontSize: 20 } } }))
      .toBe(".tv-public > :nth-child(2) > :nth-child(1){font-size:20px!important}");
  });
});

import { describe, it, expect } from "vitest";
import { cleanOverrides, overridesToCss, pushDesignHistory, snapshotPatch, MAX_DESIGN_HISTORY } from "./siteStyleOverrides";

describe("site style overrides", () => {
  it("drops unknown areas and non-hex values", () => {
    expect(cleanOverrides({ hero_title: "#ffffff", bogus: "#000", btn_text: "red;}" })).toEqual({ hero_title: "#ffffff" });
  });
  it("blank overrides produce no css so the theme is untouched", () => {
    expect(overridesToCss({})).toBe("");
  });
  it("button text override targets banner buttons", () => {
    expect(overridesToCss({ hero_btn_text: "#111111" })).toContain(".tv-design-btn{color:#111111!important}");
  });
});

describe("design undo history", () => {
  const a = { site_primary_color: "#4F6198", site_text_color: "#1F2937" };
  const b = { site_primary_color: "#a4cfea", site_text_color: "#1F2937" };
  it("records the previous design when colors change", () => {
    const h = pushDesignHistory([], a, b);
    expect(h).toHaveLength(1);
    expect(snapshotPatch(h[0]).site_primary_color).toBe("#4F6198");
  });
  it("does not record a save that leaves the design unchanged", () => {
    expect(pushDesignHistory([], a, { ...a })).toHaveLength(0);
  });
  it("keeps at most 20 steps", () => {
    let h: any[] = [];
    for (let i = 0; i < 25; i++) h = pushDesignHistory(h, { site_button_radius: i }, { site_button_radius: i + 1 });
    expect(h).toHaveLength(MAX_DESIGN_HISTORY);
  });
});

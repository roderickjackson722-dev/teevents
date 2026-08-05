import { describe, it, expect } from "vitest";
import {
  PRINT_TARGETS,
  buildPageCss,
  buildPrintDocument,
  clampMargin,
  clampScale,
  countPrintPages,
  evaluateFit,
  printDialogHint,
  CSS_DPI,
} from "./printLayout";

const cart = PRINT_TARGETS.cartsign;
const card = PRINT_TARGETS.scorecard;

const page = (inner: string) => `<div class="print-page">${inner}</div>`;

describe("print targets", () => {
  it("uses the required physical dimensions", () => {
    expect(cart).toMatchObject({ widthIn: 36, heightIn: 8 });
    expect(card).toMatchObject({ widthIn: 8, heightIn: 6 });
  });
});

describe("buildPageCss", () => {
  it("declares the exact page size with zero page margin", () => {
    const css = buildPageCss(cart);
    expect(css).toContain("@page { size: 36in 8in; margin: 0; }");
    expect(css).not.toContain("landscape");
  });

  it("locks the page box to the target size regardless of scale", () => {
    for (const scale of [1, 0.8, 0.5]) {
      const css = buildPageCss(card, { scale });
      expect(css).toContain("@page { size: 8in 6in; margin: 0; }");
      expect(css).toContain("width: 8in;\n    height: 6in;");
      expect(css).toContain("!important");
    }
  });

  it("sizes content as (page - margins) / scale so scaling never grows the page", () => {
    const css = buildPageCss(cart, { scale: 0.5, marginIn: 0.25 });
    // (36 - 0.5) / 0.5 = 71, (8 - 0.5) / 0.5 = 15
    expect(css).toContain("width: 71in !important;");
    expect(css).toContain("height: 15in !important;");
    expect(css).toContain("transform: scale(0.5);");
  });

  it("clamps out-of-range scale and margin values", () => {
    expect(clampScale(5)).toBe(1);
    expect(clampScale(0.1)).toBe(0.5);
    expect(clampScale(undefined)).toBe(1);
    expect(clampMargin(-3, cart)).toBe(0);
    expect(clampMargin(99, card)).toBe(1.5);
  });
});

describe("pagination", () => {
  it("counts one page per printable", () => {
    expect(countPrintPages("")).toBe(0);
    expect(countPrintPages(page("a") + page("b") + page("c"))).toBe(3);
  });

  it("emits a complete standalone document", () => {
    const doc = buildPrintDocument({ title: "Cart Signs", bodyHtml: page("x"), pageCss: buildPageCss(cart) });
    expect(doc).toContain("<!DOCTYPE html>");
    expect(doc).toContain("size: 36in 8in");
    expect(doc).toContain('class="print-page"');
  });
});

describe("evaluateFit", () => {
  const measure = (wIn: number, hIn: number, cwIn: number, chIn: number, pages = 2) => ({
    pageWidthPx: wIn * CSS_DPI,
    pageHeightPx: hIn * CSS_DPI,
    contentWidthPx: cwIn * CSS_DPI,
    contentHeightPx: chIn * CSS_DPI,
    pages,
  });

  it("passes when the page box and content match the target", () => {
    const res = evaluateFit(measure(36, 8, 35.5, 7.5), cart, { scale: 1, marginIn: 0.25 });
    expect(res.ok).toBe(true);
    expect(res.measuredWidthIn).toBe(36);
    expect(res.measuredHeightIn).toBe(8);
    expect(res.pages).toBe(2);
  });

  it("flags a wrong page box", () => {
    const res = evaluateFit(measure(8.5, 11, 8, 10), cart);
    expect(res.ok).toBe(false);
    expect(res.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["width", "height"]));
  });

  it("flags content that overflows the printable area", () => {
    const res = evaluateFit(measure(36, 8, 40, 7.5), cart, { scale: 1, marginIn: 0.25 });
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.code === "pages")).toBe(true);
  });

  it("accounts for scale when measuring content on paper", () => {
    // 71in content at 50% scale = 35.5in on paper -> fits
    const res = evaluateFit(measure(36, 8, 71, 15), cart, { scale: 0.5, marginIn: 0.25 });
    expect(res.contentWidthIn).toBe(35.5);
    expect(res.contentHeightIn).toBe(7.5);
    expect(res.ok).toBe(true);
  });

  it("flags an empty print run", () => {
    const res = evaluateFit(measure(0, 0, 0, 0, 0), card);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.code === "empty")).toBe(true);
  });
});

describe("printDialogHint", () => {
  it("gives browser-specific guidance with the target size", () => {
    expect(printDialogHint(cart, "Chrome")).toContain("36in × 8in");
    expect(printDialogHint(card, "Safari")).toContain("Manage Custom Sizes");
    expect(printDialogHint(card, "Firefox")).toContain("Margins to None");
  });
});

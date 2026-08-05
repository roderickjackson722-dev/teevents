import { test, expect } from "@playwright/test";
import {
  PRINT_TARGETS,
  buildPageCss,
  buildPrintDocument,
  countPrintPages,
  evaluateFit,
  CSS_DPI,
  PDF_DPI,
  type PrintTarget,
  type PrintFitOptions,
} from "../src/components/printables/printLayout";

/**
 * Export / layout regression tests for printables.
 *
 * Renders representative cart signs and team scorecards to PDF in a real
 * browser and asserts the PDF page box (MediaBox) matches the target physical
 * dimensions and that pagination is one page per printable.
 */

const cartSign = (name1: string, name2: string, hole: number) => `
  <div class="print-page">
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid #1a5c38;border-radius:16px;padding:0.3in;text-align:center;">
      <div style="font-size:44px;letter-spacing:6px;text-transform:uppercase;">Bolton Invitational</div>
      <div style="font-size:150px;line-height:1.15;font-weight:bold;">${name1}</div>
      <div style="font-size:150px;line-height:1.15;font-weight:bold;">${name2}</div>
      <div style="font-size:48px;font-weight:600;">Starting Hole: ${hole}</div>
    </div>
  </div>`;

const teamScorecard = (team: string) => {
  const nine = (label: string) => `
    <table style="border-collapse:collapse;width:100%;margin-bottom:6px;">
      <tr>${Array.from({ length: 9 }, (_, i) => `<td style="border:1px solid #999;padding:3px 4px;font-size:9px;text-align:center;">${i + 1}</td>`).join("")}<td style="border:1px solid #999;font-size:9px;">${label}</td></tr>
      <tr>${Array.from({ length: 9 }, () => `<td style="border:1px solid #999;padding:3px 4px;font-size:9px;text-align:center;">4</td>`).join("")}<td style="border:1px solid #999;font-size:9px;">36</td></tr>
      <tr>${Array.from({ length: 9 }, () => `<td style="border:1px solid #999;height:26px;">&nbsp;</td>`).join("")}<td style="border:1px solid #999;">&nbsp;</td></tr>
    </table>`;
  return `
  <div class="print-page">
    <div style="width:100%;height:100%;border:2px solid #1a5c38;border-radius:8px;padding:0.18in;display:flex;flex-direction:column;">
      <div style="font-size:14px;font-weight:bold;">Bolton Invitational &ndash; ${team}</div>
      <div style="font-size:10px;color:#444;">Players: A. One, B. Two, C. Three, D. Four</div>
      <div style="flex:1;">${nine("Out")}${nine("In")}</div>
      <div style="font-size:10px;">Scoring Code: QZG865</div>
    </div>
  </div>`;
};

async function renderPdf(
  browser: import("@playwright/test").Browser,
  bodyHtml: string,
  target: PrintTarget,
  fit: PrintFitOptions = {},
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const html = buildPrintDocument({
    title: `${target.label} regression`,
    bodyHtml,
    pageCss: buildPageCss(target, fit),
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });

  // Measure the rendered boxes exactly as the in-app fit check does.
  const measurement = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll<HTMLElement>(".print-page"));
    const first = pages[0];
    const child = first?.firstElementChild as HTMLElement | undefined;
    return {
      pageWidthPx: first ? first.getBoundingClientRect().width : 0,
      pageHeightPx: first ? first.getBoundingClientRect().height : 0,
      contentWidthPx: child ? child.offsetWidth : 0,
      contentHeightPx: child ? child.offsetHeight : 0,
      pages: pages.length,
    };
  });

  const pdf = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  await context.close();
  return { pdf, measurement };
}

/** Read every /MediaBox from the raw PDF bytes (in PDF points). */
function mediaBoxes(pdf: Buffer): { widthPt: number; heightPt: number }[] {
  const text = pdf.toString("latin1");
  const boxes: { widthPt: number; heightPt: number }[] = [];
  const re = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    boxes.push({ widthPt: Math.abs(+m[3] - +m[1]), heightPt: Math.abs(+m[4] - +m[2]) });
  }
  return boxes;
}

function countPdfPages(pdf: Buffer): number {
  const text = pdf.toString("latin1");
  const counts = [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length;
  return counts;
}

test.describe("printables PDF export layout", () => {
  test("cart signs export at 36in x 8in, one sign per page", async ({ browser }) => {
    const target = PRINT_TARGETS.cartsign;
    const body = cartSign("John Smith", "Mike Davis", 4) + cartSign("Amy Ross", "Lee Park", 4);
    expect(countPrintPages(body)).toBe(2);

    const { pdf, measurement } = await renderPdf(browser, body, target, { scale: 1, marginIn: 0.25 });

    const boxes = mediaBoxes(Buffer.from(pdf));
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    for (const box of boxes) {
      expect(box.widthPt / PDF_DPI).toBeCloseTo(target.widthIn, 1);
      expect(box.heightPt / PDF_DPI).toBeCloseTo(target.heightIn, 1);
    }
    expect(countPdfPages(Buffer.from(pdf))).toBe(2);

    const fit = evaluateFit(measurement, target, { scale: 1, marginIn: 0.25 });
    expect(fit.measuredWidthIn).toBeCloseTo(target.widthIn, 1);
    expect(fit.measuredHeightIn).toBeCloseTo(target.heightIn, 1);
    expect(fit.issues, JSON.stringify(fit.issues)).toHaveLength(0);
    expect(measurement.pageWidthPx).toBeCloseTo(target.widthIn * CSS_DPI, 0);
  });

  test("cart sign scaling keeps the page box fixed", async ({ browser }) => {
    const target = PRINT_TARGETS.cartsign;
    const body = cartSign("Very Long Player Name", "Another Long Name", 12);

    for (const scale of [1, 0.75, 0.5]) {
      const { pdf, measurement } = await renderPdf(browser, body, target, { scale, marginIn: 0.25 });
      for (const box of mediaBoxes(Buffer.from(pdf))) {
        expect(box.widthPt / PDF_DPI).toBeCloseTo(target.widthIn, 1);
        expect(box.heightPt / PDF_DPI).toBeCloseTo(target.heightIn, 1);
      }
      const fit = evaluateFit(measurement, target, { scale, marginIn: 0.25 });
      expect(fit.ok, `scale ${scale}: ${JSON.stringify(fit.issues)}`).toBe(true);
      expect(countPdfPages(Buffer.from(pdf))).toBe(1);
    }
  });

  test("team scorecards export at 11in x 8.5in (landscape), one card per team", async ({ browser }) => {
    const target = PRINT_TARGETS.scorecard;
    const body = ["Team Eagle", "Team Birdie", "Team Bogey"].map(teamScorecard).join("");
    expect(countPrintPages(body)).toBe(3);

    const { pdf, measurement } = await renderPdf(browser, body, target, { scale: 1, marginIn: 0.25 });
    for (const box of mediaBoxes(Buffer.from(pdf))) {
      expect(box.widthPt / PDF_DPI).toBeCloseTo(target.widthIn, 1);
      expect(box.heightPt / PDF_DPI).toBeCloseTo(target.heightIn, 1);
    }
    expect(countPdfPages(Buffer.from(pdf))).toBe(3);

    const fit = evaluateFit(measurement, target, { scale: 1, marginIn: 0.25 });
    expect(fit.issues, JSON.stringify(fit.issues)).toHaveLength(0);
  });

  test("zero-margin setting still yields the exact page size", async ({ browser }) => {
    const target = PRINT_TARGETS.scorecard;
    const { pdf } = await renderPdf(browser, teamScorecard("Team Ace"), target, { scale: 1, marginIn: 0 });
    for (const box of mediaBoxes(Buffer.from(pdf))) {
      expect(box.widthPt / PDF_DPI).toBeCloseTo(target.widthIn, 1);
      expect(box.heightPt / PDF_DPI).toBeCloseTo(target.heightIn, 1);
    }
  });
});

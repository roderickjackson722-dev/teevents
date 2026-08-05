/**
 * Pure, testable print-layout helpers for printables (cart signs + scorecards).
 *
 * Everything here is framework-free so it can be unit tested in vitest and
 * reused by the Playwright PDF regression test.
 */

export type PrintTargetId = "cartsign" | "scorecard";

export interface PrintTarget {
  id: PrintTargetId;
  label: string;
  /** Page width in inches */
  widthIn: number;
  /** Page height in inches */
  heightIn: number;
}

export const PRINT_TARGETS: Record<PrintTargetId, PrintTarget> = {
  cartsign: { id: "cartsign", label: "Cart sign", widthIn: 36, heightIn: 8 },
  scorecard: { id: "scorecard", label: "Scorecard", widthIn: 8, heightIn: 6 },
};

/** CSS pixels per inch used by print engines for absolute units. */
export const CSS_DPI = 96;
/** PDF points per inch. */
export const PDF_DPI = 72;

export interface PrintFitOptions {
  /** Content scale factor (0.5 – 1). 1 = no shrink. */
  scale?: number;
  /** Page margin in inches, applied on all four sides. */
  marginIn?: number;
}

export const DEFAULT_PRINT_SCALE = 1;
export const DEFAULT_PRINT_MARGIN_IN = 0.25;

export const PRINT_SCALE_CHOICES = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5];
export const PRINT_MARGIN_CHOICES = [0, 0.125, 0.25, 0.375, 0.5, 0.75, 1];

export function clampScale(scale: number | undefined): number {
  if (!Number.isFinite(scale as number)) return DEFAULT_PRINT_SCALE;
  return Math.min(1, Math.max(0.5, scale as number));
}

export function clampMargin(marginIn: number | undefined, target: PrintTarget): number {
  if (!Number.isFinite(marginIn as number)) return DEFAULT_PRINT_MARGIN_IN;
  const max = Math.min(target.widthIn, target.heightIn) / 4;
  return Math.min(max, Math.max(0, marginIn as number));
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Page CSS for a printable target.
 *
 * Notes:
 * - No `landscape` keyword: combining it with explicit dimensions makes Chrome
 *   swap/inflate the page box, which is what blew up the cart sign output.
 * - Content lives in `.print-page`; the direct child is laid out at
 *   (page - margins) / scale and then transform-scaled down, so shrinking never
 *   changes the page box.
 */
export function buildPageCss(target: PrintTarget, options: PrintFitOptions = {}): string {
  const scale = clampScale(options.scale);
  const margin = clampMargin(options.marginIn, target);
  const contentW = round((target.widthIn - margin * 2) / scale);
  const contentH = round((target.heightIn - margin * 2) / scale);

  return `
  @page { size: ${target.widthIn}in ${target.heightIn}in; margin: 0; }
  html, body { width: ${target.widthIn}in; margin: 0; padding: 0; }
  .print-page {
    width: ${target.widthIn}in;
    height: ${target.heightIn}in;
    padding: ${margin}in;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
  }
  .print-page > * {
    width: ${contentW}in;
    height: ${contentH}in;
    box-sizing: border-box;
    transform: scale(${scale});
    transform-origin: top left;
  }
`;
}

/** Convenience wrappers matching the two printables. */
export const cartSignPageCss = (options?: PrintFitOptions) => buildPageCss(PRINT_TARGETS.cartsign, options);
export const scorecardPageCss = (options?: PrintFitOptions) => buildPageCss(PRINT_TARGETS.scorecard, options);

/** How many pages a printable body will produce (one `.print-page` per page). */
export function countPrintPages(bodyHtml: string): number {
  const matches = bodyHtml.match(/class="print-page"/g);
  return matches ? matches.length : 0;
}

export interface FitIssue {
  code: "width" | "height" | "pages" | "empty";
  message: string;
}

export interface FitResult {
  target: PrintTarget;
  scale: number;
  marginIn: number;
  /** Measured page-box size in inches. */
  measuredWidthIn: number;
  measuredHeightIn: number;
  /** Measured content size of the scaled child, in inches on paper. */
  contentWidthIn: number;
  contentHeightIn: number;
  pages: number;
  ok: boolean;
  issues: FitIssue[];
}

export interface FitMeasurement {
  pageWidthPx: number;
  pageHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
  pages: number;
}

/** Tolerance in inches for page-box comparisons (sub-pixel rounding). */
export const FIT_TOLERANCE_IN = 0.02;

export function evaluateFit(
  measurement: FitMeasurement,
  target: PrintTarget,
  options: PrintFitOptions = {},
): FitResult {
  const scale = clampScale(options.scale);
  const marginIn = clampMargin(options.marginIn, target);
  const toIn = (px: number) => round(px / CSS_DPI);

  const measuredWidthIn = toIn(measurement.pageWidthPx);
  const measuredHeightIn = toIn(measurement.pageHeightPx);
  const contentWidthIn = round(toIn(measurement.contentWidthPx) * scale);
  const contentHeightIn = round(toIn(measurement.contentHeightPx) * scale);

  const issues: FitIssue[] = [];
  if (measurement.pages < 1) {
    issues.push({ code: "empty", message: "Nothing to print — no pages were produced." });
  }
  if (Math.abs(measuredWidthIn - target.widthIn) > FIT_TOLERANCE_IN) {
    issues.push({
      code: "width",
      message: `Page width is ${measuredWidthIn}in but should be ${target.widthIn}in.`,
    });
  }
  if (Math.abs(measuredHeightIn - target.heightIn) > FIT_TOLERANCE_IN) {
    issues.push({
      code: "height",
      message: `Page height is ${measuredHeightIn}in but should be ${target.heightIn}in.`,
    });
  }
  const maxContentW = target.widthIn - marginIn * 2 + FIT_TOLERANCE_IN;
  const maxContentH = target.heightIn - marginIn * 2 + FIT_TOLERANCE_IN;
  if (contentWidthIn > maxContentW || contentHeightIn > maxContentH) {
    issues.push({
      code: "pages",
      message: `Content is ${contentWidthIn}in × ${contentHeightIn}in and overflows the ${round(maxContentW)}in × ${round(maxContentH)}in printable area. Lower the PDF scale.`,
    });
  }

  return {
    target,
    scale,
    marginIn,
    measuredWidthIn,
    measuredHeightIn,
    contentWidthIn,
    contentHeightIn,
    pages: measurement.pages,
    ok: issues.length === 0,
    issues,
  };
}

/** Full standalone HTML document for a printable (used for print, PDF and tests). */
export function buildPrintDocument(opts: {
  title: string;
  bodyHtml: string;
  pageCss: string;
  fontImport?: string;
}): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${opts.title}</title>
    ${opts.fontImport ? `<link href="${opts.fontImport}" rel="stylesheet" />` : ""}
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { font-family: 'Georgia', serif; color: #1a1a1a; }
      ${opts.pageCss}
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>${opts.bodyHtml}</body>
</html>`;
}

/**
 * Measure a printable off-screen in the current browser and validate the fit.
 * Returns null when called outside a browser.
 */
export async function runFitCheck(
  bodyHtml: string,
  target: PrintTarget,
  options: PrintFitOptions = {},
): Promise<FitResult | null> {
  if (typeof document === "undefined") return null;
  const doc = buildPrintDocument({
    title: "Fit check",
    bodyHtml,
    pageCss: buildPageCss(target, options),
  });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${target.widthIn * CSS_DPI + 200}px`;
  iframe.style.height = `${target.heightIn * CSS_DPI + 200}px`;
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    if (!idoc) return null;
    idoc.open();
    idoc.write(doc);
    idoc.close();
    // let layout settle
    await new Promise((r) => setTimeout(r, 120));

    const pages = Array.from(idoc.querySelectorAll<HTMLElement>(".print-page"));
    const first = pages[0];
    const child = first?.firstElementChild as HTMLElement | undefined;
    const measurement: FitMeasurement = {
      pageWidthPx: first ? first.getBoundingClientRect().width : 0,
      pageHeightPx: first ? first.getBoundingClientRect().height : 0,
      contentWidthPx: child ? child.offsetWidth : 0,
      contentHeightPx: child ? child.offsetHeight : 0,
      pages: pages.length,
    };
    return evaluateFit(measurement, target, options);
  } finally {
    iframe.remove();
  }
}

/** Short human label for the current browser, used in fit-check reporting. */
export function browserLabel(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "this browser";
}

/** Browser-specific print guidance so organizers get the right dialog settings. */
export function printDialogHint(target: PrintTarget, browser: string = browserLabel()): string {
  const size = `${target.widthIn}in × ${target.heightIn}in`;
  switch (browser) {
    case "Firefox":
      return `Firefox: in the print dialog set Scale to 100% and Margins to None, and confirm the paper size reads ${size}.`;
    case "Safari":
      return `Safari: choose "Manage Custom Sizes" and add a ${size} paper size, then set Scale to 100%.`;
    default:
      return `${browser}: set Destination to "Save as PDF", Paper size to the ${size} custom size (or "Fit to printable area" off), Margins to None and Scale to 100%.`;
  }
}

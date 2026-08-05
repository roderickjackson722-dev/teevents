import { cartSignPageCss, scorecardPageCss, type PrintFitOptions } from "./printLayout";

export function openPrintWindow(title: string, bodyHtml: string, fontImport?: string, pageCss?: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${fontImport ? `<link href="${fontImport}" rel="stylesheet" />` : ""}
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; color: #1a1a1a; }
          ${pageCss || ""}
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

export function downloadHtmlAsPdf(title: string, bodyHtml: string, fontImport?: string, pageCss?: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${fontImport ? `<link href="${fontImport}" rel="stylesheet" />` : ""}
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { font-family: 'Georgia', serif; color: #1a1a1a; padding: 0; margin: 0; }
          .pdf-body { padding: 40px; }
          ${pageCss || ""}
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pdf-body { padding: 0; }
            .pdf-hint { display: none; }
          }
          .pdf-hint {
            background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px;
            padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #92400e;
          }
          .pdf-hint strong { color: #78350f; }
        </style>
      </head>
      <body>
        <div class="pdf-body">
          <div class="pdf-hint">
            <strong>💡 Save as PDF:</strong> In the print dialog, change the destination to <strong>"Save as PDF"</strong>, set margins to <strong>None</strong> and scale to <strong>100%</strong>.
          </div>
          ${bodyHtml}
        </div>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

/** Page CSS for oversized cart signs: 36in wide x 8in tall (default scale/margin) */
export const CART_SIGN_PAGE_CSS = cartSignPageCss();

/** Page CSS for team scorecards: 8in wide x 6in tall (default scale/margin) */
export const SCORECARD_PAGE_CSS = scorecardPageCss();

/** Cart sign page CSS honoring the organizer's PDF scale / margin settings */
export const cartSignCss = (options?: PrintFitOptions) => cartSignPageCss(options);
/** Scorecard page CSS honoring the organizer's PDF scale / margin settings */
export const scorecardCss = (options?: PrintFitOptions) => scorecardPageCss(options);

/**
 * Logo <img> for print HTML with a graceful fallback: if the image fails to
 * load we reveal a bordered "LOGO UNAVAILABLE" placeholder in its place.
 */
export function printLogoHtml(logo: string | null | undefined, opts: { heightCss: string; invert?: boolean; color?: string }): string {
  if (!logo) return "";
  const invert = opts.invert ? "filter:brightness(0) invert(1);" : "";
  const color = opts.color || "#999";
  return `<span style="display:inline-flex;align-items:center;">
    <img src="${logo}" alt="" style="height:${opts.heightCss};object-fit:contain;${invert}"
      onerror="this.style.display='none';var p=this.nextElementSibling;if(p)p.style.display='inline-flex';" />
    <span style="display:none;align-items:center;justify-content:center;height:${opts.heightCss};padding:0 0.08in;border:1px dashed ${color};border-radius:6px;color:${color};font-size:0.14in;letter-spacing:1px;text-transform:uppercase;">Logo unavailable</span>
  </span>`;
}

/** Google Fonts import URL for non-system fonts */
export function getFontImport(fontId: string | null): string | undefined {
  const imports: Record<string, string> = {
    playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
    roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  };
  return imports[fontId || ""] || undefined;
}

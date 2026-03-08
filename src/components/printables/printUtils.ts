export function openPrintWindow(title: string, bodyHtml: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; color: #1a1a1a; }
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

export function downloadHtmlAsPdf(title: string, bodyHtml: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; color: #1a1a1a; padding: 40px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; }
          }
          .pdf-hint {
            background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px;
            padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #92400e;
          }
          .pdf-hint strong { color: #78350f; }
          @media print { .pdf-hint { display: none; } }
        </style>
      </head>
      <body>
        <div class="pdf-hint">
          <strong>💡 Save as PDF:</strong> In the print dialog, change the destination to <strong>"Save as PDF"</strong> to download a digital copy.
        </div>
        ${bodyHtml}
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

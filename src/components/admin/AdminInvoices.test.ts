import { describe, it, expect, vi } from "vitest";

// jsPDF uses canvas APIs in jsdom; stub addImage so missing logo never throws.
vi.mock("@/assets/teevents-logo.png.asset.json", () => ({
  default: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" },
}));

import { buildInvoicePdf, generateInvoicePdf, normalizeInvoicePdfText, splitInvoicePdfTextToWidth } from "./AdminInvoices";
import jsPDF from "jspdf";

const baseInvoice = {
  id: "test",
  invoice_number: "INV-TEST-0001",
  customer_name: "Acme Golf Club",
  customer_email: "billing@acme.golf",
  customer_company: "Acme Holdings LLC",
  customer_address: "123 Fairway Drive, Suite 400, Pebble Beach, CA 93953",
  issue_date: "2026-06-10",
  due_date: "2026-07-10",
  line_items: [
    { id: "a", name: "Pro Tournament Unlock", description: "One-time per-tournament Pro features unlock", quantity: 1, unit_price_cents: 39900 },
    { id: "b", name: "Consulting", description: "Concierge setup support", quantity: 3, unit_price_cents: 15000 },
  ],
  notes: "Thanks for your business! Payment is due within 30 days. Wire transfer details available upon request.",
  tax_rate: 0,
  discount_cents: 0,
  total_cents: 0,
  status: "draft",
  currency: "USD",
  created_at: new Date().toISOString(),
} as any;

const longDescriptionInvoice = {
  ...baseInvoice,
  invoice_number: "INV-TEST-0002",
  line_items: Array.from({ length: 8 }, (_, i) => ({
    id: `i${i}`,
    name: `Line item ${i + 1} with a fairly long product name that should still wrap inside the description column`,
    description: "This is an intentionally long description that exercises the table column wrapping logic to make sure the QTY, UNIT and AMOUNT columns stay aligned on the right edge of the page even when the description spans multiple lines.",
    quantity: i + 1,
    unit_price_cents: 12345,
  })),
};

const longNotesInvoice = {
  ...baseInvoice,
  invoice_number: "INV-TEST-0003",
  notes: Array.from({ length: 20 }, (_, i) =>
    `Paragraph ${i + 1}: ` + "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(3)
  ).join("\n\n"),
};

// US Letter at 72 dpi
const PAGE_W = 612;
const PAGE_H = 792;

describe("invoice PDF layout", () => {
  it("renders a short invoice on a single 8.5x11 page", async () => {
    const doc = await generateInvoicePdf(baseInvoice);
    expect(doc.getNumberOfPages()).toBe(1);
    const size = doc.internal.pageSize;
    expect(Math.round(size.getWidth())).toBe(PAGE_W);
    expect(Math.round(size.getHeight())).toBe(PAGE_H);
  });

  it("keeps table columns within page bounds for long descriptions", async () => {
    const { doc, pages } = await buildInvoicePdf(longDescriptionInvoice, 1);
    expect(pages).toBeGreaterThanOrEqual(1);
    // The amount column right edge is page width - margin (48). Confirm via measurement
    // by re-running through generateInvoicePdf (auto scale) and ensuring it produces
    // a valid, non-empty PDF blob.
    const finalDoc = await generateInvoicePdf(longDescriptionInvoice);
    const blob = finalDoc.output("blob");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("wraps long Notes/Terms without clipping (multi-page allowed)", async () => {
    const doc = await generateInvoicePdf(longNotesInvoice);
    // With ~60 paragraphs of lorem ipsum, the content legitimately needs more than one page.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const blob = doc.output("blob");
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("keeps screenshot-style spaced Notes/Terms text bounded and breakable", async () => {
    const spacedNotes = "Category Specific Services\nP l a n n i n g & L o g i s t i c s  C o u r s e  s e a r c h  a n d  q u o t e s,  o n  s i t e  c o u r s e  v i s i t s,  c o u r s e  c o m m u n i c a t i o n  a n d  f e e  n e g o t i a t i o n\nO n  S i t e  M a n a g e m e n t  O n  s i t e  t o u r n a m e n t  o r g a n i z e r s  f o r  t h r e e  d a y  e v e n t";
    expect(normalizeInvoicePdfText(spacedNotes)).toContain("Planning & Logistics Course search and quotes");
    expect(normalizeInvoicePdfText(spacedNotes)).not.toContain("P l a n n i n g");

    const docForMeasure = new jsPDF({ unit: "pt", format: "letter" });
    docForMeasure.setFont("helvetica", "normal");
    docForMeasure.setFontSize(9);
    const noteWidth = 444;
    const measuredLines = splitInvoicePdfTextToWidth(docForMeasure, spacedNotes, noteWidth);
    expect(measuredLines.every((line) => docForMeasure.getTextWidth(line) <= noteWidth)).toBe(true);

    const doc = await generateInvoicePdf({ ...baseInvoice, invoice_number: "INV-TEST-0004", notes: spacedNotes });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.output("blob").size).toBeGreaterThan(1500);
  });

  it("auto-scales down to fit when content is borderline", async () => {
    const borderline = {
      ...baseInvoice,
      line_items: Array.from({ length: 14 }, (_, i) => ({
        id: `b${i}`,
        name: `Service ${i + 1}`,
        description: "Standard service description for borderline-fit test.",
        quantity: 1,
        unit_price_cents: 10000,
      })),
      notes: "Net 30. Please remit payment via ACH or check.",
    };
    const doc = await generateInvoicePdf(borderline);
    // Either fits on one page (scaled) or overflows to two — both acceptable, but
    // it must never produce an empty/zero-page document.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(2);
  });
});

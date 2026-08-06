import { jsPDF } from "jspdf";

export interface TaxReceiptData {
  orgName: string;
  orgAddress: string;
  orgEin: string;
  receiptDate: string;
  receiptNumber: string;
  sponsorName: string;
  sponsorAddress: string;
  amount: string;
  tournamentName: string;
  signatureName?: string;
  signatureTitle?: string;
}

/** Sequential-ish, human-readable receipt number: TR-2026-AB12CD */
export function buildReceiptNumber(seed?: string | null): string {
  const year = new Date().getFullYear();
  const tail = (seed || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `TR-${year}-${tail}`;
}

/** Renders an IRS-style tax donation receipt and returns base64 (no data: prefix). */
export function renderTaxReceiptBase64(d: TaxReceiptData): string {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 56;
  let y = 64;
  const line = (text: string, size = 11, style: "normal" | "bold" = "normal", gap = 16) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, 500);
    doc.text(wrapped, left, y);
    y += gap * wrapped.length;
  };

  line(d.orgName, 15, "bold", 20);
  if (d.orgAddress) line(d.orgAddress, 10.5, "normal", 14);
  if (d.orgEin) line(`EIN: ${d.orgEin}`, 10.5, "normal", 14);

  y += 14;
  doc.setDrawColor(200);
  doc.line(left, y, left + 500, y);
  y += 30;

  line("TAX DONATION RECEIPT", 14, "bold", 26);

  line(`Date: ${d.receiptDate}`, 11, "normal", 16);
  line(`Receipt Number: ${d.receiptNumber}`, 11, "normal", 24);

  line(`Donor Name: ${d.sponsorName}`, 11, "normal", 16);
  line(`Donor Address: ${d.sponsorAddress || "—"}`, 11, "normal", 24);

  line(`Contribution Amount: ${d.amount}`, 12, "bold", 28);

  line(
    `This donation was made to support the ${d.tournamentName} event. No goods or services were provided in exchange for this contribution.`,
    11,
    "normal",
    15,
  );
  y += 10;
  line(
    `${d.orgName} is a 501(c)(3) nonprofit organization. This contribution is tax-deductible to the extent allowed by law.`,
    11,
    "normal",
    15,
  );
  y += 10;
  line("Thank you for your generous support!", 11, "normal", 40);

  doc.setDrawColor(120);
  doc.line(left, y, left + 240, y);
  y += 16;
  line("Authorized Signature", 9.5, "normal", 14);
  if (d.signatureName) line(d.signatureName, 10.5, "normal", 14);
  if (d.signatureTitle) line(d.signatureTitle, 10.5, "normal", 14);

  const dataUri = doc.output("datauristring");
  return dataUri.slice(dataUri.indexOf(",") + 1);
}

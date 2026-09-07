import { useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, FileText } from "lucide-react";
import { formatTournamentDate } from "@/lib/formatDate";

const fmtMoney = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

type Item = { description: string; quantity: number; unit_price_cents: number };

const SAMPLE_ITEMS: Item[] = [
  { description: "Annual SaaS platform subscription — league & tournament management (unlimited staff users, unlimited participants)", quantity: 1, unit_price_cents: 1200000 },
  { description: "Implementation & configuration — sports, seasons, facilities, registration forms, fee schedules, branding", quantity: 1, unit_price_cents: 350000 },
  { description: "Staff training & onboarding (4 live webinar sessions, recorded library, written guides)", quantity: 4, unit_price_cents: 45000 },
  { description: "Historical data migration (participant, roster, and season records — CSV import & validation)", quantity: 1, unit_price_cents: 250000 },
  { description: "Ongoing technical support & maintenance — 8:00am–6:00pm ET, 1-hour critical response (12 months)", quantity: 12, unit_price_cents: 25000 },
];

const SAMPLE_TERMS =
  "Net 30 from invoice date. Annual subscription billed in advance; implementation and migration billed upon completion of configuration acceptance.";

const SAMPLE_NOTES =
  "SAMPLE DOCUMENT — provided for illustrative purposes with the TeeVents response to Arlington County, Virginia Solicitation N1487 (League Management Platform). Amounts shown are representative of a typical county-scale deployment and do not constitute a price offer or a request for payment.";

const SAMPLE_INCLUDED: { category: string; description: string }[] = [
  { category: "Registration & Programs", description: "Online individual and team registration, configurable forms, waivers and consents, waitlist management, fee and discount configuration." },
  { category: "Payments", description: "PCI DSS compliant hosted checkout through a Level 1 certified processor, full and partial refunds, receipting, transaction ledger." },
  { category: "Scheduling & Teams", description: "Season and game scheduling, facility records with double-booking prevention, drag-to-move calendar, team and coach administration." },
  { category: "Communication", description: "Bulk email and SMS to participants, coaches, parents and players, scheduled sends, full delivery history." },
  { category: "Reporting & Security", description: "CSV and PDF exports, financial reporting, role-based access control, row-level data isolation, encryption in transit and at rest." },
];

export default function SampleInvoicePanel() {
  const [receiverName, setReceiverName] = useState("Arlington County Government");
  const [receiverDept, setReceiverDept] = useState("Department of Parks & Recreation — Procurement Division");
  const [receiverAttn, setReceiverAttn] = useState("Attn: Contract Administrator");
  const [receiverEmail, setReceiverEmail] = useState("procurement@arlingtonva.us");

  const invoiceNumber = "SAMPLE-N1487-001";
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const total = SAMPLE_ITEMS.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);

  const watermark = (doc: jsPDF) => {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.saveGraphicsState();
      // GState exists at runtime in jsPDF
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));

      doc.setFont("helvetica", "bold");
      doc.setFontSize(96);
      doc.setTextColor(120, 120, 120);
      doc.text("SAMPLE", 306, 430, { align: "center", angle: 32 } as any);
      doc.setFontSize(24);
      doc.text("NOT A REQUEST FOR PAYMENT", 306, 500, { align: "center", angle: 32 } as any);
      doc.restoreGraphicsState();
      doc.setTextColor(0, 0, 0);
    }
  };

  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const M = 48;
    const W = 612;
    let y = M;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SAMPLE INVOICE", M, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TeeVents Golf Management", W - M, y - 4, { align: "right" });
    doc.text("2651 Satellite Blvd #54, Duluth, GA 30096", W - M, y + 10, { align: "right" });
    doc.text("info@teevents.golf", W - M, y + 22, { align: "right" });
    y += 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SPECIMEN — FOR RFP ILLUSTRATION ONLY. NOT A REQUEST FOR PAYMENT.", M, y);
    y += 12;
    doc.setDrawColor(200);
    doc.line(M, y, W - M, y);
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Invoice #: ${invoiceNumber}`, M, y);
    doc.text(`Date: ${formatTournamentDate(invoiceDate)}`, W - M, y, { align: "right" });
    y += 20;

    doc.text("Bill To:", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    for (const l of [receiverName, receiverDept, receiverAttn, receiverEmail].filter(Boolean)) {
      doc.text(l, M, y);
      y += 12;
    }
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Program:", M, y);
    doc.setFont("helvetica", "normal");
    doc.text("County Youth & Adult League Management Platform", M + 60, y);
    y += 20;

    doc.setFillColor(240, 240, 240);
    doc.rect(M, y, W - 2 * M, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Description", M + 6, y + 12);
    doc.text("Qty", W - M - 160, y + 12, { align: "right" });
    doc.text("Unit", W - M - 90, y + 12, { align: "right" });
    doc.text("Amount", W - M - 6, y + 12, { align: "right" });
    y += 24;
    doc.setFont("helvetica", "normal");
    for (const it of SAMPLE_ITEMS) {
      if (y > 690) { doc.addPage(); y = M; }
      const lines = doc.splitTextToSize(it.description, W - 2 * M - 190);
      doc.text(lines, M + 6, y);
      doc.text(String(it.quantity), W - M - 160, y, { align: "right" });
      doc.text(fmtMoney(it.unit_price_cents), W - M - 90, y, { align: "right" });
      doc.text(fmtMoney(it.quantity * it.unit_price_cents), W - M - 6, y, { align: "right" });
      y += Math.max(14, lines.length * 12) + 6;
    }
    doc.line(M, y, W - M, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text("Total (Sample):", W - M - 100, y, { align: "right" });
    doc.text(fmtMoney(total), W - M - 6, y, { align: "right" });
    y += 26;

    if (y > 620) { doc.addPage(); y = M; }
    doc.setFontSize(12);
    doc.text("Services Included", M, y);
    y += 14;
    doc.setFontSize(9);
    for (const b of SAMPLE_INCLUDED) {
      if (y > 720) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold");
      doc.text(b.category, M, y);
      y += 11;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(b.description, W - 2 * M);
      doc.text(lines, M, y);
      y += lines.length * 11 + 6;
    }

    if (y > 690) { doc.addPage(); y = M; }
    y += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Terms", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let t = doc.splitTextToSize(SAMPLE_TERMS, W - 2 * M);
    doc.text(t, M, y);
    y += t.length * 11 + 12;

    if (y > 700) { doc.addPage(); y = M; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Notice", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    t = doc.splitTextToSize(SAMPLE_NOTES, W - 2 * M);
    doc.text(t, M, y);

    watermark(doc);
    return doc;
  };

  const download = () => buildPdf().save(`${invoiceNumber}.pdf`);
  const print = () => {
    const url = buildPdf().output("bloburl") as unknown as string;
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 400);
  };

  return (
    <Card className="p-4 space-y-4 border-dashed">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Sample Invoice (RFP Specimen)
            <Badge variant="secondary">SAMPLE</Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            A watermarked specimen invoice for the Arlington County, Virginia N1487 submission. Edit the
            recipient below, then download or print. Nothing here is saved or sent.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={print}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button onClick={download}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Recipient name</Label><Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} /></div>
        <div><Label>Department / division</Label><Input value={receiverDept} onChange={(e) => setReceiverDept(e.target.value)} /></div>
        <div><Label>Attention line</Label><Input value={receiverAttn} onChange={(e) => setReceiverAttn(e.target.value)} /></div>
        <div><Label>Recipient email</Label><Input value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} /></div>
      </div>

      {/* On-screen preview */}
      <div className="relative overflow-hidden bg-white text-black border rounded p-6 text-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="text-6xl md:text-7xl font-extrabold text-gray-400/25 -rotate-[28deg] select-none">
            SAMPLE
          </span>
        </div>
        <div className="relative space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">SAMPLE INVOICE</h1>
              <div className="text-[10px] font-semibold tracking-wide mt-1">
                SPECIMEN — FOR RFP ILLUSTRATION ONLY. NOT A REQUEST FOR PAYMENT.
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-semibold">TeeVents Golf Management</div>
              <div>2651 Satellite Blvd #54, Duluth, GA 30096</div>
              <div>info@teevents.golf</div>
            </div>
          </div>
          <div className="flex justify-between text-xs border-t pt-3">
            <div>
              <div className="font-semibold">Bill To:</div>
              <div>{receiverName}</div>
              {receiverDept && <div>{receiverDept}</div>}
              {receiverAttn && <div>{receiverAttn}</div>}
              {receiverEmail && <div>{receiverEmail}</div>}
            </div>
            <div className="text-right">
              <div><span className="font-semibold">Invoice #:</span> {invoiceNumber}</div>
              <div><span className="font-semibold">Date:</span> {formatTournamentDate(invoiceDate)}</div>
            </div>
          </div>
          <div className="text-xs">
            <span className="font-semibold">Program:</span> County Youth &amp; Adult League Management Platform
          </div>
          <table className="w-full text-xs border-t">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2 w-12">Qty</th>
                <th className="text-right p-2 w-24">Unit</th>
                <th className="text-right p-2 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ITEMS.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{it.description}</td>
                  <td className="p-2 text-right">{it.quantity}</td>
                  <td className="p-2 text-right">{fmtMoney(it.unit_price_cents)}</td>
                  <td className="p-2 text-right">{fmtMoney(it.quantity * it.unit_price_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold">
                <td colSpan={3} className="p-2 text-right">Total (Sample)</td>
                <td className="p-2 text-right">{fmtMoney(total)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="text-xs">
            <div className="font-semibold mb-1">Services Included</div>
            {SAMPLE_INCLUDED.map((b, i) => (
              <div key={i} className="mb-2">
                <div className="font-semibold">{b.category}</div>
                <div>{b.description}</div>
              </div>
            ))}
          </div>
          <div className="text-xs"><span className="font-semibold">Payment Terms:</span> {SAMPLE_TERMS}</div>
          <div className="text-xs"><span className="font-semibold">Notice:</span> {SAMPLE_NOTES}</div>
        </div>
      </div>
    </Card>
  );
}

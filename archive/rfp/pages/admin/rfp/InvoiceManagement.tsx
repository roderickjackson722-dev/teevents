import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Plus, Printer, RefreshCw, Trash2, X } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/formatCurrency";
import { openPrintWindow } from "@/components/printables/printUtils";
import {
  listInvoices,
  saveInvoice,
  deleteInvoice,
  type RfpInvoice,
  type RfpInvoiceLine,
} from "@/lib/rfp.functions";

const COMPANY = {
  name: "TeeVents Golf Management",
  address: "633 E. Canyon Rock Rd., San Tan Valley, AZ 85143",
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyLine = (): RfpInvoiceLine => ({
  service_type: "",
  service_date: today(),
  duration: "",
  rate_cents: 0,
  total_cents: 0,
});

interface Draft {
  id?: string;
  invoice_number: string;
  po_reference: string;
  invoice_date: string;
  bill_to: string;
  payment_terms: string;
  notes: string;
  status: string;
  line_items: RfpInvoiceLine[];
}

const emptyDraft = (nextNumber: string): Draft => ({
  invoice_number: nextNumber,
  po_reference: "",
  invoice_date: today(),
  bill_to: "Arlington County, VA",
  payment_terms: "Net 30",
  notes: "",
  status: "draft",
  line_items: [emptyLine()],
});

const fmtDate = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${String(y).slice(2)}`;
};

const dollarsToCents = (v: string) => Math.round((parseFloat(v.replace(/[^0-9.\-]/g, "")) || 0) * 100);
const centsToDollars = (c: number) => (c / 100).toFixed(2);

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<RfpInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<RfpInvoice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listInvoices();
      setInvoices(res.invoices || []);
    } catch (e: any) {
      toast.error(e?.message || "Could not load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const nextNumber = useMemo(() => {
    const nums = invoices
      .map((i) => parseInt(String(i.invoice_number).replace(/\D/g, ""), 10))
      .filter((n) => Number.isFinite(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `INV-${String(next).padStart(3, "0")}`;
  }, [invoices]);

  const draftTotal = useMemo(
    () => (draft?.line_items || []).reduce((s, l) => s + (Number(l.total_cents) || 0), 0),
    [draft],
  );

  const setLine = (idx: number, patch: Partial<RfpInvoiceLine>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            line_items: d.line_items.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
          }
        : d,
    );
  };

  const save = async (status: string) => {
    if (!draft) return;
    if (!draft.invoice_number.trim()) return toast.error("Invoice number is required");
    if (!draft.po_reference.trim()) return toast.error("Purchase Order reference is required");
    const valid = draft.line_items.filter((l) => l.service_type.trim());
    if (!valid.length) return toast.error("Add at least one line item");
    if (valid.some((l) => !l.duration.trim() || !l.service_date)) {
      return toast.error("Each line item needs a date of service and duration/units");
    }
    setSaving(true);
    try {
      await saveInvoice({ data: { ...draft, status, line_items: valid } } as any);
      toast.success(status === "submitted" ? "Invoice submitted for RFP" : "Invoice saved");
      setDraft(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not save invoice");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (inv: RfpInvoice) => {
    if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    try {
      await deleteInvoice({ data: { id: inv.id } } as any);
      toast.success("Invoice deleted");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not delete invoice");
    }
  };

  const invoiceHtml = (inv: RfpInvoice) => `
    <div style="font-family:Georgia,serif;max-width:7.5in;margin:0 auto;color:#1a1a1a;">
      <div style="border-bottom:3px solid #1a5c38;padding-bottom:12px;margin-bottom:20px;">
        <div style="font-size:22px;font-weight:700;color:#1a5c38;">${COMPANY.name}</div>
        <div style="font-size:12px;color:#555;">${COMPANY.address}</div>
      </div>
      <table style="width:100%;font-size:13px;margin-bottom:18px;">
        <tr><td><strong>INVOICE #:</strong> ${inv.invoice_number}</td>
            <td style="text-align:right;"><strong>Date:</strong> ${fmtDate(inv.invoice_date)}</td></tr>
        <tr><td><strong>Purchase Order:</strong> ${inv.po_reference || "—"}</td>
            <td style="text-align:right;"><strong>Status:</strong> ${inv.status}</td></tr>
        <tr><td colspan="2"><strong>Bill To:</strong> ${inv.bill_to || "—"}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#1a5c38;color:#fff;">
            <th style="text-align:left;padding:8px;">Service Type</th>
            <th style="text-align:left;padding:8px;">Date of Service</th>
            <th style="text-align:left;padding:8px;">Duration / Units</th>
            <th style="text-align:right;padding:8px;">Rate</th>
            <th style="text-align:right;padding:8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.line_items || [])
            .map(
              (l) => `<tr style="border-bottom:1px solid #ddd;">
                <td style="padding:8px;">${l.service_type}</td>
                <td style="padding:8px;">${fmtDate(l.service_date)}</td>
                <td style="padding:8px;">${l.duration}</td>
                <td style="padding:8px;text-align:right;">${formatCents(l.rate_cents)}</td>
                <td style="padding:8px;text-align:right;">${formatCents(l.total_cents)}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:16px;font-size:16px;font-weight:700;border-top:2px solid #1a5c38;padding-top:10px;">
        TOTAL: ${formatCents(inv.total_amount_cents)}
      </div>
      <div style="margin-top:20px;font-size:12px;color:#444;">
        <div><strong>Payment Terms:</strong> ${inv.payment_terms || "Net 30"}</div>
        ${inv.notes ? `<div style="margin-top:8px;">${inv.notes}</div>` : ""}
      </div>
    </div>`;

  const printInvoice = (inv: RfpInvoice) =>
    openPrintWindow(`Invoice ${inv.invoice_number}`, invoiceHtml(inv), undefined, "@page { size: letter; margin: 0.6in; }");

  return (
    <RfpAdminGate
      title="Invoices (RFP)"
      subtitle="Create, edit and export sample invoices for the bid submission."
    >
      {draft ? (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{draft.id ? "Edit Invoice" : "Create Invoice"}</h2>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}><X className="h-4 w-4" /></Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><Label>Invoice #</Label>
              <Input value={draft.invoice_number} onChange={(e) => setDraft({ ...draft, invoice_number: e.target.value })} /></div>
            <div><Label>Invoice Date</Label>
              <Input type="date" value={draft.invoice_date} onChange={(e) => setDraft({ ...draft, invoice_date: e.target.value })} /></div>
            <div><Label>Purchase Order Reference</Label>
              <Input placeholder="PO-2026-001" value={draft.po_reference} onChange={(e) => setDraft({ ...draft, po_reference: e.target.value })} /></div>
            <div><Label>Payment Terms</Label>
              <Input value={draft.payment_terms} onChange={(e) => setDraft({ ...draft, payment_terms: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Bill To</Label>
              <Input value={draft.bill_to} onChange={(e) => setDraft({ ...draft, bill_to: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select></div>
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            <div className="space-y-2">
              {draft.line_items.map((l, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-12 items-end rounded-lg border border-border p-2">
                  <div className="sm:col-span-3">
                    <Label className="text-xs">Service Type</Label>
                    <Input placeholder="Software Licensing" value={l.service_type} onChange={(e) => setLine(i, { service_type: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Date of Service</Label>
                    <Input type="date" value={l.service_date} onChange={(e) => setLine(i, { service_date: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Duration / Units</Label>
                    <Input placeholder="1 Year" value={l.duration} onChange={(e) => setLine(i, { duration: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Applicable Rate ($)</Label>
                    <Input
                      inputMode="decimal"
                      value={centsToDollars(l.rate_cents)}
                      onChange={(e) => setLine(i, { rate_cents: dollarsToCents(e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Total Charges ($)</Label>
                    <Input
                      inputMode="decimal"
                      value={centsToDollars(l.total_cents)}
                      onChange={(e) => setLine(i, { total_cents: dollarsToCents(e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-1 flex gap-1">
                    <Button
                      type="button" variant="outline" size="sm" title="Multiply rate by the numeric units"
                      onClick={() => {
                        const units = parseFloat(String(l.duration).replace(/[^0-9.]/g, "")) || 1;
                        setLine(i, { total_cents: Math.round(l.rate_cents * units) });
                      }}
                    >=</Button>
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => setDraft({ ...draft, line_items: draft.line_items.filter((_, x) => x !== i) })}
                    ><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, line_items: [...draft.line_items, emptyLine()] })}>
              <Plus className="h-4 w-4 mr-1" /> Add Line Item
            </Button>
          </div>

          <div><Label>Notes</Label>
            <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <div className="text-lg font-semibold text-foreground">
              Total Invoice Amount: <span className="text-primary">{formatCents(draftTotal)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void save("draft")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Save Draft
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  printInvoice({
                    id: draft.id || "preview",
                    invoice_number: draft.invoice_number,
                    po_reference: draft.po_reference,
                    invoice_date: draft.invoice_date,
                    bill_to: draft.bill_to,
                    payment_terms: draft.payment_terms,
                    notes: draft.notes,
                    status: draft.status,
                    total_amount_cents: draftTotal,
                    line_items: draft.line_items.filter((l) => l.service_type.trim()),
                  })
                }
              >
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
              <Button onClick={() => void save("submitted")} disabled={saving}>Submit for RFP</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Invoices
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => setDraft(emptyDraft(nextNumber))}><Plus className="h-4 w-4 mr-1" /> Create</Button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet. Create your first sample invoice.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>PO Reference</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">
                      {inv.line_items?.[0]?.service_type || "—"}
                      {(inv.line_items?.length || 0) > 1 ? ` +${(inv.line_items!.length - 1)} more` : ""}
                    </TableCell>
                    <TableCell className="text-sm">{inv.po_reference || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCents(inv.total_amount_cents)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(inv.invoice_date)}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{inv.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => setPreview(inv)}>Preview</Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() =>
                          setDraft({
                            id: inv.id,
                            invoice_number: inv.invoice_number,
                            po_reference: inv.po_reference || "",
                            invoice_date: inv.invoice_date,
                            bill_to: inv.bill_to || "",
                            payment_terms: inv.payment_terms || "Net 30",
                            notes: inv.notes || "",
                            status: inv.status,
                            line_items: inv.line_items?.length ? inv.line_items.map((l) => ({ ...l })) : [emptyLine()],
                          })
                        }
                      >Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => void remove(inv)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {preview && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Invoice Preview</h2>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: invoiceHtml(preview) }} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => printInvoice(preview)}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
            <Button variant="outline" onClick={() => printInvoice(preview)}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
          </div>
        </Card>
      )}
    </RfpAdminGate>
  );
}

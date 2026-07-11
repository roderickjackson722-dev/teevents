import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Eye, Send, Download, Printer, Loader2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { formatTournamentDate } from "@/lib/formatDate";

type Invoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_org: string | null;
  client_email: string | null;
  client_phone: string | null;
  event_name: string;
  service_period_start: string | null;
  service_period_end: string | null;
  invoice_date: string;
  due_date: string | null;
  payment_terms: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};
type LineItem = { id?: string; description: string; quantity: number; unit_price_cents: number; category?: string | null; display_order: number };
type Breakdown = { id?: string; category: string; description: string; display_order: number };
type Allocation = { id?: string; payee_name: string; payee_amount_cents: number; payment_method: string | null; payment_details: string | null; display_order: number };

const STATUSES = ["draft", "sent", "paid", "overdue"] as const;
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

const fmtMoney = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const emptyForm = (): {
  inv: Partial<Invoice>;
  items: LineItem[];
  breakdowns: Breakdown[];
  allocations: Allocation[];
} => ({
  inv: {
    client_name: "",
    client_org: "",
    client_email: "",
    client_phone: "",
    event_name: "",
    service_period_start: "",
    service_period_end: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    payment_terms: "50% deposit upon receipt, balance due 10 days before event",
    status: "draft",
    notes: "",
  },
  items: [{ description: "", quantity: 1, unit_price_cents: 0, category: "management", display_order: 0 }],
  breakdowns: [],
  allocations: [],
});

export default function TournamentInvoices() {
  const [rows, setRows] = useState<(Invoice & { total_cents: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<{
    inv: Invoice; items: LineItem[]; breakdowns: Breakdown[]; allocations: Allocation[];
  } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: invs } = await supabase
      .from("tournament_invoices" as any)
      .select("*")
      .order("created_at", { ascending: false });
    const list = (invs as any as Invoice[] | null) ?? [];
    // fetch totals in bulk
    const ids = list.map((i) => i.id);
    let totals: Record<string, number> = {};
    if (ids.length) {
      const { data: lis } = await supabase
        .from("tournament_invoice_line_items" as any)
        .select("invoice_id, total_cents")
        .in("invoice_id", ids);
      for (const li of (lis as any[] | null) ?? []) {
        totals[li.invoice_id] = (totals[li.invoice_id] || 0) + (li.total_cents || 0);
      }
    }
    setRows(list.map((i) => ({ ...i, total_cents: totals[i.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.invoice_number.toLowerCase().includes(s) ||
          r.client_name.toLowerCase().includes(s) ||
          (r.event_name || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    const [{ data: inv }, { data: items }, { data: brks }, { data: allocs }] = await Promise.all([
      supabase.from("tournament_invoices" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("tournament_invoice_line_items" as any).select("*").eq("invoice_id", id).order("display_order"),
      supabase.from("tournament_invoice_service_breakdowns" as any).select("*").eq("invoice_id", id).order("display_order"),
      supabase.from("tournament_invoice_payment_allocations" as any).select("*").eq("invoice_id", id).order("display_order"),
    ]);
    if (!inv) { toast({ title: "Not found", variant: "destructive" }); return; }
    setEditingId(id);
    setForm({
      inv: inv as any,
      items: ((items as any[]) ?? []).map((i) => ({
        id: i.id, description: i.description, quantity: i.quantity,
        unit_price_cents: i.unit_price_cents, category: i.category, display_order: i.display_order,
      })),
      breakdowns: ((brks as any[]) ?? []).map((b) => ({
        id: b.id, category: b.category, description: b.description, display_order: b.display_order,
      })),
      allocations: ((allocs as any[]) ?? []).map((a) => ({
        id: a.id, payee_name: a.payee_name, payee_amount_cents: a.payee_amount_cents,
        payment_method: a.payment_method, payment_details: a.payment_details, display_order: a.display_order,
      })),
    });
    setEditorOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const { error } = await supabase.from("tournament_invoices" as any).delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invoice deleted" });
    load();
  };

  const save = async (opts?: { sendAfter?: boolean }) => {
    const f = form.inv;
    if (!f.client_name || !f.event_name) {
      toast({ title: "Client name and event name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        client_name: f.client_name,
        client_org: f.client_org || null,
        client_email: f.client_email || null,
        client_phone: f.client_phone || null,
        event_name: f.event_name,
        service_period_start: f.service_period_start || null,
        service_period_end: f.service_period_end || null,
        invoice_date: f.invoice_date || new Date().toISOString().slice(0, 10),
        due_date: f.due_date || null,
        payment_terms: f.payment_terms || null,
        status: opts?.sendAfter ? "sent" : (f.status || "draft"),
        notes: f.notes || null,
        created_by: user?.id ?? null,
      };
      let invoiceId = editingId;
      if (editingId) {
        const { error } = await supabase.from("tournament_invoices" as any).update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("tournament_invoices" as any).insert(payload).select("id").single();
        if (error) throw error;
        invoiceId = (data as any).id;
      }
      // Replace child rows
      await Promise.all([
        supabase.from("tournament_invoice_line_items" as any).delete().eq("invoice_id", invoiceId),
        supabase.from("tournament_invoice_service_breakdowns" as any).delete().eq("invoice_id", invoiceId),
        supabase.from("tournament_invoice_payment_allocations" as any).delete().eq("invoice_id", invoiceId),
      ]);
      if (form.items.length) {
        await supabase.from("tournament_invoice_line_items" as any).insert(
          form.items.map((i, idx) => ({
            invoice_id: invoiceId,
            description: i.description,
            quantity: i.quantity || 1,
            unit_price_cents: i.unit_price_cents || 0,
            category: i.category || null,
            display_order: idx,
          }))
        );
      }
      if (form.breakdowns.length) {
        await supabase.from("tournament_invoice_service_breakdowns" as any).insert(
          form.breakdowns.map((b, idx) => ({
            invoice_id: invoiceId, category: b.category, description: b.description, display_order: idx,
          }))
        );
      }
      if (form.allocations.length) {
        await supabase.from("tournament_invoice_payment_allocations" as any).insert(
          form.allocations.map((a, idx) => ({
            invoice_id: invoiceId,
            payee_name: a.payee_name,
            payee_amount_cents: a.payee_amount_cents || 0,
            payment_method: a.payment_method || null,
            payment_details: a.payment_details || null,
            display_order: idx,
          }))
        );
      }
      toast({ title: editingId ? "Invoice updated" : "Invoice created" });
      setEditorOpen(false);
      await load();
      if (opts?.sendAfter && invoiceId) {
        await sendInvoice(invoiceId);
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async (id: string) => {
    const [{ data: inv }, { data: items }, { data: brks }, { data: allocs }] = await Promise.all([
      supabase.from("tournament_invoices" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("tournament_invoice_line_items" as any).select("*").eq("invoice_id", id).order("display_order"),
      supabase.from("tournament_invoice_service_breakdowns" as any).select("*").eq("invoice_id", id).order("display_order"),
      supabase.from("tournament_invoice_payment_allocations" as any).select("*").eq("invoice_id", id).order("display_order"),
    ]);
    if (!inv) return;
    setPreviewInvoice({
      inv: inv as any,
      items: (items as any) ?? [],
      breakdowns: (brks as any) ?? [],
      allocations: (allocs as any) ?? [],
    });
    setPreviewOpen(true);
  };

  const sendInvoice = async (id: string) => {
    const { error } = await supabase.from("tournament_invoices" as any).update({ status: "sent" }).eq("id", id);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invoice marked as sent", description: "Download the PDF and email it to the client." });
    load();
  };

  const buildPdf = (p: NonNullable<typeof previewInvoice>) => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const M = 48;
    const W = 612;
    let y = M;
    // Header
    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text("INVOICE", M, y);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("TeeVents Golf Management", W - M, y - 4, { align: "right" });
    doc.text("2651 Satellite Blvd #54, Duluth, GA 30096", W - M, y + 10, { align: "right" });
    doc.text("info@teevents.golf", W - M, y + 22, { align: "right" });
    y += 40;
    doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 20;

    // Meta block
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`Invoice #: ${p.inv.invoice_number}`, M, y);
    doc.text(`Date: ${formatTournamentDate(p.inv.invoice_date)}`, W - M, y, { align: "right" });
    y += 14;
    if (p.inv.due_date) {
      doc.setFont("helvetica", "normal");
      doc.text(`Due: ${formatTournamentDate(p.inv.due_date)}`, W - M, y, { align: "right" });
      y += 14;
    }
    y += 6;

    // Bill To
    doc.setFont("helvetica", "bold"); doc.text("Bill To:", M, y); y += 12;
    doc.setFont("helvetica", "normal");
    const billLines = [
      p.inv.client_name,
      p.inv.client_org,
      p.inv.client_email,
      p.inv.client_phone,
    ].filter(Boolean) as string[];
    for (const l of billLines) { doc.text(l, M, y); y += 12; }
    y += 6;

    doc.setFont("helvetica", "bold"); doc.text("Event:", M, y);
    doc.setFont("helvetica", "normal"); doc.text(p.inv.event_name, M + 50, y); y += 12;
    if (p.inv.service_period_start || p.inv.service_period_end) {
      doc.setFont("helvetica", "bold"); doc.text("Service Period:", M, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${formatTournamentDate(p.inv.service_period_start)} — ${formatTournamentDate(p.inv.service_period_end)}`, M + 95, y);
      y += 12;
    }
    y += 10;

    // Line items table
    doc.setFillColor(240); doc.rect(M, y, W - 2 * M, 18, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Description", M + 6, y + 12);
    doc.text("Qty", W - M - 160, y + 12, { align: "right" });
    doc.text("Unit", W - M - 90, y + 12, { align: "right" });
    doc.text("Amount", W - M - 6, y + 12, { align: "right" });
    y += 22;
    doc.setFont("helvetica", "normal");
    let total = 0;
    for (const it of p.items) {
      if (y > 720) { doc.addPage(); y = M; }
      const lines = doc.splitTextToSize(it.description || "", W - 2 * M - 180);
      doc.text(lines, M + 6, y);
      doc.text(String(it.quantity), W - M - 160, y, { align: "right" });
      doc.text(fmtMoney(it.unit_price_cents), W - M - 90, y, { align: "right" });
      const lineTotal = it.quantity * it.unit_price_cents;
      total += lineTotal;
      doc.text(fmtMoney(lineTotal), W - M - 6, y, { align: "right" });
      y += Math.max(14, lines.length * 12) + 4;
    }
    doc.line(M, y, W - M, y); y += 14;
    doc.setFont("helvetica", "bold");
    doc.text("Total Due:", W - M - 100, y, { align: "right" });
    doc.text(fmtMoney(total), W - M - 6, y, { align: "right" });
    y += 24;

    // Service breakdown
    if (p.breakdowns.length) {
      if (y > 680) { doc.addPage(); y = M; }
      doc.setFontSize(12); doc.text("Services Included", M, y); y += 14;
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      for (const b of p.breakdowns) {
        if (y > 740) { doc.addPage(); y = M; }
        doc.setFont("helvetica", "bold"); doc.text(b.category, M, y); y += 12;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(b.description, W - 2 * M);
        doc.text(lines, M, y);
        y += lines.length * 11 + 6;
      }
      y += 6;
    }

    // Payment terms
    if (p.inv.payment_terms) {
      if (y > 720) { doc.addPage(); y = M; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Payment Terms", M, y); y += 12;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const t = doc.splitTextToSize(p.inv.payment_terms, W - 2 * M);
      doc.text(t, M, y); y += t.length * 11 + 8;
    }

    // Payment allocations
    if (p.allocations.length) {
      if (y > 680) { doc.addPage(); y = M; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Payment Instructions", M, y); y += 14;
      doc.setFontSize(9);
      for (const a of p.allocations) {
        if (y > 740) { doc.addPage(); y = M; }
        doc.setFont("helvetica", "bold");
        doc.text(`${a.payee_name} — ${fmtMoney(a.payee_amount_cents)}`, M, y); y += 12;
        doc.setFont("helvetica", "normal");
        if (a.payment_method) { doc.text(`Method: ${a.payment_method}`, M, y); y += 11; }
        if (a.payment_details) {
          const d = doc.splitTextToSize(a.payment_details, W - 2 * M);
          doc.text(d, M, y); y += d.length * 11;
        }
        y += 6;
      }
    }

    if (p.inv.notes) {
      if (y > 720) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Notes", M, y); y += 12;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const n = doc.splitTextToSize(p.inv.notes, W - 2 * M);
      doc.text(n, M, y);
    }
    return doc;
  };

  const downloadPdf = () => {
    if (!previewInvoice) return;
    const doc = buildPdf(previewInvoice);
    doc.save(`${previewInvoice.inv.invoice_number}.pdf`);
  };
  const printPdf = () => {
    if (!previewInvoice) return;
    const doc = buildPdf(previewInvoice);
    const url = doc.output("bloburl") as unknown as string;
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 400);
  };

  // ---- Editor helpers ----
  const setInv = (patch: Partial<Invoice>) => setForm((s) => ({ ...s, inv: { ...s.inv, ...patch } }));
  const addItem = () => setForm((s) => ({ ...s, items: [...s.items, { description: "", quantity: 1, unit_price_cents: 0, category: "management", display_order: s.items.length }] }));
  const updItem = (i: number, patch: Partial<LineItem>) => setForm((s) => ({ ...s, items: s.items.map((x, idx) => idx === i ? { ...x, ...patch } : x) }));
  const rmItem = (i: number) => setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  const addBrk = () => setForm((s) => ({ ...s, breakdowns: [...s.breakdowns, { category: "", description: "", display_order: s.breakdowns.length }] }));
  const updBrk = (i: number, patch: Partial<Breakdown>) => setForm((s) => ({ ...s, breakdowns: s.breakdowns.map((x, idx) => idx === i ? { ...x, ...patch } : x) }));
  const rmBrk = (i: number) => setForm((s) => ({ ...s, breakdowns: s.breakdowns.filter((_, idx) => idx !== i) }));
  const addAlloc = () => setForm((s) => ({ ...s, allocations: [...s.allocations, { payee_name: "", payee_amount_cents: 0, payment_method: "Zelle", payment_details: "", display_order: s.allocations.length }] }));
  const updAlloc = (i: number, patch: Partial<Allocation>) => setForm((s) => ({ ...s, allocations: s.allocations.map((x, idx) => idx === i ? { ...x, ...patch } : x) }));
  const rmAlloc = (i: number) => setForm((s) => ({ ...s, allocations: s.allocations.filter((_, idx) => idx !== i) }));
  const editorTotal = form.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price_cents || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Tournament Invoices</h2>
          <p className="text-sm text-muted-foreground">Create, preview, and send full-service tournament management invoices.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Search invoice #, client, event…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Event</th>
                <th className="text-left p-3">Date</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No invoices yet.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono">{r.invoice_number}</td>
                  <td className="p-3">{r.client_name}{r.client_org ? <div className="text-xs text-muted-foreground">{r.client_org}</div> : null}</td>
                  <td className="p-3">{r.event_name}</td>
                  <td className="p-3">{formatTournamentDate(r.invoice_date)}</td>
                  <td className="p-3 text-right">{fmtMoney(r.total_cents)}</td>
                  <td className="p-3"><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openPreview(r.id)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r.id)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic info */}
            <section className="space-y-3">
              <h3 className="font-semibold">Client &amp; Event</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Client name *</Label><Input value={form.inv.client_name || ""} onChange={(e) => setInv({ client_name: e.target.value })} /></div>
                <div><Label>Organization</Label><Input value={form.inv.client_org || ""} onChange={(e) => setInv({ client_org: e.target.value })} /></div>
                <div><Label>Client email</Label><Input type="email" value={form.inv.client_email || ""} onChange={(e) => setInv({ client_email: e.target.value })} /></div>
                <div><Label>Client phone</Label><Input value={form.inv.client_phone || ""} onChange={(e) => setInv({ client_phone: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Event name *</Label><Input value={form.inv.event_name || ""} onChange={(e) => setInv({ event_name: e.target.value })} /></div>
                <div><Label>Service period start</Label><Input type="date" value={form.inv.service_period_start || ""} onChange={(e) => setInv({ service_period_start: e.target.value })} /></div>
                <div><Label>Service period end</Label><Input type="date" value={form.inv.service_period_end || ""} onChange={(e) => setInv({ service_period_end: e.target.value })} /></div>
                <div><Label>Invoice date</Label><Input type="date" value={form.inv.invoice_date || ""} onChange={(e) => setInv({ invoice_date: e.target.value })} /></div>
                <div><Label>Due date</Label><Input type="date" value={form.inv.due_date || ""} onChange={(e) => setInv({ due_date: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Payment terms</Label><Input value={form.inv.payment_terms || ""} onChange={(e) => setInv({ payment_terms: e.target.value })} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.inv.status || "draft"} onValueChange={(v) => setInv({ status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Line Items */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Line Items</h3>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start border p-2 rounded">
                    <div className="col-span-6"><Label className="text-xs">Description</Label><Textarea rows={2} value={it.description} onChange={(e) => updItem(i, { description: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Qty</Label><Input type="number" min={1} value={it.quantity} onChange={(e) => updItem(i, { quantity: parseInt(e.target.value) || 0 })} /></div>
                    <div className="col-span-3"><Label className="text-xs">Unit price ($)</Label><Input type="number" min={0} step="0.01" value={(it.unit_price_cents / 100).toString()} onChange={(e) => updItem(i, { unit_price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                    <div className="col-span-1 flex items-end h-full"><Button size="icon" variant="ghost" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
              <div className="text-right font-semibold">Total: {fmtMoney(editorTotal)}</div>
            </section>

            {/* Service breakdown */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Service Breakdown (What's Included)</h3>
                <Button size="sm" variant="outline" onClick={addBrk}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
              </div>
              <div className="space-y-2">
                {form.breakdowns.map((b, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start border p-2 rounded">
                    <div className="col-span-3"><Label className="text-xs">Category</Label><Input value={b.category} onChange={(e) => updBrk(i, { category: e.target.value })} placeholder="e.g. Planning &amp; Logistics" /></div>
                    <div className="col-span-8"><Label className="text-xs">Description</Label><Textarea rows={2} value={b.description} onChange={(e) => updBrk(i, { description: e.target.value })} /></div>
                    <div className="col-span-1 flex items-end h-full"><Button size="icon" variant="ghost" onClick={() => rmBrk(i)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment allocation */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Payment Allocation</h3>
                <Button size="sm" variant="outline" onClick={addAlloc}><Plus className="h-4 w-4 mr-1" /> Add Payee</Button>
              </div>
              <div className="space-y-2">
                {form.allocations.map((a, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start border p-2 rounded">
                    <div className="col-span-4"><Label className="text-xs">Payee</Label><Input value={a.payee_name} onChange={(e) => updAlloc(i, { payee_name: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Amount ($)</Label><Input type="number" min={0} step="0.01" value={(a.payee_amount_cents / 100).toString()} onChange={(e) => updAlloc(i, { payee_amount_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                    <div className="col-span-2">
                      <Label className="text-xs">Method</Label>
                      <Select value={a.payment_method || ""} onValueChange={(v) => updAlloc(i, { payment_method: v })}>
                        <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                        <SelectContent>
                          {["Zelle", "Check", "Wire", "PayPal", "ACH", "Other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3"><Label className="text-xs">Details</Label><Textarea rows={2} value={a.payment_details || ""} onChange={(e) => updAlloc(i, { payment_details: e.target.value })} placeholder="Email or mailing address" /></div>
                    <div className="col-span-1 flex items-end h-full"><Button size="icon" variant="ghost" onClick={() => rmAlloc(i)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.inv.notes || ""} onChange={(e) => setInv({ notes: e.target.value })} />
            </section>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button variant="secondary" disabled={saving} onClick={() => save()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save as Draft
            </Button>
            <Button disabled={saving} onClick={() => save({ sendAfter: true })}>
              <Send className="h-4 w-4 mr-1" /> Save &amp; Mark Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview {previewInvoice ? `— ${previewInvoice.inv.invoice_number}` : ""}</DialogTitle>
          </DialogHeader>
          {previewInvoice && (() => {
            const p = previewInvoice;
            const total = p.items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
            return (
              <div className="space-y-4 text-sm bg-white text-black p-6 border rounded">
                <div className="flex justify-between items-start">
                  <h1 className="text-2xl font-bold">INVOICE</h1>
                  <div className="text-right text-xs">
                    <div className="font-semibold">TeeVents Golf Management</div>
                    <div>2651 Satellite Blvd #54, Duluth, GA 30096</div>
                    <div>info@teevents.golf</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs border-t pt-3">
                  <div>
                    <div className="font-semibold">Bill To:</div>
                    <div>{p.inv.client_name}</div>
                    {p.inv.client_org && <div>{p.inv.client_org}</div>}
                    {p.inv.client_email && <div>{p.inv.client_email}</div>}
                    {p.inv.client_phone && <div>{p.inv.client_phone}</div>}
                  </div>
                  <div className="text-right">
                    <div><span className="font-semibold">Invoice #:</span> {p.inv.invoice_number}</div>
                    <div><span className="font-semibold">Date:</span> {formatTournamentDate(p.inv.invoice_date)}</div>
                    {p.inv.due_date && <div><span className="font-semibold">Due:</span> {formatTournamentDate(p.inv.due_date)}</div>}
                  </div>
                </div>
                <div className="text-xs">
                  <div><span className="font-semibold">Event:</span> {p.inv.event_name}</div>
                  {(p.inv.service_period_start || p.inv.service_period_end) && (
                    <div><span className="font-semibold">Service Period:</span> {formatTournamentDate(p.inv.service_period_start)} — {formatTournamentDate(p.inv.service_period_end)}</div>
                  )}
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
                    {p.items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 whitespace-pre-wrap">{it.description}</td>
                        <td className="p-2 text-right">{it.quantity}</td>
                        <td className="p-2 text-right">{fmtMoney(it.unit_price_cents)}</td>
                        <td className="p-2 text-right">{fmtMoney(it.quantity * it.unit_price_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-bold"><td colSpan={3} className="p-2 text-right">Total Due</td><td className="p-2 text-right">{fmtMoney(total)}</td></tr>
                  </tfoot>
                </table>
                {p.breakdowns.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold mb-1">Services Included</div>
                    {p.breakdowns.map((b, i) => (
                      <div key={i} className="mb-2">
                        <div className="font-semibold">{b.category}</div>
                        <div className="whitespace-pre-wrap">{b.description}</div>
                      </div>
                    ))}
                  </div>
                )}
                {p.inv.payment_terms && (
                  <div className="text-xs"><span className="font-semibold">Payment Terms:</span> {p.inv.payment_terms}</div>
                )}
                {p.allocations.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold mb-1">Payment Instructions</div>
                    {p.allocations.map((a, i) => (
                      <div key={i} className="mb-2 border-l-2 border-gray-300 pl-2">
                        <div className="font-semibold">{a.payee_name} — {fmtMoney(a.payee_amount_cents)}</div>
                        {a.payment_method && <div>Method: {a.payment_method}</div>}
                        {a.payment_details && <div className="whitespace-pre-wrap">{a.payment_details}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {p.inv.notes && (
                  <div className="text-xs"><span className="font-semibold">Notes:</span> <span className="whitespace-pre-wrap">{p.inv.notes}</span></div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            {previewInvoice && previewInvoice.inv.status === "draft" && (
              <Button variant="secondary" onClick={async () => { await sendInvoice(previewInvoice.inv.id); setPreviewInvoice({ ...previewInvoice, inv: { ...previewInvoice.inv, status: "sent" } }); }}>
                <Send className="h-4 w-4 mr-1" /> Mark Sent
              </Button>
            )}
            <Button variant="outline" onClick={printPdf}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            <Button onClick={downloadPdf}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

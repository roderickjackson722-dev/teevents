import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Trash2, GripVertical, FileDown, Save, ArrowLeft, Pencil, Copy } from "lucide-react";
import jsPDF from "jspdf";
import logoAsset from "@/assets/teevents-logo.png.asset.json";

// Catalog of platform features that can be added as line items.
const FEATURE_CATALOG: { name: string; description: string; price: number }[] = [
  { name: "Custom Tournament Website", description: "Branded public tournament page with custom domain support", price: 0 },
  { name: "Online Registration", description: "Self-serve registration with custom fields & captain flow", price: 0 },
  { name: "Live Leaderboard", description: "Real-time leaderboard with TV display mode & QR access", price: 0 },
  { name: "Sponsorship Management", description: "Sponsor levels, prices, benefits, logo approvals", price: 0 },
  { name: "Side Events", description: "Welcome parties, awards dinners, clinics with paid signups", price: 0 },
  { name: "Vendor Management", description: "Booth registration, payment, check-in", price: 0 },
  { name: "Add-On Store", description: "Merchandise, mulligans, extras at registration", price: 0 },
  { name: "Silent Auction", description: "Online bidding, winner notifications, payment", price: 0 },
  { name: "Raffles & 50/50", description: "Ticket sales, automatic draws", price: 0 },
  { name: "Donations", description: "501(c)(3) tax receipts, recurring giving", price: 0 },
  { name: "Photo Gallery", description: "Upload, organize, share event photos", price: 0 },
  { name: "Email Templates & Blasts", description: "Confirmation, reminder, thank-you emails", price: 0 },
  { name: "QR Code Check-In", description: "Mobile check-in with friction-less scoring access", price: 0 },
  { name: "Live Scoring", description: "Per-player scoring app with 6-character auth codes", price: 0 },
  { name: "Printables", description: "Scorecards, cart signs, name badges, sponsor signs", price: 0 },
  { name: "Flyer Studio (Canva)", description: "Canva-integrated marketing flyers", price: 0 },
  { name: "Pro Tournament Unlock", description: "One-time per-tournament Pro features unlock", price: 399 },
  { name: "Enterprise (Custom)", description: "Custom pricing for multi-event organizations", price: 0 },
  { name: "Consulting / Setup Fee", description: "One-time concierge setup support", price: 0 },
  { name: "Custom Development", description: "Bespoke feature work", price: 0 },
  { name: "À la carte add-on", description: "Custom line item", price: 0 },
];

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_company: string | null;
  customer_address: string | null;
  issue_date: string;
  due_date: string | null;
  line_items: LineItem[];
  notes: string | null;
  tax_rate: number;
  discount_cents: number;
  total_cents: number;
  status: string;
  currency: string;
  created_at: string;
}

const STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-300 text-gray-700",
};

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const newId = () => Math.random().toString(36).slice(2, 10);

function emptyInvoice(): Invoice {
  const num = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  return {
    id: "",
    invoice_number: num,
    customer_name: "",
    customer_email: "",
    customer_company: "",
    customer_address: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    line_items: [],
    notes: "",
    tax_rate: 0,
    discount_cents: 0,
    total_cents: 0,
    status: "draft",
    currency: "USD",
    created_at: new Date().toISOString(),
  };
}

function calcTotal(items: LineItem[], taxRate: number, discountCents: number) {
  const subtotal = items.reduce((sum, it) => sum + Math.round(it.quantity * it.unit_price_cents), 0);
  const tax = Math.round((subtotal - discountCents) * (taxRate / 100));
  return { subtotal, tax, total: subtotal - discountCents + tax };
}

export default function AdminInvoices() {
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load invoices", description: error.message, variant: "destructive" });
    setList((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (editing) {
    return <InvoiceEditor invoice={editing} onClose={() => { setEditing(null); load(); }} />;
  }

  const filtered = statusFilter === "all" ? list : list.filter(i => i.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Invoices</h2>
          <p className="text-sm text-muted-foreground">Create custom invoices for organizers, sponsors, or partners.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing(emptyInvoice())}><Plus className="w-4 h-4 mr-1" /> New Invoice</Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Invoice #</th>
              <th className="text-left p-3 font-medium">Customer</th>
              <th className="text-left p-3 font-medium">Issued</th>
              <th className="text-left p-3 font-medium">Due</th>
              <th className="text-right p-3 font-medium">Total</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No invoices yet. Click “New Invoice” to create one.</td></tr>}
            {filtered.map(inv => (
              <tr key={inv.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                <td className="p-3">
                  <div className="font-medium">{inv.customer_name || "—"}</div>
                  {inv.customer_company && <div className="text-xs text-muted-foreground">{inv.customer_company}</div>}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{inv.issue_date}</td>
                <td className="p-3 text-xs text-muted-foreground">{inv.due_date || "—"}</td>
                <td className="p-3 text-right font-semibold">{fmt(inv.total_cents)}</td>
                <td className="p-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(inv)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      const { id, created_at, invoice_number, ...rest } = inv as any;
                      const newNum = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
                      const { error } = await supabase.from("admin_invoices").insert({
                        ...rest, invoice_number: newNum, status: "draft", created_by: user.id, edit_history: [],
                      });
                      if (error) toast({ title: "Clone failed", description: error.message, variant: "destructive" });
                      else { toast({ title: "Invoice cloned as draft" }); load(); }
                    }}><Copy className="w-3 h-3 mr-1" /> Clone</Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadPdf(inv)}><FileDown className="w-3 h-3 mr-1" /> PDF</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm("Delete this invoice?")) return;
                      await supabase.from("admin_invoices").delete().eq("id", inv.id);
                      load();
                    }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function InvoiceEditor({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [inv, setInv] = useState<Invoice>(() => ({
    ...invoice,
    line_items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
  }));
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const totals = useMemo(() => calcTotal(inv.line_items, Number(inv.tax_rate) || 0, Number(inv.discount_cents) || 0), [inv.line_items, inv.tax_rate, inv.discount_cents]);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    const next = [...inv.line_items];
    next[idx] = { ...next[idx], ...patch };
    setInv({ ...inv, line_items: next });
  };
  const removeItem = (idx: number) => setInv({ ...inv, line_items: inv.line_items.filter((_, i) => i !== idx) });
  const addItem = (preset?: typeof FEATURE_CATALOG[number]) => {
    const item: LineItem = {
      id: newId(),
      name: preset?.name || "",
      description: preset?.description || "",
      quantity: 1,
      unit_price_cents: preset ? Math.round((preset.price || 0) * 100) : 0,
    };
    setInv({ ...inv, line_items: [...inv.line_items, item] });
    setPickerOpen(false);
  };

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const items = [...inv.line_items];
    const [moved] = items.splice(r.source.index, 1);
    items.splice(r.destination.index, 0, moved);
    setInv({ ...inv, line_items: items });
  };

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); toast({ title: "Not signed in", variant: "destructive" }); return; }
    const payload = {
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      customer_email: inv.customer_email || null,
      customer_company: inv.customer_company || null,
      customer_address: inv.customer_address || null,
      issue_date: inv.issue_date,
      due_date: inv.due_date || null,
      line_items: inv.line_items as any,
      notes: inv.notes || null,
      tax_rate: Number(inv.tax_rate) || 0,
      discount_cents: Number(inv.discount_cents) || 0,
      total_cents: totals.total,
      status: inv.status,
      currency: inv.currency,
    };
    let err;
    if (inv.id) {
      const historyEntry = { user_id: user.id, at: new Date().toISOString(), status: inv.status };
      const nextHistory = [ ...((invoice as any).edit_history || []), historyEntry ].slice(-50);
      ({ error: err } = await supabase.from("admin_invoices").update({ ...payload, last_edited_by: user.id, edit_history: nextHistory as any }).eq("id", inv.id));
    } else {
      ({ error: err } = await supabase.from("admin_invoices").insert({ ...payload, created_by: user.id }));
    }
    setSaving(false);
    if (err) toast({ title: "Save failed", description: err.message, variant: "destructive" });
    else { toast({ title: "Invoice saved" }); onClose(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" onClick={onClose}><ArrowLeft className="w-4 h-4 mr-1" /> Back to invoices</Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => downloadPdf({ ...inv, total_cents: totals.total })}><FileDown className="w-4 h-4 mr-1" /> Download PDF</Button>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Invoice"}</Button>
        </div>
      </div>

      <Card className="p-5 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Invoice #</Label>
            <Input value={inv.invoice_number} onChange={e => setInv({ ...inv, invoice_number: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={inv.status} onValueChange={(v) => setInv({ ...inv, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Issue Date</Label>
            <Input type="date" value={inv.issue_date} onChange={e => setInv({ ...inv, issue_date: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={inv.due_date || ""} onChange={e => setInv({ ...inv, due_date: e.target.value })} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-base">Bill To</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Customer Name *" value={inv.customer_name} onChange={e => setInv({ ...inv, customer_name: e.target.value })} />
            <Input placeholder="Company" value={inv.customer_company || ""} onChange={e => setInv({ ...inv, customer_company: e.target.value })} />
            <Input placeholder="Email" value={inv.customer_email || ""} onChange={e => setInv({ ...inv, customer_email: e.target.value })} />
            <Input placeholder="Address" value={inv.customer_address || ""} onChange={e => setInv({ ...inv, customer_address: e.target.value })} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-base">Line Items</Label>
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(v => !v)}><Plus className="w-4 h-4 mr-1" /> Add from catalog</Button>
              {pickerOpen && (
                <div className="absolute right-0 mt-1 w-[340px] max-h-[360px] overflow-auto z-20 bg-popover border rounded-md shadow-lg p-1">
                  {FEATURE_CATALOG.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => addItem(f)}
                      className="block w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded"
                    >
                      <div className="font-medium">{f.name}{f.price ? ` — $${f.price}` : ""}</div>
                      <div className="text-muted-foreground truncate">{f.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="items">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {inv.line_items.map((it, idx) => (
                    <Draggable key={it.id} draggableId={it.id} index={idx}>
                      {(prov) => (
                        <div ref={prov.innerRef} {...prov.draggableProps} className="bg-muted/40 border rounded-md p-3 flex gap-2 items-start">
                          <div {...prov.dragHandleProps} className="cursor-grab text-muted-foreground pt-2"><GripVertical className="w-4 h-4" /></div>
                          <div className="flex-1 grid grid-cols-12 gap-2">
                            <Input className="col-span-12 sm:col-span-5" placeholder="Item name" value={it.name} onChange={e => updateItem(idx, { name: e.target.value })} />
                            <Input className="col-span-12 sm:col-span-7" placeholder="Description (optional)" value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} />
                            <Input className="col-span-4 sm:col-span-2" type="number" min={1} placeholder="Qty" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) || 1 })} />
                            <div className="col-span-5 sm:col-span-3">
                              <Input type="number" min={0} step="0.01" placeholder="Unit price" value={(it.unit_price_cents / 100).toString()} onChange={e => updateItem(idx, { unit_price_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
                            </div>
                            <div className="col-span-3 sm:col-span-7 text-right sm:text-right pt-2 font-semibold">{fmt(it.quantity * it.unit_price_cents)}</div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {inv.line_items.length === 0 && <p className="text-xs text-muted-foreground italic">No items yet. Add from the catalog or click below to add a custom line.</p>}
          <Button size="sm" variant="ghost" onClick={() => addItem()}><Plus className="w-4 h-4 mr-1" /> Add custom line</Button>
        </div>

        <div className="border-t pt-4 grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Notes / Terms</Label>
              <Textarea rows={5} value={inv.notes || ""} onChange={e => setInv({ ...inv, notes: e.target.value })} placeholder="Payment terms, thank-you note, payment instructions..." />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span>Discount ($)</span>
              <Input type="number" min={0} step="0.01" className="w-28 h-8" value={(inv.discount_cents / 100).toString()} onChange={e => setInv({ ...inv, discount_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span>Tax rate (%)</span>
              <Input type="number" min={0} step="0.01" className="w-28 h-8" value={inv.tax_rate} onChange={e => setInv({ ...inv, tax_rate: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center justify-between text-sm"><span>Tax</span><span>{fmt(totals.tax)}</span></div>
            <div className="flex items-center justify-between text-lg font-bold border-t pt-2"><span>Total</span><span>{fmt(totals.total)}</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(logoAsset.url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadPdf(inv: Invoice) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PAGE_W = 612;
  const PAGE_H = 792;
  const M = 48;
  const CONTENT_W = PAGE_W - M * 2;
  const RIGHT = M + CONTENT_W;
  const FOOTER_H = 40;
  const BOTTOM_LIMIT = PAGE_H - FOOTER_H - 8;

  // Consistent type system
  const FS_BODY = 10;
  const LH_BODY = 13;
  const FS_SMALL = 9;
  const LH_SMALL = 12;

  const setBody = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(FS_BODY); doc.setTextColor(20, 20, 20); };
  const setMuted = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(FS_BODY); doc.setTextColor(110, 110, 110); };
  const setLabel = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(FS_BODY); doc.setTextColor(120, 120, 120); };

  // Normalize text: strip tabs and non-breaking spaces that cause letter-spacing artifacts
  const clean = (s: string) => (s || "").replace(/\t/g, "  ").replace(/\u00A0/g, " ").replace(/\r/g, "");

  const drawFooter = () => {
    const fy = PAGE_H - 28;
    doc.setDrawColor(230, 230, 230);
    doc.line(M, fy - 14, RIGHT, fy - 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS_SMALL); doc.setTextColor(140, 140, 140);
    doc.text("Thank you for your business — TeeVents Golf Management Co.", PAGE_W / 2, fy, { align: "center" });
    doc.text("www.teevents.golf  •  info@teevents.golf", PAGE_W / 2, fy + 11, { align: "center" });
  };

  const ensureSpace = (needed: number, currentY: number) => {
    if (currentY + needed > BOTTOM_LIMIT) {
      drawFooter();
      doc.addPage();
      return M;
    }
    return currentY;
  };

  // Header: logo + company
  const logo = await fetchLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "PNG", M, M, 60, 60); } catch {}
  }
  const companyX = M + 74;
  let cy = M + 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20, 20, 20);
  doc.text("TeeVents Golf Management", companyX, cy); cy += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS_SMALL); doc.setTextColor(90, 90, 90);
  doc.text("info@teevents.golf", companyX, cy); cy += 11;
  doc.text("www.teevents.golf", companyX, cy);

  // Invoice meta (right)
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("INVOICE", RIGHT, M + 16, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(FS_SMALL);
  const metaLines: Array<[string, string]> = [
    ["Invoice #", inv.invoice_number || ""],
    ["Issue Date", inv.issue_date || ""],
  ];
  if (inv.due_date) metaLines.push(["Due Date", inv.due_date]);
  let my = M + 32;
  metaLines.forEach(([k, v]) => {
    doc.setTextColor(120, 120, 120);
    doc.text(`${k}:`, RIGHT - 90, my);
    doc.setTextColor(20, 20, 20);
    doc.text(v, RIGHT, my, { align: "right" });
    my += 12;
  });

  let y = Math.max(M + 76, my + 8);
  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, RIGHT, y);
  y += 22;

  // Bill To
  const billW = CONTENT_W * 0.65;
  setLabel();
  doc.text("BILL TO", M, y); y += 13;
  setBody();
  const writeWrapped = (text: string, muted = false) => {
    if (!text) return;
    if (muted) doc.setTextColor(90, 90, 90); else doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(clean(text), billW);
    y = ensureSpace(lines.length * LH_BODY, y);
    doc.text(lines, M, y);
    y += lines.length * LH_BODY;
  };
  writeWrapped(inv.customer_name || "");
  writeWrapped(inv.customer_company || "");
  writeWrapped(inv.customer_email || "", true);
  writeWrapped(inv.customer_address || "", true);
  setBody();

  y += 18;

  // Items table
  const colQtyX = M + CONTENT_W - 230;
  const colUnitX = M + CONTENT_W - 130;
  const colAmtX = RIGHT - 4;
  const descColW = colQtyX - (M + 12) - 8;

  const drawTableHeader = () => {
    y = ensureSpace(30, y);
    doc.setFillColor(245, 247, 250);
    doc.rect(M, y, CONTENT_W, 24, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS_BODY); doc.setTextColor(60, 60, 60);
    doc.text("DESCRIPTION", M + 12, y + 16);
    doc.text("QTY", colQtyX, y + 16, { align: "right" });
    doc.text("UNIT", colUnitX, y + 16, { align: "right" });
    doc.text("AMOUNT", colAmtX, y + 16, { align: "right" });
    y += 24;
  };
  drawTableHeader();

  setBody();
  const items: LineItem[] = Array.isArray(inv.line_items) ? inv.line_items : [];
  items.forEach((it, idx) => {
    const amount = it.quantity * it.unit_price_cents;
    const nameLines = doc.splitTextToSize(clean(it.name || ""), descColW);
    const descLines = it.description ? doc.splitTextToSize(clean(it.description), descColW) : [];
    const rowH = 10 + nameLines.length * 12 + descLines.length * 11 + 8;

    if (y + rowH > BOTTOM_LIMIT) {
      drawFooter();
      doc.addPage();
      y = M;
      drawTableHeader();
      setBody();
    }

    if (idx % 2 === 1) {
      doc.setFillColor(252, 252, 252);
      doc.rect(M, y, CONTENT_W, rowH, "F");
    }

    let ty = y + 14;
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS_BODY); doc.setTextColor(20, 20, 20);
    doc.text(nameLines, M + 12, ty);
    ty += nameLines.length * 12;
    if (descLines.length) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(110, 110, 110); doc.setFontSize(FS_SMALL);
      doc.text(descLines, M + 12, ty);
    }

    doc.setFont("helvetica", "normal"); doc.setFontSize(FS_BODY); doc.setTextColor(20, 20, 20);
    doc.text(String(it.quantity), colQtyX, y + 14, { align: "right" });
    doc.text(fmt(it.unit_price_cents), colUnitX, y + 14, { align: "right" });
    doc.text(fmt(amount), colAmtX, y + 14, { align: "right" });

    y += rowH;
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, RIGHT, y);
  y += 16;

  // Totals
  const totals = calcTotal(items, Number(inv.tax_rate) || 0, Number(inv.discount_cents) || 0);
  const totalsLabelX = RIGHT - 160;
  const totalsValueX = colAmtX;
  const totalsBlockH = 16 * (3 + (inv.discount_cents ? 1 : 0)) + 16;
  y = ensureSpace(totalsBlockH, y);

  doc.setFont("helvetica", "normal"); doc.setFontSize(FS_BODY); doc.setTextColor(90, 90, 90);
  doc.text("Subtotal", totalsLabelX, y);
  doc.setTextColor(20, 20, 20);
  doc.text(fmt(totals.subtotal), totalsValueX, y, { align: "right" });
  y += 14;

  if (inv.discount_cents) {
    doc.setTextColor(90, 90, 90);
    doc.text("Discount", totalsLabelX, y);
    doc.setTextColor(20, 20, 20);
    doc.text(`-${fmt(inv.discount_cents)}`, totalsValueX, y, { align: "right" });
    y += 14;
  }

  doc.setTextColor(90, 90, 90);
  doc.text(`Tax (${inv.tax_rate || 0}%)`, totalsLabelX, y);
  doc.setTextColor(20, 20, 20);
  doc.text(fmt(totals.tax), totalsValueX, y, { align: "right" });
  y += 12;

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsLabelX, y, totalsValueX, y);
  y += 14;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(20, 20, 20);
  doc.text("TOTAL", totalsLabelX, y);
  doc.text(fmt(totals.total), totalsValueX, y, { align: "right" });
  y += 26;

  // Notes — paginate cleanly
  if (inv.notes) {
    y = ensureSpace(30, y);
    setLabel();
    doc.text("NOTES / TERMS", M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS_SMALL); doc.setTextColor(60, 60, 60);

    const paragraphs = clean(inv.notes).split(/\n/);
    paragraphs.forEach((para) => {
      if (para.trim() === "") { y += LH_SMALL / 2; return; }
      const lines = doc.splitTextToSize(para, CONTENT_W);
      lines.forEach((ln: string) => {
        y = ensureSpace(LH_SMALL, y);
        doc.text(ln, M, y);
        y += LH_SMALL;
      });
    });
  }

  drawFooter();
  doc.save(`${inv.invoice_number || "invoice"}.pdf`);
}

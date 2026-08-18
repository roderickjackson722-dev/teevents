import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, ShoppingCart, Printer, QrCode } from "lucide-react";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

interface Tournament { id: string; title: string; slug: string | null; }
interface Item {
  id: string;
  tournament_id: string;
  item_name: string;
  description: string | null;
  price_cents: number;
  category: string;
  max_quantity: number | null;
  sold_quantity: number;
  show_on_public: boolean;
  show_qr_code: boolean;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: "walkup", label: "Walk-up" },
  { value: "mulligan", label: "Mulligan" },
  { value: "contest", label: "Contest" },
  { value: "custom", label: "Custom" },
];

const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

const EventDaySales = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item_name: "",
    description: "",
    price: "",
    category: "custom",
    max_quantity: "",
    show_on_public: true,
    show_qr_code: false,
  });

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, slug")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = (data || []) as Tournament[];
        setTournaments(t);
        if (t.length > 0) setSelected(pickTournamentId(t));
      });
  }, [org]);

  const fetchItems = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("event_day_sales_items")
      .select("*")
      .eq("tournament_id", selected)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data || []) as Item[]);
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setEditing(null);
    setForm({ item_name: "", description: "", price: "", category: "custom", max_quantity: "", show_on_public: true, show_qr_code: false });
  };

  const openEdit = (it: Item) => {
    setEditing(it);
    setForm({
      item_name: it.item_name,
      description: it.description || "",
      price: (it.price_cents / 100).toFixed(2),
      category: it.category || "custom",
      max_quantity: it.max_quantity == null ? "" : String(it.max_quantity),
      show_on_public: it.show_on_public,
      show_qr_code: it.show_qr_code,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demoGuard()) return;
    if (!form.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }
    setSaving(true);
    const payload: any = {
      tournament_id: selected,
      item_name: form.item_name.trim(),
      description: form.description.trim() || null,
      price_cents: Math.round(parseFloat(form.price || "0") * 100),
      category: form.category,
      max_quantity: form.max_quantity ? parseInt(form.max_quantity, 10) : null,
      show_on_public: form.show_on_public,
      show_qr_code: form.show_qr_code,
      is_active: true,
      sort_order: editing?.sort_order ?? items.length,
    };
    const q = editing
      ? (supabase as any).from("event_day_sales_items").update(payload).eq("id", editing.id)
      : (supabase as any).from("event_day_sales_items").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editing ? "Item updated" : "Item created");
      resetForm();
      setDialogOpen(false);
      fetchItems();
    }
  };

  const toggleActive = async (it: Item) => {
    if (demoGuard()) return;
    const { error } = await (supabase as any)
      .from("event_day_sales_items")
      .update({ is_active: !it.is_active })
      .eq("id", it.id);
    if (error) toast.error(error.message);
    else setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    if (!confirm("Delete this item? This cannot be undone.")) return;
    const { error } = await (supabase as any).from("event_day_sales_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const slug = tournaments.find((t) => t.id === selected)?.slug || selected;
  const publicSalesUrl = `${window.location.origin}/t/${slug}#event-day-sales`;
  const itemUrl = (id: string) => `${publicSalesUrl}?item=${id}`;

  const printQrSheet = () => {
    const qrItems = items.filter((i) => i.is_active && i.show_qr_code);
    if (qrItems.length === 0) {
      toast.error("No items have QR codes enabled");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Event Day Sales — QR Codes</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;}
        .card{border:1px solid #ddd;border-radius:8px;padding:16px;text-align:center;page-break-inside:avoid;}
        img{width:240px;height:240px;}
        h3{margin:8px 0 4px;}
        .price{color:#1a5c38;font-weight:700;font-size:18px;}
        .desc{color:#666;font-size:13px;}
      </style></head><body>
      <h1>Event Day Sales</h1>
      <div class="grid">
      ${qrItems
        .map(
          (i) => `<div class="card">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(itemUrl(i.id))}" alt="QR" />
            <h3>${i.item_name}</h3>
            <div class="price">${fmt(i.price_cents)}</div>
            ${i.description ? `<div class="desc">${i.description}</div>` : ""}
            <div class="desc" style="margin-top:8px;word-break:break-all;">${itemUrl(i.id)}</div>
          </div>`
        )
        .join("")}
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Event Day Sales</h1>
          <p className="text-muted-foreground mt-1">Sell walk-ups, mulligans, contests and custom items on the day of the event. Generate printable QR codes for any item.</p>
        </div>
        {tournaments.length > 1 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Sales Items</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={printQrSheet}>
              <Printer className="h-4 w-4 mr-1.5" /> Print QR Sheet
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editing ? "Edit Item" : "Add Sales Item"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <Label>Item Name *</Label>
                    <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="e.g. Walk-up Entry, Mulligan Pack" required maxLength={120} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Price ($) *</Label>
                      <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" required />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} />
                  </div>
                  <div>
                    <Label>Max Quantity (optional)</Label>
                    <Input type="number" min="0" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: e.target.value })} placeholder="Leave blank for unlimited" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border border-border">
                    <div>
                      <Label>Show on public day-of page</Label>
                      <p className="text-xs text-muted-foreground">Visible to event attendees on the public site</p>
                    </div>
                    <Switch checked={form.show_on_public} onCheckedChange={(v) => setForm({ ...form, show_on_public: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border border-border">
                    <div>
                      <Label>Generate QR code for printing</Label>
                      <p className="text-xs text-muted-foreground">Include this item on the printable QR sheet</p>
                    </div>
                    <Switch checked={form.show_qr_code} onCheckedChange={(v) => setForm({ ...form, show_qr_code: v })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editing ? "Update" : "Add Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No items yet. Click "Add Item" to create your first sales item.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead>Public</TableHead>
                <TableHead>QR</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{i.item_name}</div>
                    {i.description && <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{i.category}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{fmt(i.price_cents)}</TableCell>
                  <TableCell className="text-right">{i.sold_quantity}{i.max_quantity ? `/${i.max_quantity}` : ""}</TableCell>
                  <TableCell>{i.show_on_public ? "Yes" : "No"}</TableCell>
                  <TableCell>{i.show_qr_code ? <QrCode className="h-4 w-4 text-primary" /> : "—"}</TableCell>
                  <TableCell><Switch checked={i.is_active} onCheckedChange={() => toggleActive(i)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default EventDaySales;

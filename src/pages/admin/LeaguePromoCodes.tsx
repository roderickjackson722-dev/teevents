import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Row {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  notes: string | null;
}

export default function LeaguePromoCodes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: 10,
    max_uses: "",
    expires_at: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("league_access_promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code.trim()) return toast({ title: "Code required", variant: "destructive" });
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === "fixed" ? Math.round(Number(form.discount_value) * 100) : Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
      notes: form.notes || null,
    };
    const { error } = await (supabase as any).from("league_access_promo_codes").insert(payload);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    toast({ title: "Promo code created" });
    setShowForm(false);
    setForm({ code: "", discount_type: "percent", discount_value: 10, max_uses: "", expires_at: "", notes: "" });
    load();
  };

  const toggleActive = async (r: Row) => {
    await (supabase as any).from("league_access_promo_codes").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const del = async (r: Row) => {
    if (!confirm(`Delete promo code ${r.code}?`)) return;
    await (supabase as any).from("league_access_promo_codes").delete().eq("id", r.id);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Golf League Promo Codes</h1>
          <p className="text-muted-foreground text-sm mt-1">Discount codes applied to the $199 League Manager access fee.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New Code</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Codes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No promo codes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold">{r.code}</TableCell>
                    <TableCell>
                      {r.discount_type === "percent"
                        ? `${r.discount_value}%`
                        : `$${(r.discount_value / 100).toFixed(2)}`}
                    </TableCell>
                    <TableCell>{r.times_used}{r.max_uses ? ` / ${r.max_uses}` : ""}</TableCell>
                    <TableCell>{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => del(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <select className="w-full border rounded-md h-10 px-2 bg-background" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}>
                    <option value="percent">Percent off</option>
                    <option value="fixed">Fixed $ off</option>
                  </select>
                </div>
                <div>
                  <Label>{form.discount_type === "percent" ? "Percent (1–100)" : "Amount in USD"}</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Max uses (optional)</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
                <div><Label>Expires (optional)</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

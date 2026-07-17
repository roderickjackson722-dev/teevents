import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, FileText, CheckCircle2 } from "lucide-react";

interface Row {
  id: string;
  organization_id: string;
  league_id: string;
  amount_cents: number;
  payment_method: string;
  invoice_status: string | null;
  invoice_notes: string | null;
  invoiced_at: string | null;
  invoice_paid_at: string | null;
  created_at: string;
  purchased_by: string;
  league_name?: string;
  org_name?: string;
  purchaser_email?: string;
}

export default function LeagueInvoices() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("league_access_purchases")
      .select("*")
      .eq("payment_method", "invoice")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const enriched = await Promise.all(
      (data as Row[]).map(async (r) => {
        const [{ data: l }, { data: o }] = await Promise.all([
          (supabase as any).from("golf_leagues").select("league_name").eq("id", r.league_id).maybeSingle(),
          (supabase as any).from("organizations").select("name").eq("id", r.organization_id).maybeSingle(),
        ]);
        return { ...r, league_name: l?.league_name, org_name: o?.name };
      }),
    );
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, patch: Record<string, any>) => {
    const { error } = await (supabase as any)
      .from("league_access_purchases")
      .update(patch)
      .eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Updated" });
    setEditing(null);
    load();
  };

  const totalOutstanding = rows
    .filter((r) => r.invoice_status !== "paid")
    .reduce((sum, r) => sum + r.amount_cents, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" /> League Invoices
        </h1>
        <p className="text-muted-foreground mt-1">
          Leagues unlocked by admin (info@teevents.golf) that need to be invoiced manually.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Invoiceable</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold">${(totalOutstanding / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold">{rows.filter(r => r.invoice_status === "paid").length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No invoiceable leagues yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    {r.league_name || "(unknown league)"}
                    {r.invoice_status === "paid" ? (
                      <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>
                    ) : r.invoice_status === "sent" ? (
                      <Badge className="bg-amber-500 hover:bg-amber-500">Invoice Sent</Badge>
                    ) : (
                      <Badge variant="destructive">Needs Invoice</Badge>
                    )}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <div><strong>Organization:</strong> {r.org_name}</div>
                    <div><strong>Amount:</strong> ${(r.amount_cents / 100).toFixed(2)}</div>
                    <div><strong>Unlocked:</strong> {new Date(r.created_at).toLocaleString()}</div>
                    {r.invoiced_at && <div><strong>Invoiced:</strong> {new Date(r.invoiced_at).toLocaleDateString()}</div>}
                    {r.invoice_paid_at && <div><strong>Paid:</strong> {new Date(r.invoice_paid_at).toLocaleDateString()}</div>}
                    {r.invoice_notes && <div><strong>Notes:</strong> {r.invoice_notes}</div>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(r); setNotes(r.invoice_notes || ""); }}>
                    Edit
                  </Button>
                  {r.invoice_status !== "sent" && r.invoice_status !== "paid" && (
                    <Button size="sm" onClick={() => updateStatus(r.id, { invoice_status: "sent", invoiced_at: new Date().toISOString() })}>
                      Mark Invoiced
                    </Button>
                  )}
                  {r.invoice_status !== "paid" && (
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, { invoice_status: "paid", invoice_paid_at: new Date().toISOString() })}>
                      Mark Paid
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invoice Notes</DialogTitle></DialogHeader>
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Customer name, PO#, invoice number, etc." />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => updateStatus(editing.id, { invoice_notes: notes })}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, Search, ExternalLink, StickyNote, DollarSign, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PayoutRow {
  id: string;
  date: string;
  organizer_name: string;
  tournament_name: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number | null;
  net_cents: number;
  method: "Stripe" | "PayPal";
  status: string;
  external_id: string | null;
  paypal_email: string | null;
  organization_id: string;
}

interface PayoutNote {
  id: string;
  note: string;
  created_at: string;
}

const cents = (v: number) => `$${(v / 100).toFixed(2)}`;

export default function AdminPayouts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [notes, setNotes] = useState<Record<string, PayoutNote[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<PayoutRow | null>(null);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Fetch Stripe transactions
    const { data: txns } = await supabase
      .from("platform_transactions")
      .select("id, created_at, amount_cents, platform_fee_cents, net_amount_cents, status, stripe_payment_intent_id, stripe_session_id, organization_id, tournament_id, description, type")
      .order("created_at", { ascending: false });

    // Fetch PayPal payouts
    const { data: paypal } = await supabase
      .from("paypal_payouts")
      .select("id, created_at, amount_cents, status, paypal_email, batch_id, organization_id, notes")
      .order("created_at", { ascending: false });

    // Fetch org names
    const orgIds = new Set<string>();
    txns?.forEach((t) => orgIds.add(t.organization_id));
    paypal?.forEach((p) => orgIds.add(p.organization_id));

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", Array.from(orgIds));

    const orgMap: Record<string, string> = {};
    orgs?.forEach((o) => (orgMap[o.id] = o.name));

    // Fetch tournament names for stripe txns
    const tournamentIds = (txns || []).filter((t) => t.tournament_id).map((t) => t.tournament_id!);
    let tournMap: Record<string, string> = {};
    if (tournamentIds.length) {
      const { data: tourns } = await supabase
        .from("tournaments" as any)
        .select("id, title")
        .in("id", tournamentIds);
      (tourns || []).forEach((t: any) => (tournMap[t.id] = t.title));
    }

    const stripeRows: PayoutRow[] = (txns || []).map((t) => {
      const stripeFee = Math.round(t.amount_cents * 0.029 + 30);
      return {
        id: t.id,
        date: t.created_at,
        organizer_name: orgMap[t.organization_id] || "Unknown",
        tournament_name: t.tournament_id ? tournMap[t.tournament_id] || null : null,
        gross_cents: t.amount_cents,
        platform_fee_cents: t.platform_fee_cents,
        stripe_fee_cents: stripeFee,
        net_cents: t.amount_cents - t.platform_fee_cents - stripeFee,
        method: "Stripe",
        status: t.status === "completed" ? "Completed" : t.status,
        external_id: t.stripe_payment_intent_id || t.stripe_session_id,
        paypal_email: null,
        organization_id: t.organization_id,
      };
    });

    const paypalRows: PayoutRow[] = (paypal || []).map((p) => ({
      id: p.id,
      date: p.created_at,
      organizer_name: orgMap[p.organization_id] || "Unknown",
      tournament_name: null,
      gross_cents: p.amount_cents,
      platform_fee_cents: 0,
      stripe_fee_cents: null,
      net_cents: p.amount_cents,
      method: "PayPal",
      status: p.status === "completed" ? "Completed" : p.status || "Pending",
      external_id: p.batch_id,
      paypal_email: p.paypal_email,
      organization_id: p.organization_id,
    }));

    setRows([...stripeRows, ...paypalRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Fetch all notes
    const { data: allNotes } = await supabase.from("payout_notes").select("id, transaction_id, note, created_at").order("created_at", { ascending: true });
    const noteMap: Record<string, PayoutNote[]> = {};
    allNotes?.forEach((n) => {
      if (!noteMap[n.transaction_id]) noteMap[n.transaction_id] = [];
      noteMap[n.transaction_id].push(n);
    });
    setNotes(noteMap);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (methodFilter !== "all" && r.method.toLowerCase() !== methodFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.organizer_name.toLowerCase().includes(s) ||
          (r.tournament_name || "").toLowerCase().includes(s) ||
          (r.external_id || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, search, methodFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross_cents,
        fees: acc.fees + r.platform_fee_cents,
        net: acc.net + r.net_cents,
      }),
      { gross: 0, fees: 0, net: 0 }
    );
  }, [filtered]);

  const exportCSV = () => {
    const header = "Date,Organizer,Tournament,Gross Amount ($),Platform Fee ($),Stripe Fee ($),Net to Organizer ($),Method,Status,External ID,Internal Notes";
    const csvRows = filtered.map((r) => {
      const rowNotes = (notes[r.id] || []).map((n) => n.note).join(" | ");
      return [
        new Date(r.date).toLocaleDateString(),
        `"${r.organizer_name}"`,
        `"${r.tournament_name || ""}"`,
        (r.gross_cents / 100).toFixed(2),
        (r.platform_fee_cents / 100).toFixed(2),
        r.stripe_fee_cents != null ? (r.stripe_fee_cents / 100).toFixed(2) : "",
        (r.net_cents / 100).toFixed(2),
        r.method,
        r.status,
        r.external_id || "",
        `"${rowNotes}"`,
      ].join(",");
    });
    const blob = new Blob([header + "\n" + csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teevents-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveNote = async () => {
    if (!selectedRow || !newNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("payout_notes").insert({
      transaction_id: selectedRow.id,
      source: selectedRow.method.toLowerCase(),
      note: newNote.trim(),
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) {
      toast({ title: "Error saving note", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Note saved" });
      setNewNote("");
      // Refresh notes
      const { data } = await supabase.from("payout_notes").select("id, transaction_id, note, created_at").eq("transaction_id", selectedRow.id).order("created_at", { ascending: true });
      setNotes((prev) => ({ ...prev, [selectedRow.id]: data || [] }));
    }
    setSavingNote(false);
  };

  const stripeLink = (id: string) => `https://dashboard.stripe.com/payments/${id}`;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payout Transactions</h1>
            <p className="text-sm text-muted-foreground">Read-only audit log — Stripe handles all automatic splits</p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gross Volume</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{cents(totals.gross)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees Earned</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{cents(totals.fees)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net to Organizers</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{cents(totals.net)}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search organizer, tournament, or Stripe ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Tournament</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Platform Fee</TableHead>
                <TableHead className="text-right">Stripe Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setSelectedRow(r); setNewNote(""); }}>
                    <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{r.organizer_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.tournament_name || "—"}</TableCell>
                    <TableCell className="text-right">{cents(r.gross_cents)}</TableCell>
                    <TableCell className="text-right">{cents(r.platform_fee_cents)}</TableCell>
                    <TableCell className="text-right">{r.stripe_fee_cents != null ? cents(r.stripe_fee_cents) : "N/A"}</TableCell>
                    <TableCell className="text-right font-medium">{cents(r.net_cents)}</TableCell>
                    <TableCell>
                      <Badge variant={r.method === "Stripe" ? "default" : "secondary"}>{r.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "Completed" || r.status === "completed" ? "default" : "outline"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {(notes[r.id]?.length || 0) > 0 && <StickyNote className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Detail</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {new Date(selectedRow.date).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Method:</span> {selectedRow.method}</div>
                <div><span className="text-muted-foreground">Organizer:</span> {selectedRow.organizer_name}</div>
                <div><span className="text-muted-foreground">Tournament:</span> {selectedRow.tournament_name || "—"}</div>
                <div><span className="text-muted-foreground">Gross:</span> {cents(selectedRow.gross_cents)}</div>
                <div><span className="text-muted-foreground">Platform Fee:</span> {cents(selectedRow.platform_fee_cents)}</div>
                <div><span className="text-muted-foreground">Stripe Fee:</span> {selectedRow.stripe_fee_cents != null ? cents(selectedRow.stripe_fee_cents) : "N/A"}</div>
                <div><span className="text-muted-foreground">Net:</span> <span className="font-semibold">{cents(selectedRow.net_cents)}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {selectedRow.status}</div>
                {selectedRow.paypal_email && <div><span className="text-muted-foreground">PayPal:</span> {selectedRow.paypal_email}</div>}
              </div>

              {selectedRow.method === "Stripe" && selectedRow.external_id && (
                <a href={stripeLink(selectedRow.external_id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" /> View in Stripe Dashboard
                </a>
              )}

              {/* Notes */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2"><StickyNote className="h-4 w-4" /> Internal Notes</h4>
                {(notes[selectedRow.id] || []).length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                {(notes[selectedRow.id] || []).map((n) => (
                  <div key={n.id} className="bg-muted p-2 rounded text-sm">
                    <p>{n.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Textarea placeholder="Add a note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[60px]" />
                </div>
                <Button size="sm" onClick={saveNote} disabled={savingNote || !newNote.trim()}>
                  {savingNote ? "Saving…" : "Save Note"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

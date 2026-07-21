import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const fmt = (c: number) => `$${((c || 0) / 100).toFixed(2)}`;

export default function LeagueReconciliation() {
  const [loading, setLoading] = useState(false);
  const [sinceDays, setSinceDays] = useState("90");
  const [leagueId, setLeagueId] = useState("");
  const [data, setData] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await (supabase as any).functions.invoke("admin-league-reconciliation", {
      body: { since_days: Number(sinceDays) || 90, league_id: leagueId.trim() || undefined },
    });
    setLoading(false);
    if (error) return toast({ title: "Reconciliation failed", description: error.message, variant: "destructive" });
    setData(res);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" /> League Fee Reconciliation
        </h1>
        <p className="text-sm text-muted-foreground">
          Compares the 5% TeeVents platform fee recorded in <code>league_payments</code> to Stripe application fees for each Connect account.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">Since (days)</label>
            <Input value={sinceDays} onChange={(e) => setSinceDays(e.target.value)} className="w-28" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-muted-foreground">League ID (optional)</label>
            <Input value={leagueId} onChange={(e) => setLeagueId(e.target.value)} placeholder="Leave blank for all leagues" />
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run reconciliation
          </Button>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gross</p><p className="text-xl font-bold">{fmt(data.totals.gross)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">DB 5% fee</p><p className="text-xl font-bold">{fmt(data.totals.db_fee)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stripe app fee</p><p className="text-xl font-bold">{fmt(data.totals.stripe_fee)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-emerald-700">Matched buckets</p><p className="text-xl font-bold text-emerald-800">{data.totals.matched}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-amber-700">Mismatched</p><p className="text-xl font-bold text-amber-800">{data.totals.mismatched}</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>League</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Connect Acct</TableHead>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">DB fee</TableHead>
                    <TableHead className="text-right">Stripe fee</TableHead>
                    <TableHead className="text-right">Diff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.league_name}</TableCell>
                      <TableCell>{r.event_name}{r.event_date ? ` · ${r.event_date}` : ""}</TableCell>
                      <TableCell className="font-mono text-[11px]">{r.stripe_account_id || "—"}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{fmt(r.db_gross_cents)}</TableCell>
                      <TableCell className="text-right">{fmt(r.db_fee_cents)}</TableCell>
                      <TableCell className="text-right">{fmt(r.stripe_fee_cents)}</TableCell>
                      <TableCell className={`text-right font-medium ${r.diff_cents === 0 ? "" : "text-amber-700"}`}>{fmt(r.diff_cents)}</TableCell>
                      <TableCell>
                        {r.matched ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Matched</Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Review</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Newly onboarded Connect accounts may show a Stripe fee lag of 2–7 days as initial funds clear; expect small transient diffs during that window.
          </p>
        </>
      )}
    </div>
  );
}

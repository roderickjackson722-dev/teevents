import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Percent, Wallet } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  kind: string;
  amount_cents: number;
  platform_fee_cents: number;
  status: string;
  stripe_payment_intent: string | null;
  payer_email: string | null;
  event?: { event_name: string; event_date: string } | null;
  member?: { member_name: string } | null;
};

const fmt = (c: number) => `$${((c || 0) / 100).toFixed(2)}`;

export default function LeaguePayoutsTab({ leagueId }: { leagueId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("league_payments")
        .select("id, created_at, kind, amount_cents, platform_fee_cents, status, stripe_payment_intent, payer_email, event:league_events(event_name, event_date), member:league_members(member_name)")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [leagueId]);

  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);
  const totals = useMemo(() => {
    const gross = paid.reduce((s, r) => s + (r.amount_cents || 0), 0);
    const fee = paid.reduce((s, r) => s + (r.platform_fee_cents || 0), 0);
    return { gross, fee, net: gross - fee, count: paid.length };
  }, [paid]);

  const byEvent = useMemo(() => {
    const map = new Map<string, { name: string; date: string; count: number; gross: number; fee: number }>();
    for (const r of paid) {
      const key = r.event?.event_name ? `${r.event.event_name}` : (r.kind === "membership" ? "Memberships" : "Other");
      const cur = map.get(key) || { name: key, date: r.event?.event_date || "", count: 0, gross: 0, fee: 0 };
      cur.count += 1;
      cur.gross += r.amount_cents || 0;
      cur.fee += r.platform_fee_cents || 0;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [paid]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Paid charges</p><p className="text-2xl font-bold">{totals.count}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div><p className="text-xs text-muted-foreground">Gross collected</p><p className="text-2xl font-bold">{fmt(totals.gross)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Percent className="h-5 w-5 text-amber-600" />
          <div><p className="text-xs text-muted-foreground">TeeVents fee (5%)</p><p className="text-2xl font-bold">{fmt(totals.fee)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Your net</p><p className="text-2xl font-bold">{fmt(totals.net)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">By event</h3>
          {byEvent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid charges yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fee (5%)</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byEvent.map((e) => (
                  <TableRow key={e.name}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.date || "—"}</TableCell>
                    <TableCell className="text-right">{e.count}</TableCell>
                    <TableCell className="text-right">{fmt(e.gross)}</TableCell>
                    <TableCell className="text-right text-amber-700">{fmt(e.fee)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(e.gross - e.fee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Recent charges</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{r.kind}</TableCell>
                      <TableCell>{r.member?.member_name || r.payer_email || "—"}</TableCell>
                      <TableCell>{r.event?.event_name || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(r.amount_cents)}</TableCell>
                      <TableCell className="text-right text-amber-700">{fmt(r.platform_fee_cents)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt((r.amount_cents || 0) - (r.platform_fee_cents || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{r.stripe_payment_intent || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Charges go directly to your connected Stripe account. TeeVents keeps a 5% application fee per transaction — payouts follow your Stripe schedule.
      </p>
    </div>
  );
}

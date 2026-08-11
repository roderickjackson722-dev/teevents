import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Percent, Wallet } from "lucide-react";
import FlightPayoutPlanner from "@/components/payouts/FlightPayoutPlanner";
import type { FlightBasis, FlightMethod } from "@/lib/flightPayouts";
import { listLeaguePayments } from "@/lib/leaguePayments.functions";

/** Same ledger the Payments tab uses, so Finances and Payments always agree. */
type Row = {
  id: string;
  created_at: string;
  kind: string;
  source: "online" | "manual";
  description: string;
  member_name: string | null;
  member_email: string | null;
  event_name: string | null;
  event_date: string | null;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  fees_cents: number;
  net_cents: number;
  stripe_payment_intent: string | null;
};

type Totals = {
  count: number;
  onlineCount: number;
  manualCount: number;
  gross: number;
  platformFees: number;
  stripeFees: number;
  fees: number;
  net: number;
};

const fmt = (c: number) => `$${((c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LeaguePayoutsTab({ leagueId, showRecentCharges = true }: { leagueId: string; showRecentCharges?: boolean }) {
  const fetchLedger = useServerFn(listLeaguePayments);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [passFees, setPassFees] = useState(false);
  const [settings, setSettings] = useState<{ flights_enabled: boolean; flight_method: FlightMethod; flight_based_on: FlightBasis }>({
    flights_enabled: false,
    flight_method: "half",
    flight_based_on: "score",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ledger, mRes, lRes] = await Promise.all([
        fetchLedger({ data: { leagueId } }) as any,
        (supabase as any)
          .from("league_members")
          .select("id", { count: "exact", head: true })
          .eq("league_id", leagueId),
        (supabase as any)
          .from("golf_leagues")
          .select("flights_enabled, flight_method, flight_based_on, pass_platform_fee_to_members")
          .eq("id", leagueId)
          .maybeSingle(),
      ]);
      setRows((ledger?.payments as Row[]) || []);
      setTotals(ledger?.totals || null);
      setMemberCount(mRes.count || 0);
      if (lRes.data) {
        setPassFees(lRes.data.pass_platform_fee_to_members !== false);
        setSettings({
          flights_enabled: !!lRes.data.flights_enabled,
          flight_method: (lRes.data.flight_method as FlightMethod) || "half",
          flight_based_on: (lRes.data.flight_based_on as FlightBasis) || "score",
        });
      }
      setLoading(false);
    })();
  }, [leagueId, fetchLedger]);

  const saveFlightSettings = async (s: { flights_enabled: boolean; flight_method: FlightMethod; flight_based_on: FlightBasis }) => {
    const { error } = await (supabase as any).from("golf_leagues").update(s).eq("id", leagueId);
    if (error) throw error;
    setSettings(s);
  };

  const byEvent = useMemo(() => {
    const map = new Map<string, { name: string; date: string; count: number; gross: number; fee: number; net: number }>();
    for (const r of rows) {
      const key = r.event_name || (r.kind === "event" ? "Other events" : "Memberships");
      const cur = map.get(key) || { name: key, date: r.event_date || "", count: 0, gross: 0, fee: 0, net: 0 };
      cur.count += 1;
      cur.gross += r.gross_cents || 0;
      cur.fee += r.fees_cents || 0;
      cur.net += r.net_cents || 0;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [rows]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FlightPayoutPlanner
        defaultFieldSize={memberCount}
        defaultPurseCents={totals?.net || 0}
        potSourceLabel="net collected this season"
        flightsEnabled={settings.flights_enabled}
        flightMethod={settings.flight_method}
        flightBasedOn={settings.flight_based_on}
        onSaveSettings={saveFlightSettings}
        scope={{ league_id: leagueId }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
            <p className="text-2xl font-bold">{totals?.count ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">{totals?.onlineCount ?? 0} online · {totals?.manualCount ?? 0} manual</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div><p className="text-xs text-muted-foreground">Gross collected</p><p className="text-2xl font-bold">{fmt(totals?.gross || 0)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Percent className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-xs text-muted-foreground">Platform + Stripe fees</p>
            <p className="text-2xl font-bold">{fmt(totals?.fees || 0)}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(totals?.platformFees || 0)} platform · {fmt(totals?.stripeFees || 0)} card</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Your net</p>
            <p className="text-2xl font-bold">{fmt(totals?.net || 0)}</p>
            <p className="text-[10px] text-muted-foreground">{passFees ? "fees paid by registrants" : "fees deducted"}</p>
          </div>
        </CardContent></Card>

      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">By event</h3>
          {byEvent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
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
                    <TableCell className="text-right font-semibold">{fmt(e.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showRecentCharges && (
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Recent payments</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Gross is what the player paid, fees are the 5% TeeVents fee plus card processing, and net
            is what reaches you. Manual (offline) entries carry no fees. Only completed payments are
            shown — abandoned checkouts are excluded.
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Paid for</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{r.member_name || r.member_email || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(r.gross_cents)}</TableCell>
                      <TableCell className="text-right text-amber-700">{r.source === "manual" ? "—" : fmt(r.fees_cents)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(r.net_cents)}</TableCell>
                      <TableCell>
                        <Badge variant={r.source === "manual" ? "secondary" : "default"}>
                          {r.source === "manual" ? "Manual / offline" : "Online"}
                        </Badge>
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
      )}
      <p className="text-xs text-muted-foreground">
        Charges go directly to your connected Stripe account. TeeVents keeps a 5% application fee per transaction — payouts follow your Stripe schedule.
      </p>
    </div>
  );
}

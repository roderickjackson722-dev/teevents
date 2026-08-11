import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, CreditCard, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { listLeaguePayments, syncLeaguePaymentStatus } from "@/lib/leaguePayments.functions";

type LedgerRow = {
  id: string;
  kind: string;
  source: "online" | "manual";
  created_at: string;
  member_name: string | null;
  member_email: string | null;
  event_name: string | null;
  event_date: string | null;
  description: string;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  fees_cents: number;
  net_cents: number;
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

const money = (cents: number | null | undefined) =>
  `$${((cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LeaguePaymentsTab({ leagueId }: { leagueId: string }) {
  const fetchPayments = useServerFn(listLeaguePayments);
  const syncPayments = useServerFn(syncLeaguePaymentStatus);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await fetchPayments({ data: { leagueId } });
      setRows(res?.payments || []);
      setTotals(res?.totals || null);
    } catch (e: any) {
      toast.error(e?.message || "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [fetchPayments, leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res: any = await syncPayments({ data: { leagueId } });
      toast.success(
        res?.recovered
          ? `Found ${res.recovered} completed payment${res.recovered === 1 ? "" : "s"} in Stripe`
          : "Everything is already up to date with Stripe",
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Reconcile failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total collected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totals?.gross)}</div>
            <p className="text-[10px] text-muted-foreground">what players paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed payments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals?.count ?? 0}</div>
            <p className="text-[10px] text-muted-foreground">
              {totals?.onlineCount ?? 0} online · {totals?.manualCount ?? 0} manual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Platform + Stripe fees</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totals?.fees)}</div>
            <p className="text-[10px] text-muted-foreground">
              {money(totals?.platformFees)} platform · {money(totals?.stripeFees)} card
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net to you</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totals?.net)}</div>
            <p className="text-[10px] text-muted-foreground">after all fees</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Completed Payments</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Every completed membership and event payment for this league. Online payments show the
              full amount charged, the fees taken out, and your net. Manual entries were collected
              offline (cash/check) and carry no fees.
            </p>
          </div>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Reconcile with Stripe
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading payments…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No completed payments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Member</th>
                    <th className="py-2 pr-4 font-medium">Paid for</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Amount paid</th>
                    <th className="py-2 pr-4 font-medium">Platform + Stripe fees</th>
                    <th className="py-2 pr-4 font-medium">Net to you</th>
                    <th className="py-2 pr-4 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{r.member_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.member_email || ""}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{r.description}</div>
                        {r.event_date && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(r.event_date + "T12:00:00").toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{money(r.gross_cents)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {r.source === "manual" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <>
                            <div>{money(r.fees_cents)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {money(r.platform_fee_cents)} + {money(r.stripe_fee_cents)}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap font-medium">{money(r.net_cents)}</td>
                      <td className="py-2 pr-4">
                        {r.source === "manual" ? (
                          <Badge variant="secondary" className="gap-1">
                            <HandCoins className="h-3 w-3" /> Manual / offline
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                            <CreditCard className="h-3 w-3" /> Online
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

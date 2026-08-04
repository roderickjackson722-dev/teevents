import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listLeaguePayments, syncLeaguePaymentStatus } from "@/lib/leaguePayments.functions";

type PaymentRow = {
  id: string;
  kind: string;
  amount_cents: number | null;
  platform_fee_cents: number | null;
  status: string;
  created_at: string;
  member_name: string | null;
  member_email: string | null;
  event_name: string | null;
  event_date: string | null;
  stripe_payment_intent: string | null;
};

const money = (cents: number | null | undefined) =>
  `$${((cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LeaguePaymentsTab({ leagueId }: { leagueId: string }) {
  const fetchPayments = useServerFn(listLeaguePayments);
  const syncPayments = useServerFn(syncLeaguePaymentStatus);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await fetchPayments({ data: { leagueId } });
      setRows(res?.payments || []);
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
          ? `Recovered ${res.recovered} completed payment${res.recovered === 1 ? "" : "s"}`
          : `Checked ${res?.checked ?? 0} pending payment(s) — none had completed`,
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const paid = rows.filter((r) => r.status === "paid");
  const collected = paid.reduce((s, r) => s + (r.amount_cents || 0), 0);
  const fees = paid.reduce((s, r) => s + (r.platform_fee_cents || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(collected)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Paid transactions</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{paid.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Platform fees</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(fees)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Payment Status</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Every membership and event registration payment for this league. Use Sync with Stripe if a
              member says they paid but still shows pending.
            </p>
          </div>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync with Stripe
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading payments…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Member</th>
                    <th className="py-2 pr-4 font-medium">For</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
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
                        <div>{r.event_name || (r.kind === "membership" ? "League Membership" : r.kind)}</div>
                        {r.event_date && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(r.event_date + "T12:00:00").toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{money(r.amount_cents)}</td>
                      <td className="py-2 pr-4">
                        {r.status === "paid" ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
                        ) : r.status === "refunded" ? (
                          <Badge variant="secondary">Refunded</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
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

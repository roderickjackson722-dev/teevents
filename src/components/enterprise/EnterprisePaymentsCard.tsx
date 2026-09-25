import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, CreditCard, Loader2 } from "lucide-react";

interface Balance {
  connected: boolean;
  charges_enabled?: boolean;
  available?: Record<string, number>;
  pending?: Record<string, number>;
}
interface Tx {
  id: string;
  golfer_name: string | null;
  amount_cents: number;
  created_at: string;
  status: string | null;
}

const usd = (c = 0) => `$${(c / 100).toFixed(2)}`;

/**
 * Live Stripe status for paid Enterprise sign-ups. Registrations run through the
 * standard TeeVents checkout, which charges the organizer's connected account.
 */
export default function EnterprisePaymentsCard({ tournamentId }: { tournamentId: string }) {
  const { org } = useOrgContext();
  const [bal, setBal] = useState<Balance | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    Promise.all([
      supabase.functions.invoke("stripe-connect-balance", { body: { organization_id: org.orgId } }),
      (supabase.from("platform_transactions") as any)
        .select("id, golfer_name, amount_cents, created_at, status")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([b, t]) => {
      setBal(b.error ? { connected: false } : (b.data as Balance));
      setTxs((t.data || []) as Tx[]);
      setLoading(false);
    });
  }, [org, tournamentId]);

  const ready = bal?.connected && bal.charges_enabled;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          Taking payments
          {!loading && (
            <Badge variant={ready ? "default" : "outline"} className="gap-1">
              {ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {ready ? "Stripe connected" : bal?.connected ? "Setup unfinished" : "Not connected"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your account…
          </div>
        ) : ready ? (
          <>
            <p className="text-sm text-muted-foreground">
              Paid sign-ups are charged straight to your Stripe account.
            </p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="font-semibold">{usd(bal?.available?.usd)}</p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">On the way</p>
                <p className="font-semibold">{usd(bal?.pending?.usd)}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Connect your payout account so entry fees go straight to you. Until then, sign-ups still go through
            and TeeVents pays you out by hand.
          </p>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent payments</p>
          {txs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid sign-ups yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex justify-between py-1.5">
                  <span className="truncate">{t.golfer_name || "Player"}</span>
                  <span className="font-medium">{usd(t.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button asChild variant={ready ? "outline" : "default"} className={ready ? "w-full" : "w-full bg-secondary text-primary hover:bg-secondary/90"}>
          <Link to={ready ? "/dashboard/finances" : "/dashboard/payout-settings"}>
            <CreditCard className="mr-1.5 h-4 w-4" /> {ready ? "View all finances" : "Connect payout account"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

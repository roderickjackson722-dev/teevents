import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeDollarSign, CheckCircle2, Loader2, Percent, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  createFlatRateCheckout,
  getFlatRateStatus,
  verifyFlatRatePayment,
} from "@/lib/flatRate.functions";

type Status = Awaited<ReturnType<typeof getFlatRateStatus>>;

/**
 * Per-Event — $150 once per tournament removes the 5% platform fee.
 */
const FlatRateProCard = ({ tournamentId }: { tournamentId: string | null }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const loadStatus = async (id: string) => {
    setLoading(true);
    try {
      setStatus(await getFlatRateStatus({ data: { tournamentId: id } }));
    } catch (err: any) {
      toast.error(err?.message || "Could not load Per-Event pricing status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) loadStatus(tournamentId);
    else setStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // Confirm the Stripe return.
  useEffect(() => {
    const sessionId = searchParams.get("flat_rate_session_id");
    const canceled = searchParams.get("flat_rate_canceled");
    if (!sessionId && !canceled) return;
    (async () => {
      if (sessionId) {
        try {
          const res = await verifyFlatRatePayment({ data: { sessionId } });
          if (res.verified) {
            toast.success("Per-Event pricing is active — no 5% platform fee on this event.");
            if (res.tournament_id) await loadStatus(res.tournament_id);
          } else {
            toast.message("Payment is still processing. Refresh in a moment.");
          }
        } catch (err: any) {
          toast.error(err?.message || "Could not confirm the payment");
        }
      } else {
        toast.message("Checkout canceled — this event is still on No Cost to Start.");
      }
      const next = new URLSearchParams(searchParams);
      next.delete("flat_rate_session_id");
      next.delete("flat_rate_canceled");
      setSearchParams(next, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const price = useMemo(
    () => `$${((status?.amount_cents ?? 15000) / 100).toLocaleString("en-US")}`,
    [status],
  );
  const active = !!status?.flat_rate_enabled;

  const handlePurchase = async () => {
    if (!tournamentId) return;
    setPurchasing(true);
    try {
      const { url } = await createFlatRateCheckout({
        data: { tournamentId, origin: window.location.origin },
      });
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err: any) {
      toast.error(err?.message || "Could not start checkout");
      setPurchasing(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-secondary/40 bg-secondary/5 p-5 md:p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-full bg-secondary/20 text-secondary inline-flex items-center justify-center flex-shrink-0">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
              Per-Event — {price} per tournament
            </h2>
            {active && (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pay once and remove the 5% platform fee for{" "}
            <span className="font-semibold text-foreground">{status?.title || "this event"}</span>.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-foreground/90">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-secondary mt-0.5" /> No 5% platform fee on any transaction</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-secondary mt-0.5" /> Unlimited transactions</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-secondary mt-0.5" /> Same great features, no percentage fees</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Card processing fees from our payment processor still apply on every online payment.
          </p>

          <div className="mt-5">
            {loading ? (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking status
              </Button>
            ) : active ? (
              <div className="text-sm font-semibold text-secondary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {status?.admin_override
                  ? "Per-Event pricing granted for this event."
                  : `Purchased${status?.flat_rate_paid_at ? ` on ${new Date(status.flat_rate_paid_at).toLocaleDateString()}` : ""}.`}
              </div>
            ) : (
              <Button onClick={handlePurchase} disabled={purchasing || !tournamentId} size="lg">
                {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Select Per-Event
              </Button>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-4 flex items-start gap-2">
            <Percent className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Current plan:</span>{" "}
              {active ? "Per-Event (no 5% platform fee)" : "No Cost to Start (5% service fee covered by players)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlatRateProCard;

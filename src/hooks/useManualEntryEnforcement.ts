import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ManualEntityType = "player" | "sponsor" | "side_event" | "vendor" | "donation";
export type FeePaymentMethod = "deduct" | "instant";

export interface PendingEntry {
  entityType: ManualEntityType;
  entityId: string | null;
  amountCents: number;
  used: number;
  limit: number;
  feeCents: number;
  hasStripe: boolean;
  resolve: (proceed: boolean, amountCents?: number) => void;
}

export function useManualEntryEnforcement(tournamentId: string | null | undefined) {
  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const callRpc = useCallback(async (
    entityType: ManualEntityType,
    entityId: string | null,
    amountCents: number,
    confirmFee: boolean,
    paymentMethod: FeePaymentMethod = "deduct",
  ) => {
    const { data, error } = await (supabase as any).rpc("record_manual_entry", {
      _tournament_id: tournamentId,
      _entity_type: entityType,
      _entity_id: entityId,
      _amount_cents: Math.max(0, Math.round(amountCents || 0)),
      _confirm_fee: confirmFee,
      _payment_method: paymentMethod,
    });
    if (error) throw error;
    return data as {
      over_quota: boolean;
      confirmed: boolean;
      used: number;
      limit: number;
      fee_cents: number;
      fee_id?: string;
      transaction_id?: string;
      payment_method?: FeePaymentMethod;
    };
  }, [tournamentId]);

  const guard = useCallback(async (
    entityType: ManualEntityType,
    initialAmountCents: number,
    entityId: string | null = null,
  ): Promise<boolean> => {
    if (!tournamentId) return true;
    try {
      const first = await callRpc(entityType, entityId, initialAmountCents, false, "deduct");
      if (!first.over_quota) return true;

      const { data: tour } = await (supabase as any)
        .from("tournaments")
        .select("organizations(stripe_account_id)")
        .eq("id", tournamentId)
        .maybeSingle();
      const hasStripe = !!tour?.organizations?.stripe_account_id;

      return await new Promise<boolean>((resolve) => {
        setPending({
          entityType,
          entityId,
          amountCents: initialAmountCents,
          used: first.used,
          limit: first.limit,
          feeCents: first.fee_cents,
          hasStripe,
          resolve,
        });
      });
    } catch (e) {
      console.error("[useManualEntryEnforcement] guard failed", e);
      return true;
    }
  }, [tournamentId, callRpc]);

  const confirmPending = useCallback(async (amountCents: number, method: FeePaymentMethod) => {
    if (!pending) return;
    setSubmitting(true);
    try {
      const result = await callRpc(pending.entityType, pending.entityId, amountCents, true, method);

      if (method === "instant" && result.fee_id && result.transaction_id) {
        const { data, error } = await supabase.functions.invoke("charge-manual-entry-fee", {
          body: {
            fee_id: result.fee_id,
            transaction_id: result.transaction_id,
            return_url: window.location.href,
          },
        });
        if (error) throw error;
        if ((data as any)?.url) {
          window.open((data as any).url, "_blank");
          toast.success("Opening Stripe Checkout to pay fee…");
        }
      } else {
        toast.success(`Fee of $${(result.fee_cents / 100).toFixed(2)} will be deducted from your next payout.`);
      }

      pending.resolve(true, amountCents);
      setPending(null);
    } catch (e: any) {
      console.error("[useManualEntryEnforcement] confirm failed", e);
      toast.error(e?.message || "Failed to record fee");
      pending.resolve(false);
      setPending(null);
    } finally {
      setSubmitting(false);
    }
  }, [pending, callRpc]);

  const cancelPending = useCallback(() => {
    if (!pending) return;
    pending.resolve(false);
    setPending(null);
  }, [pending]);

  return { guard, pending, confirmPending, cancelPending, submitting };
}

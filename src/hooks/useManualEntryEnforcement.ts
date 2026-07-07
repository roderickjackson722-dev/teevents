import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ManualEntityType = "player" | "sponsor" | "side_event" | "vendor" | "donation";

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

/**
 * Wraps the record_manual_entry RPC. Call `guard()` before writing a manual entry.
 * If the tournament is at/over the free quota, opens the modal via `pending`;
 * caller renders <ManualEntryLimitModal /> and passes its confirm/cancel handlers.
 * Returns a Promise<boolean> — true if the caller should proceed with the insert.
 */
export function useManualEntryEnforcement(tournamentId: string | null | undefined) {
  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const callRpc = useCallback(async (
    entityType: ManualEntityType,
    entityId: string | null,
    amountCents: number,
    confirmFee: boolean,
  ) => {
    const { data, error } = await (supabase as any).rpc("record_manual_entry", {
      _tournament_id: tournamentId,
      _entity_type: entityType,
      _entity_id: entityId,
      _amount_cents: Math.max(0, Math.round(amountCents || 0)),
      _confirm_fee: confirmFee,
    });
    if (error) throw error;
    return data as {
      over_quota: boolean;
      confirmed: boolean;
      used: number;
      limit: number;
      fee_cents: number;
    };
  }, [tournamentId]);

  const guard = useCallback(async (
    entityType: ManualEntityType,
    initialAmountCents: number,
    entityId: string | null = null,
  ): Promise<boolean> => {
    if (!tournamentId) return true;
    try {
      const first = await callRpc(entityType, entityId, initialAmountCents, false);
      if (!first.over_quota) return true;

      // Check Stripe status for the org
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
      // Fail open to avoid blocking organizers on unexpected errors.
      return true;
    }
  }, [tournamentId, callRpc]);

  const confirmPending = useCallback(async (amountCents: number) => {
    if (!pending) return;
    setSubmitting(true);
    try {
      await callRpc(pending.entityType, pending.entityId, amountCents, true);
      pending.resolve(true, amountCents);
      setPending(null);
    } catch (e) {
      console.error("[useManualEntryEnforcement] confirm failed", e);
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AddonKey =
  | "custom_domain"
  | "unlimited_manual_entries"
  | "auction_raffle"
  | "custom_event_page"
  | "live_leaderboard"
  | "college_scoring"
  | "bundle";

export interface AddonFlags {
  custom_domain: boolean;
  unlimited_manual_entries: boolean;
  auction_raffle: boolean;
  custom_event_page: boolean;
  live_leaderboard: boolean;
  college_scoring: boolean;
  bundle: boolean;
}

const DEFAULT: AddonFlags = {
  custom_domain: false,
  unlimited_manual_entries: false,
  auction_raffle: false,
  custom_event_page: false,
  live_leaderboard: false,
  college_scoring: false,
  bundle: false,
};


/** Reads paid_features + manual entry quota columns for a tournament. */
export function useTournamentAddons(tournamentId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<AddonFlags>(DEFAULT);
  const [manualEntriesUsed, setUsed] = useState(0);
  const [manualEntriesFreeLimit, setFree] = useState(10);
  const [manualEntriesAdminOverride, setOverride] = useState(0);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("tournaments") as any)
        .select("paid_features, manual_entries_used, manual_entries_free_limit, manual_entries_admin_override")
        .eq("id", tournamentId)
        .maybeSingle();
      if (cancelled) return;
      const pf = (data?.paid_features as Partial<AddonFlags>) || {};
      setFlags({ ...DEFAULT, ...pf });
      setUsed(data?.manual_entries_used ?? 0);
      setFree(data?.manual_entries_free_limit ?? 10);
      setOverride(data?.manual_entries_admin_override ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const hasAddon = (k: AddonKey) => flags[k] || flags.bundle;
  const totalLimit = manualEntriesFreeLimit + manualEntriesAdminOverride;
  const unlimited = hasAddon("unlimited_manual_entries");
  const remaining = unlimited ? Infinity : Math.max(0, totalLimit - manualEntriesUsed);

  return {
    loading,
    flags,
    hasAddon,
    manualEntries: {
      used: manualEntriesUsed,
      freeLimit: manualEntriesFreeLimit,
      adminOverride: manualEntriesAdminOverride,
      totalLimit,
      remaining,
      unlimited,
    },
  };
}

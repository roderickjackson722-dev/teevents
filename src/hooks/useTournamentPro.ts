import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-tournament Pro unlock status.
 *
 * Under the new pricing model, Pro features ($399 unlock) are tied to a specific
 * tournament — not the organization as a whole. This hook returns whether the
 * given tournament has been upgraded.
 *
 * Org-level "pro" plan (legacy starter/premium that were migrated) also returns true
 * for backward compatibility.
 */
export function useTournamentPro(tournamentId: string | null | undefined) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!tournamentId) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("tournaments")
        .select("is_pro, organization_id")
        .eq("id", tournamentId)
        .maybeSingle();

      if (cancelled) return;

      if (t?.is_pro) {
        setIsPro(true);
        setLoading(false);
        return;
      }

      // Back-compat: org-level pro (migrated starter/premium) unlocks everything
      if (t?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("plan")
          .eq("id", t.organization_id)
          .maybeSingle();
        if (cancelled) return;
        const plan = (org?.plan || "").toLowerCase();
        setIsPro(plan === "pro" || plan === "enterprise" || plan === "starter" || plan === "premium");
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tournamentId]);

  return { isPro, loading };
}

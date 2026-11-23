import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Score verification: prizes count only published scores. `blocked` is true when the event has
 * verification On and any round with scores has not been published yet. Off events are never blocked.
 */
export function useVerifiedResultsGate(tournamentId: string | null | undefined) {
  const [state, setState] = useState<{ blocked: boolean; unpublished: number[] }>({ blocked: false, unpublished: [] });
  useEffect(() => {
    if (!tournamentId) return;
    let alive = true;
    (async () => {
      const sb = supabase as any;
      const { data: t } = await sb.from("tournaments").select("score_verification").eq("id", tournamentId).maybeSingle();
      if (!t || (t.score_verification ?? "off") === "off") { if (alive) setState({ blocked: false, unpublished: [] }); return; }
      const [{ data: hs }, { data: rs }] = await Promise.all([
        sb.from("score_hole_status").select("round_number").eq("tournament_id", tournamentId),
        sb.from("score_round_status").select("round_number, published_at").eq("tournament_id", tournamentId),
      ]);
      const rounds = [...new Set(((hs || []) as any[]).map((r) => r.round_number as number))];
      const published = new Set(((rs || []) as any[]).filter((r) => r.published_at).map((r) => r.round_number as number));
      const unpublished = rounds.filter((r) => !published.has(r)).sort((a, b) => a - b);
      if (alive) setState({ blocked: unpublished.length > 0, unpublished });
    })();
    return () => { alive = false; };
  }, [tournamentId]);
  return state;
}

export function VerifiedResultsNotice({ unpublished }: { unpublished: number[] }) {
  if (unpublished.length === 0) return null;
  return (
    <p className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-foreground">
      Score verification is On. Round {unpublished.join(", ")} results are not published yet, so prizes cannot be calculated.
      Lock the round and choose Publish Results on the Leaderboard page first.
    </p>
  );
}

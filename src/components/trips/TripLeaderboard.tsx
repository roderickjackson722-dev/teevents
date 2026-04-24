import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Lightweight live leaderboard derived from skins totals.
 * Future: add Ryder Cup match-points and stableford point totals.
 */
export default function TripLeaderboard({ tripId }: { tripId: string }) {
  const [rows, setRows] = useState<{ name: string; cents: number; skins: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: skins }, { data: pp }] = await Promise.all([
        supabase.from("trip_skins").select("winning_participant_id, amount_cents").eq("trip_id", tripId),
        supabase.from("trip_participants").select("id, name").eq("trip_id", tripId),
      ]);
      const totals: Record<string, { cents: number; skins: number }> = {};
      (skins || []).forEach((s: any) => {
        if (!s.winning_participant_id) return;
        totals[s.winning_participant_id] = totals[s.winning_participant_id] || { cents: 0, skins: 0 };
        totals[s.winning_participant_id].cents += s.amount_cents || 0;
        totals[s.winning_participant_id].skins += 1;
      });
      const r = (pp || [])
        .map((p: any) => ({ name: p.name, ...(totals[p.id] || { cents: 0, skins: 0 }) }))
        .sort((a, b) => b.cents - a.cents || b.skins - a.skins);
      setRows(r);
    })();
    const channel = supabase
      .channel(`trip-${tripId}-skins`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_skins", filter: `trip_id=eq.${tripId}` }, () => {
        // re-fetch
        (async () => {
          const [{ data: skins }, { data: pp }] = await Promise.all([
            supabase.from("trip_skins").select("winning_participant_id, amount_cents").eq("trip_id", tripId),
            supabase.from("trip_participants").select("id, name").eq("trip_id", tripId),
          ]);
          const totals: Record<string, { cents: number; skins: number }> = {};
          (skins || []).forEach((s: any) => {
            if (!s.winning_participant_id) return;
            totals[s.winning_participant_id] = totals[s.winning_participant_id] || { cents: 0, skins: 0 };
            totals[s.winning_participant_id].cents += s.amount_cents || 0;
            totals[s.winning_participant_id].skins += 1;
          });
          setRows((pp || []).map((p: any) => ({ name: p.name, ...(totals[p.id] || { cents: 0, skins: 0 }) })).sort((a, b) => b.cents - a.cents));
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <h4 className="font-semibold mb-3">Live Standings (Skins)</h4>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No participants or skins yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2">#</th><th>Player</th><th>Skins</th><th>Winnings</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className="border-b last:border-0">
                  <td className="py-2 font-mono">{i + 1}</td>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.skins}</td>
                  <td>${(r.cents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

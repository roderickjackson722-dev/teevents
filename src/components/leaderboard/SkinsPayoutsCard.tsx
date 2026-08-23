import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/formatCurrency";

type Row = {
  game_id: string;
  game_name: string;
  division_id: string | null;
  division_name: string | null;
  total_purse_cents: number;
  skin_format: string;
  carryover: boolean;
  round_number: number;
  hole_number: number | null;
  score: number | null;
  amount_cents: number | null;
  player_name: string | null;
};

/**
 * Public skins payout summary for a tournament's live leaderboard. Reads through
 * the public RPC so spectators see winners without any table access.
 */
export default function SkinsPayoutsCard({ tournamentId }: { tournamentId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (supabase as any)
      .rpc("get_public_division_skins", { _tournament_id: tournamentId })
      .then(({ data }: any) => {
        if (active) setRows((data as Row[]) || []);
      });
    return () => { active = false; };
  }, [tournamentId]);

  const games = useMemo(() => {
    const map = new Map<string, { info: Row; winners: Row[] }>();
    rows.forEach((r) => {
      const entry = map.get(r.game_id) || { info: r, winners: [] };
      if (r.hole_number != null) entry.winners.push(r);
      map.set(r.game_id, entry);
    });
    return Array.from(map.values());
  }, [rows]);

  if (games.length === 0) return null;

  return (
    <div className="space-y-4">
      {games.map(({ info, winners }) => {
        const open = !!expanded[info.game_id];
        const shown = open ? winners : winners.slice(0, 6);
        const skinValueCents = winners.length > 0 ? Math.round(info.total_purse_cents / winners.length) : 0;
        return (
          <div key={info.game_id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h3 className="font-display font-bold">
                Round {info.round_number || 1} Skins Payouts — {info.division_name || info.game_name}
              </h3>
              <span className="text-sm text-muted-foreground">
                Total Purse: {formatCents(info.total_purse_cents)}
                {info.skin_format === "net" ? " · Net" : " · Gross"}
              </span>
            </div>
            {winners.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skins won yet.</p>
            ) : (
              <>
                <div className="rounded-md border bg-primary/5 p-3 mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Each skin is worth</span>
                  <span className="text-lg font-bold text-primary">{formatCents(skinValueCents)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Hole</th>
                        <th className="px-2 py-1.5 text-left">Player</th>
                        <th className="px-2 py-1.5 text-center">Score</th>
                        <th className="px-2 py-1.5 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shown.map((w) => (
                        <tr key={`${info.game_id}-${w.hole_number}`}>
                          <td className="px-2 py-1.5">{w.hole_number}</td>
                          <td className="px-2 py-1.5">{w.player_name || "—"}</td>
                          <td className="px-2 py-1.5 text-center">{w.score ?? "—"}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{formatCents(w.amount_cents || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {winners.length > 6 && (
                  <button
                    className="mt-3 text-sm text-primary hover:underline"
                    onClick={() => setExpanded((e) => ({ ...e, [info.game_id]: !open }))}
                  >
                    {open ? "Hide full skins breakdown" : "View Full Skins Breakdown"}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

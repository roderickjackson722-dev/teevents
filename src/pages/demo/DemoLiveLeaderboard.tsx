import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

export default function DemoLiveLeaderboard() {
  const { token } = useParams();
  const [demo, setDemo] = useState<any>(null);
  const [board, setBoard] = useState<{ name: string; total: number; thru: number }[]>([]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: d } = await supabase.from("demo_tournaments").select("*").eq("public_token", token).maybeSingle();
      if (!d) return;
      setDemo(d);
      const { data: scores } = await supabase.from("demo_scores").select("*").eq("demo_tournament_id", d.id);
      const byTeam: Record<string, { total: number; holes: number }> = {};
      (scores || []).forEach((s: any) => {
        const t = byTeam[s.player_name] ||= { total: 0, holes: 0 };
        t.total += s.gross_score - 4; // par 4 baseline
        t.holes += 1;
      });
      const rows = Object.entries(byTeam)
        .map(([name, v]) => ({ name, total: v.total, thru: v.holes }))
        .sort((a, b) => a.total - b.total);
      setBoard(rows);
    })();
  }, [token]);

  if (!demo) return <div className="p-8 text-white bg-[#1a5c38] min-h-screen">Loading…</div>;

  return (
    <div className="min-h-screen bg-[#1a5c38] text-white">
      <SEO title={`${demo.tournament_name} Live (Demo)`} noindex />
      <div className="p-6 text-center border-b border-white/20">
        <Badge className="bg-[#F5A623] text-[#1a5c38] mb-2">DEMO</Badge>
        <h1 className="text-4xl font-bold">{demo.tournament_name}</h1>
        <p className="opacity-80">Live Leaderboard</p>
      </div>
      <div className="max-w-3xl mx-auto p-6">
        <table className="w-full text-lg">
          <thead>
            <tr className="border-b border-white/30 text-left">
              <th className="py-2 w-12">#</th>
              <th className="py-2">Team</th>
              <th className="py-2 w-20 text-right">Score</th>
              <th className="py-2 w-20 text-right">Thru</th>
            </tr>
          </thead>
          <tbody>
            {board.map((r, i) => (
              <tr key={r.name} className="border-b border-white/10">
                <td className="py-3 font-bold text-[#F5A623]">{i + 1}</td>
                <td className="py-3">{r.name}</td>
                <td className="py-3 text-right font-mono">{r.total === 0 ? "E" : r.total > 0 ? `+${r.total}` : r.total}</td>
                <td className="py-3 text-right">{r.thru}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

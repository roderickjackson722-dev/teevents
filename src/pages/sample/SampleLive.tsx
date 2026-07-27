import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatScore } from "@/lib/sampleMockData";

export default function SampleLive() {
  const { slug } = useParams<{ slug: string }>();
  const [sample, setSample] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("sample_tournaments").select("id,admin_id,unique_slug,tournament_name,event_date,location,description,logo_url,hero_image_url,scoring_format,registration_fee_cents,team_fee_cents,view_count,last_accessed_at,created_at,updated_at").eq("unique_slug", slug).maybeSingle();
      if (!s) return;
      setSample(s);
      const { data: lb } = await supabase.from("sample_leaderboard").select("*").eq("sample_tournament_id", s.id).order("position");
      setLeaderboard(lb || []);
    })();
  }, [slug]);

  if (!sample) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 border-b border-white/20 pb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-[#F5A623]">{sample.tournament_name}</h1>
          <div className="text-sm text-white/60 mt-1">LIVE LEADERBOARD</div>
        </div>
        <table className="w-full text-xl">
          <thead className="border-b-2 border-[#F5A623]">
            <tr className="text-left">
              <th className="py-3">POS</th>
              <th>TEAM</th>
              <th className="text-right">GROSS</th>
              <th className="text-right">NET</th>
              <th className="text-right">THRU</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(l => (
              <tr key={l.id} className="border-b border-white/10">
                <td className="py-3 font-bold text-[#F5A623]">{l.position}</td>
                <td className="font-semibold">{l.player_name}</td>
                <td className="text-right">{formatScore(l.gross_score)}</td>
                <td className="text-right">{formatScore(l.net_score)}</td>
                <td className="text-right">{l.thru}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-center text-white/40 text-xs mt-6">Powered by TeeVents</div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SampleLeaderboard from "@/components/sample/SampleLeaderboard";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import SEO from "@/components/SEO";

export default function SampleLive() {
  const { slug } = useParams<{ slug: string }>();
  const [sample, setSample] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase
        .from("sample_tournaments")
        .select(
          "id,admin_id,unique_slug,tournament_name,event_date,location,description,logo_url,hero_image_url,scoring_format,registration_fee_cents,team_fee_cents,primary_color,secondary_color,view_count,last_accessed_at,created_at,updated_at",
        )
        .eq("unique_slug", slug)
        .maybeSingle();
      if (!s) return;
      setSample(s);
      const { data: lb } = await supabase
        .from("sample_leaderboard")
        .select("*")
        .eq("sample_tournament_id", s.id)
        .order("position");
      setLeaderboard(lb || []);
    })();
  }, [slug]);

  if (!sample)
    return (
      <div className="min-h-screen bg-[#1a5c38] text-white flex items-center justify-center">
        Loading...
      </div>
    );

  const primary = sample.primary_color || "#1a5c38";
  const secondary = sample.secondary_color || "#F5A623";

  return (
    <div className="min-h-screen" style={{ backgroundColor: primary }}>
      <SEO
        title={`${sample.tournament_name} Live Leaderboard – Sample`}
        description="Branded sample live leaderboard"
        noIndex
      />
      <div
        className="px-4 py-2 text-center text-xs font-semibold"
        style={{ backgroundColor: secondary, color: primary }}
      >
        SAMPLE TV DISPLAY · Scores update automatically on a live TeeVents event
      </div>
      <SampleLeaderboard
        eventName={sample.tournament_name}
        rows={leaderboard}
        logoUrl={sample.logo_url}
        primaryColor={primary}
        secondaryColor={secondary}
      />
      <TeeventsFooter tournament={{ is_pro: false }} />
    </div>
  );
}

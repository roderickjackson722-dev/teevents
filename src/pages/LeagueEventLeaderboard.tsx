import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import LeagueTeamLeaderboard from "@/components/leagues/LeagueTeamLeaderboard";
import TeeventsFooter from "@/components/TeeventsFooter";
import type { LeaderboardPayload } from "@/lib/leagueTeamLeaderboard";

/** Public, shareable live leaderboard for a league event. */
export default function LeagueEventLeaderboard() {
  const { eventId } = useParams<{ eventId: string }>();
  const [info, setInfo] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!eventId) return;
      const { data } = await (supabase as any).rpc("get_league_event_leaderboard", { _event_id: eventId });
      setInfo(data?.found ? (data as LeaderboardPayload) : null);
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-xl font-semibold">Leaderboard not found</h1>
        <p className="text-sm text-muted-foreground">This event link may be incorrect or the event was removed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-4">
        <div className="text-center space-y-1">
          {info.league_logo_url && (
            <img src={info.league_logo_url} alt={`${info.league_name} logo`} className="h-14 mx-auto mb-2" />
          )}
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> {info.event_name}
          </h1>
          <p className="text-muted-foreground">
            {info.league_name}
            {info.event_date ? ` • ${info.event_date}` : ""}
            {info.course_name ? ` • ${info.course_name}` : ""}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <LeagueTeamLeaderboard eventId={eventId!} />
          </CardContent>
        </Card>
        <p className="text-xs text-center text-muted-foreground">Scores update live as teams enter them.</p>
      </main>
      <TeeventsFooter tournament={null} />
    </div>
  );
}

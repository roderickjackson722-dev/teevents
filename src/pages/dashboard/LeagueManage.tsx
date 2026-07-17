import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import LeagueMembersTab from "@/components/leagues/LeagueMembersTab";
import LeagueEventsTab from "@/components/leagues/LeagueEventsTab";
import LeaguePairingsTab from "@/components/leagues/LeaguePairingsTab";
import LeagueScoringTab from "@/components/leagues/LeagueScoringTab";
import LeagueSettingsTab from "@/components/leagues/LeagueSettingsTab";

export default function LeagueManage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!leagueId) return;
    const { data } = await (supabase as any).from("golf_leagues").select("*").eq("id", leagueId).maybeSingle();
    setLeague(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [leagueId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">League not found.</p>
        <Button asChild variant="link" className="px-0"><Link to="/dashboard/leagues">Back to leagues</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/dashboard/leagues"><ArrowLeft className="h-4 w-4 mr-1" /> All Leagues</Link>
        </Button>
        <h1 className="text-3xl font-bold">{league.league_name}</h1>
        {league.season_year && <p className="text-muted-foreground">Season: {league.season_year}</p>}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="pairings">Pairings</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4"><LeagueMembersTab leagueId={league.id} /></TabsContent>
        <TabsContent value="events" className="mt-4"><LeagueEventsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="pairings" className="mt-4"><LeaguePairingsTab leagueId={league.id} /></TabsContent>
        <TabsContent value="scoring" className="mt-4"><LeagueScoringTab leagueId={league.id} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><LeagueSettingsTab league={league} onSaved={load} /></TabsContent>
      </Tabs>
    </div>
  );
}

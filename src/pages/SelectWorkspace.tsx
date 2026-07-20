import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Flag, ArrowRight, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";

export default function SelectWorkspace() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leagueCount, setLeagueCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { count } = await (supabase as any)
        .from("golf_leagues")
        .select("id", { count: "exact", head: true });
      setLeagueCount(count || 0);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-6">
      <SEO title="Choose Your Workspace — TeeVents" description="Manage your golf tournament or your golf league." />
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">What would you like to manage today?</h1>
          <p className="text-muted-foreground text-lg">Switch between tournaments and leagues anytime.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary"
            onClick={() => navigate("/dashboard")}
          >
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Golf Tournaments</h2>
                <p className="text-muted-foreground mt-1">Single- or multi-day events, sponsors, registration, live scoring, and payouts.</p>
              </div>
              <Button className="w-full gap-2">
                Open Tournament Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary"
            onClick={() => navigate("/dashboard/leagues")}
          >
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Flag className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Golf Leagues</h2>
                <p className="text-muted-foreground mt-1">
                  Season-long play, weekly events, standings, skins, and handicaps.
                  {leagueCount > 0 && <span className="ml-1 font-medium">({leagueCount} league{leagueCount === 1 ? "" : "s"})</span>}
                </p>
              </div>
              <Button variant="secondary" className="w-full gap-2">
                Open League Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">← Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

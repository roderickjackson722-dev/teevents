import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

export default function DemoDayOfPage() {
  const { token } = useParams();
  const [demo, setDemo] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: d } = await supabase.from("demo_tournaments").select("*").eq("public_token", token).maybeSingle();
      if (!d) return;
      setDemo(d);
      const { data: pl } = await supabase.from("demo_players").select("*").eq("demo_tournament_id", d.id).order("group_name");
      setPlayers(pl || []);
    })();
  }, [token]);

  if (!demo) return <div className="p-8">Loading…</div>;

  const groups: Record<string, any[]> = {};
  players.forEach((p) => { (groups[p.group_name || "Unassigned"] ||= []).push(p); });

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${demo.tournament_name} Day-of (Demo)`} description="Demo" noIndex />
      <div className="bg-[#1a5c38] text-white p-6 text-center">
        <Badge className="bg-[#F5A623] text-[#1a5c38] mb-2">DEMO</Badge>
        <h1 className="text-3xl font-bold">{demo.tournament_name}</h1>
        <p className="opacity-80">Day-of Event Page</p>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle>Welcome!</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>Course:</strong> {demo.course_name}</div>
            <div><strong>Date:</strong> {demo.event_date}</div>
            <div><strong>Format:</strong> {demo.scoring_format}</div>
            <div className="text-muted-foreground pt-2">Check in at the registration tent. Cart staging begins 30 minutes before tee time.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Group</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(groups).map(([g, list]) => (
              <div key={g} className="border border-border rounded p-3">
                <div className="font-semibold mb-1">{g} <span className="text-xs text-muted-foreground">• Tee {list[0]?.tee_time}</span></div>
                {list.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">HCP {p.handicap}</span>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

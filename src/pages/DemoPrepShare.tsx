import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Download } from "lucide-react";
import SEO from "@/components/SEO";
import { generateDemoAgendaPdf } from "@/lib/demoAgendaPdf";

type ShareData = {
  tournament_title: string;
  prospect_name: string | null;
  platform: string | null;
  platform_other: string | null;
  notes: string | null;
  checklist: Record<string, boolean>;
  talking_points: { pain: string; solution: string }[];
  converted: boolean;
};

const CHECKLIST_LABELS: Record<string, string> = {
  confirm_details: "Confirm tournament details (name, date, location)",
  hero_image: "Confirm hero image uploaded",
  test_links: "Test demo links (website, dashboard, live leaderboard)",
  review_points: "Review competitor talking points",
  follow_up: "Prepare follow-up email template",
  calendly: "Set up Calendly link for next step",
};

export default function DemoPrepShare() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShareData | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: result } = await supabase.rpc("get_demo_prep_share", { _token: token });
      setData((result as any) || null);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="p-8">Loading…</div>;
  if (!data) return <div className="p-8">This share link is invalid or has been revoked.</div>;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Demo Prep – ${data.tournament_title}`} description="TeeVents demo preparation" noIndex />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1a5c38]">{data.tournament_title}</h1>
          <p className="text-muted-foreground">Demo preparation {data.prospect_name ? `for ${data.prospect_name}` : ""}</p>
          {data.converted && <Badge className="mt-2 bg-green-600">Converted to live tournament</Badge>}
        </div>

        {data.talking_points.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Talking Points</CardTitle>
              <CardDescription>Tailored to {data.platform_other || data.platform || "your current platform"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.talking_points.map((tp, i) => (
                <div key={i} className="border border-border rounded-md p-3 bg-muted/30">
                  <div className="text-sm font-medium text-destructive">Pain: {tp.pain}</div>
                  <div className="text-sm mt-1">→ {tp.solution}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Demo Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
              const done = !!data.checklist[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  {done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={done ? "line-through text-muted-foreground" : ""}>{label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {data.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent><div className="text-sm whitespace-pre-wrap">{data.notes}</div></CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          onClick={() => generateDemoAgendaPdf({
            tournamentName: data.tournament_title,
            prospectName: data.prospect_name || "",
            platform: (data.platform as any) || "other",
            notes: data.notes || "",
          })}
        >
          <Download className="h-4 w-4 mr-2" /> Download Demo Agenda PDF
        </Button>
      </div>
    </div>
  );
}

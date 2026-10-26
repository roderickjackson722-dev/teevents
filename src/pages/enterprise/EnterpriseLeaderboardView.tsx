import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { enterpriseLink } from "@/lib/enterpriseNavigation";
import { LiveLeaderboardEmbed } from "@/pages/LiveLeaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

/** Enterprise leaderboard view: the existing live leaderboard, read-only, inside the Enterprise shell. */
export default function EnterpriseLeaderboardView() {
  const { org } = useOrgContext();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const id = params.get("tournament_id");
  const [event, setEvent] = useState<{ title: string; slug: string | null } | null>(null);
  const [scoreCount, setScoreCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!org || !id) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: t }, { count }] = await Promise.all([
        (supabase.from("tournaments") as any).select("title, slug")
          .eq("id", id).eq("organization_id", org.orgId).eq("is_enterprise", true).maybeSingle(),
        (supabase.from("tournament_scores") as any).select("id", { count: "exact", head: true }).eq("tournament_id", id),
      ]);
      if (!alive) return;
      setEvent(t || null);
      setScoreCount(count ?? 0);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [org, id]);

  const scoresLink = enterpriseLink(`/enterprise/scores?tournament_id=${id}`, search);
  const settingsLink = enterpriseLink(`/enterprise/leaderboard-settings?tournament_id=${id}`, search);

  return (
    <EnterpriseLayout
      title={event?.title || "Leaderboard"}
      description="Live leaderboard for this event."
      crumbs={[{ label: "Leaderboard", to: "/enterprise/leaderboard" }, { label: event?.title || "Event" }]}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={enterpriseLink("/enterprise/leaderboard", search)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Leaderboard</Link>
        </Button>
        {event && scoreCount !== 0 && (
          <>
            <Button asChild variant="outline" size="sm"><Link to={scoresLink}>Enter scores</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={settingsLink}>Leaderboard settings</Link></Button>
          </>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event ? (
        <p className="text-sm text-muted-foreground">This event isn't available in your Enterprise workspace.</p>
      ) : scoreCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-medium">No scores yet</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild><Link to={scoresLink}>Enter scores</Link></Button>
              <Button asChild variant="outline"><Link to={settingsLink}>Leaderboard settings</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : unavailable || !event.slug ? (
        <p className="text-sm text-muted-foreground">The leaderboard is hidden or not available for this event. Check Leaderboard settings.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <LiveLeaderboardEmbed slug={event.slug} onUnavailable={() => setUnavailable(true)} />
        </div>
      )}
    </EnterpriseLayout>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Copy, Monitor, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import type { ScoringEvent } from "@/lib/collegeScoringAdapter";

/**
 * Printables, QR scoring codes and the live leaderboard surfaces for a college
 * event — the outputs organizers hand to players, scorers and the clubhouse.
 */
export function CollegeOutputsCard({ event }: { event: ScoringEvent }) {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("tournaments")
      .select("slug")
      .eq("id", event.id)
      .maybeSingle()
      .then(({ data }: any) => setSlug(data?.slug ?? null));
  }, [event.id]);

  const origin = typeof window === "undefined" ? "https://www.teevents.golf" : window.location.origin;
  const leaderboardUrl = slug ? `${origin}/t/${slug}/leaderboard` : "";

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" /> Customizable printables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Scorecards, pairing sheets, cart signs, alpha lists, check-in rosters and name badges — with your
            logo, colors, fonts and custom content.
          </p>
          <Button asChild size="sm">
            <Link to={`/dashboard/printables?tournament=${event.id}`}>
              Open printables <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" /> QR scoring codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate scoring QR codes and 6-digit passcodes so scorers post live scores from any phone browser —
            no app download.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to={`/dashboard/printables?tournament=${event.id}&tab=qr`}>
                Generate QR codes <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/score-admin">Scoring staff login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" /> Live leaderboard &amp; monitor display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share the public leaderboard URL, or open the full-screen display view on a clubhouse monitor.
          </p>
          {leaderboardUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1.5 rounded break-all">{leaderboardUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copy(leaderboardUrl)}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy URL
              </Button>
              <Button asChild size="sm">
                <a href={leaderboardUrl} target="_blank" rel="noreferrer">
                  Open leaderboard
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Publish this event to get its public leaderboard URL.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CollegeOutputsCard;

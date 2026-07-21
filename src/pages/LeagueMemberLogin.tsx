import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

export default function LeagueMemberLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = params.get("event");
  const [league, setLeague] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: lg } = await (supabase as any).from("golf_leagues").select("id, league_name, league_slug").eq("league_slug", slug).maybeSingle();
      setLeague(lg);
      if (eventId && lg) {
        // Basic uuid shape check
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
        if (!isUuid) {
          setEventError("The event link is malformed.");
          return;
        }
        const { data: ev } = await (supabase as any)
          .from("league_events").select("id, event_name, event_date, league_id")
          .eq("id", eventId).maybeSingle();
        if (!ev || ev.league_id !== lg.id) setEventError("That event no longer exists or belongs to another league.");
        else setEvent(ev);
      }
    })();
  }, [slug, eventId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6 || !league) {
      toast({ title: "Enter your 6-character code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_members")
      .select("id, scoring_code")
      .eq("league_id", league.id)
      .eq("scoring_code", clean)
      .maybeSingle();
    setLoading(false);
    if (!data) {
      toast({ title: "Code not recognized", variant: "destructive" });
      return;
    }
    if (eventId && !eventError) navigate(`/league/${slug}/register/${clean}?event=${eventId}`);
    else navigate(`/league/${slug}/me/${clean}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>League Member Login</CardTitle>
          {league && <p className="text-sm text-muted-foreground">{league.league_name}</p>}
          {event && <p className="text-xs text-primary mt-1">Registering for: <span className="font-medium">{event.event_name} — {event.event_date}</span></p>}
        </CardHeader>
        <CardContent>
          {eventError ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-destructive">{eventError}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/league/${slug}`)}>
                Back to league
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="ABC123"
                className="text-center text-3xl font-mono tracking-[0.5em] h-16"
              />
              <Button type="submit" className="w-full h-12" disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Your scoring code was provided by your league organizer.</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

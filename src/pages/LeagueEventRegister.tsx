import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, MapPin, DollarSign, CheckCircle2, CreditCard, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { LEAGUE_FORMATS } from "@/components/leagues/LeagueEventsTab";

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  individual_stroke: "Each player plays their own ball. Lowest total gross (or net) strokes wins.",
  match_play: "Head-to-head. Win a hole to earn a point; player with most holes won wins the match.",
  two_man_scramble: "Two-player teams. Both hit, pick the best shot, both hit again from there.",
  two_man_shamble: "Two-player teams. Both tee off, pick the best drive, then each plays their own ball in.",
  four_man_best_ball: "Four-player teams. Each plays their own ball; the team's score on each hole is the lowest score.",
  four_man_scramble: "Four-player teams. Everyone hits, pick the best shot, everyone plays from there.",
  stableford: "Points-based scoring — higher is better. Rewards aggressive play.",
  quota: "Each player has a target point quota based on handicap; play to exceed it.",
  team_points: "Team format with points allocated per hole based on team performance.",
  ryder_cup: "Two-team competition using a mix of match play formats.",
  round_robin: "Rotating opponents across the round or event.",
};

export default function LeagueEventRegister() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [params] = useSearchParams();
  const eventId = params.get("event");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug || !code || !eventId) { setLoading(false); return; }
      const { data: lg } = await (supabase as any).from("golf_leagues").select("*").eq("league_slug", slug).maybeSingle();
      if (!lg) { setLoading(false); return; }
      const { data: m } = await (supabase as any)
        .from("league_members").select("*")
        .eq("league_id", lg.id).eq("scoring_code", code.toUpperCase()).maybeSingle();
      if (!m) { setLoading(false); return; }
      const { data: ev } = await (supabase as any).from("league_events").select("*").eq("id", eventId).maybeSingle();
      const { data: reg } = await (supabase as any)
        .from("league_event_registrations").select("*")
        .eq("event_id", eventId).eq("member_id", m.id).maybeSingle();
      setLeague(lg); setMember(m); setEvent(ev); setRegistration(reg);
      setLoading(false);
    })();
  }, [slug, code, eventId]);

  const goToEvent = () => navigate(`/league/${slug}/me/${code}?event=${eventId}`);

  const registerFree = async () => {
    setSubmitting(true);
    const { data, error } = await (supabase as any)
      .from("league_event_registrations")
      .insert({ event_id: eventId, member_id: member.id, status: "registered", registration_fee_paid: true, fee_paid: true, paid_at: new Date().toISOString() })
      .select().maybeSingle();
    setSubmitting(false);
    if (error) return toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    setRegistration(data);
    toast({ title: "You're registered!" });
  };

  const payAndRegister = async () => {
    setSubmitting(true);
    const { data, error } = await (supabase as any).functions.invoke("create-league-event-checkout", {
      body: {
        event_id: eventId,
        member_id: member.id,
        scoring_code: code?.toUpperCase(),
        return_url: `${window.location.origin}/league/${slug}/me/${code}?event=${eventId}`,
      },
    });
    if (error || !data?.url) {
      setSubmitting(false);
      return toast({ title: "Checkout failed", description: error?.message || data?.error, variant: "destructive" });
    }
    window.location.href = data.url;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!league || !member || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-3">
        <p className="text-muted-foreground">Registration link is invalid or expired.</p>
        <Button asChild variant="link"><Link to={`/league/${slug}`}>Back to league</Link></Button>
      </div>
    );
  }

  const fmt = LEAGUE_FORMATS.find(f => f.id === event.format_type);
  const description = FORMAT_DESCRIPTIONS[event.format_type] || "";
  const feeDollars = (event.registration_fee_cents || 0) / 100;
  const alreadyRegistered = registration && (registration.registration_fee_paid || registration.fee_paid || feeDollars === 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Register — ${event.event_name}`} description={`Register for ${event.event_name} in ${league.league_name}`} />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/league/${slug}`}><ArrowLeft className="h-4 w-4 mr-1" /> {league.league_name}</Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-2xl">{event.event_name}</CardTitle>
              {fmt && <Badge variant="secondary">{fmt.name}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">Registering as <span className="font-medium">{member.member_name}</span></p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> {event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}</div>
              {event.course_name && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {event.course_name}</div>}
              <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> {feeDollars > 0 ? `$${feeDollars.toFixed(2)} entry fee` : "No entry fee"}</div>
              {event.registration_deadline && <div className="text-muted-foreground text-xs">Deadline: {event.registration_deadline}</div>}
            </div>

            {description && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold mb-1"><ClipboardList className="h-4 w-4" /> Format</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            )}

            {alreadyRegistered ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /> <span className="font-medium">You're registered for this event.</span></div>
                <Button className="w-full h-12" onClick={goToEvent}>Continue to Event →</Button>
              </div>
            ) : feeDollars > 0 ? (
              <Button className="w-full h-12" onClick={payAndRegister} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Pay ${feeDollars.toFixed(2)} & Register
              </Button>
            ) : (
              <Button className="w-full h-12" onClick={registerFree} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Registration
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

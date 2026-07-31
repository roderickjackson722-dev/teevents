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
import { formatCents, formatMoney } from "@/lib/formatCurrency";

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
  const [payment, setPayment] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const paySuccess = params.get("pay") === "success";

  const loadPayment = async (memberId: string) => {
    const { data: pay } = await (supabase as any)
      .from("league_payments")
      .select("id, amount_cents, platform_fee_cents, status, stripe_payment_intent, created_at")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .eq("kind", "event")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPayment(pay || null);
  };

  useEffect(() => {
    (async () => {
      if (!slug || !code || !eventId) { setLoading(false); return; }
      const { data: lg } = await (supabase as any).from("golf_leagues").select("*").eq("league_slug", slug).maybeSingle();
      if (!lg) { setLoading(false); return; }
      const { data: mRows } = await (supabase as any).rpc("lookup_league_member_by_code", {
        _league_slug: slug,
        _code: code.toUpperCase(),
      });
      const m = Array.isArray(mRows) ? mRows[0] : mRows;
      if (!m) { setLoading(false); return; }
      const { data: ev } = await (supabase as any).from("league_events").select("*").eq("id", eventId).maybeSingle();
      // Own registration is fetched through a code-verified lookup (not public data).
      const { data: regRows } = await (supabase as any).rpc("get_member_event_registration", {
        _league_slug: slug,
        _code: code.toUpperCase(),
        _event_id: eventId,
      });
      const reg = Array.isArray(regRows) ? regRows[0] : regRows;

      setLeague(lg); setMember(m); setEvent(ev); setRegistration(reg);
      await loadPayment(m.id);
      setLoading(false);
    })();
  }, [slug, code, eventId]);

  // If returning from Stripe, poll briefly for webhook to flip registration to paid.
  useEffect(() => {
    if (!paySuccess || !member?.id || !eventId) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      const { data: regRows } = await (supabase as any).rpc("get_member_event_registration", {
        _league_slug: slug,
        _code: (code || "").toUpperCase(),
        _event_id: eventId,
      });
      const reg = Array.isArray(regRows) ? regRows[0] : regRows;

      if (reg?.fee_paid) {
        setRegistration(reg);
        await loadPayment(member.id);
        clearInterval(t);
      } else if (tries > 15) {
        clearInterval(t);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [paySuccess, member?.id, eventId]);


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
    // Confirmation email to the player + league managers + TeeVents admin.
    if (data?.id) {
      fetch("/api/public/league-event-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: data.id }),
      }).catch(() => {});
    }
    toast({ title: "You're registered!", description: "A confirmation email is on its way." });
  };


  const payAndRegister = async () => {
    setSubmitting(true);
    const { data, error } = await (supabase as any).functions.invoke("create-league-event-checkout", {
      body: {
        event_id: eventId,
        member_id: member.id,
        scoring_code: code?.toUpperCase(),
        fee_tier_id: selectedTierId || undefined,
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
  if (!eventId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-3 text-center">
        <p className="text-lg font-semibold">Missing event</p>
        <p className="text-muted-foreground max-w-sm">This link is missing an event. Please open the registration link from the league schedule.</p>
        <Button asChild><Link to={`/league/${slug}`}>Back to league</Link></Button>
      </div>
    );
  }
  if (!league || !member || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-3 text-center">
        <p className="text-lg font-semibold">Registration link is invalid or expired</p>
        <p className="text-muted-foreground max-w-sm">The event may have been removed, or your scoring code doesn't match this league.</p>
        <Button asChild variant="outline"><Link to={`/league/${slug}`}>Back to league</Link></Button>
      </div>
    );
  }

  const fmt = LEAGUE_FORMATS.find(f => f.id === event.format_type);
  const description = FORMAT_DESCRIPTIONS[event.format_type] || "";
  const feeTiers: Array<{ id: string; label: string; amount_cents: number }> = Array.isArray(event.fee_tiers) ? event.fee_tiers : [];
  const hasTiers = feeTiers.length > 0;
  const selectedTier = hasTiers ? feeTiers.find(t => t.id === selectedTierId) : null;
  const baseFeeCents = event.registration_fee_cents || 0;
  const activeFeeCents = hasTiers ? (selectedTier?.amount_cents ?? 0) : baseFeeCents;
  const feeDollars = activeFeeCents / 100;
  const alreadyRegistered = registration && (registration.registration_fee_paid || registration.fee_paid);

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
              {!hasTiers && (
                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> {feeDollars > 0 ? `${formatMoney(feeDollars)} entry fee` : "No entry fee"}</div>
              )}
              {event.registration_deadline && <div className="text-muted-foreground text-xs">Deadline: {event.registration_deadline}</div>}
            </div>

            {description && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold mb-1"><ClipboardList className="h-4 w-4" /> Format</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            )}

            {!alreadyRegistered && hasTiers && (
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Choose your registration option</p>
                <div className="space-y-2">
                  {feeTiers.map(t => (
                    <label key={t.id} className={`flex items-center justify-between gap-3 p-3 rounded-md border cursor-pointer transition ${selectedTierId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="fee_tier"
                          value={t.id}
                          checked={selectedTierId === t.id}
                          onChange={() => setSelectedTierId(t.id)}
                        />
                        <span className="font-medium">{t.label}</span>
                      </div>
                      <span className="font-semibold">{formatCents(t.amount_cents)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {alreadyRegistered ? (
              <div className="space-y-3">
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Registration Confirmed</span>
                    <Badge className="ml-auto bg-emerald-600 hover:bg-emerald-600">PAID</Badge>
                  </div>
                  <div className="text-sm text-emerald-900/90 space-y-1">
                    <div><span className="text-emerald-800/70">Player:</span> <span className="font-medium">{member.member_name}</span></div>
                    <div><span className="text-emerald-800/70">Event:</span> <span className="font-medium">{event.event_name}</span> · {event.event_date}</div>
                    {registration?.fee_tier_label && (
                      <div><span className="text-emerald-800/70">Option:</span> <span className="font-medium">{registration.fee_tier_label}</span></div>
                    )}
                    {payment && (
                      <>
                        <div><span className="text-emerald-800/70">Amount:</span> <span className="font-medium">{formatCents((payment.amount_cents || 0))}</span></div>
                        {payment.stripe_payment_intent && (
                          <div className="font-mono text-[11px] break-all"><span className="text-emerald-800/70 font-sans">Reference:</span> {payment.stripe_payment_intent}</div>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800/70">A confirmation email has been sent to your address on file.</p>
                </div>
                <Button className="w-full h-12" onClick={goToEvent}>Continue to Leaderboard & Scoring →</Button>
              </div>
            ) : paySuccess ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 flex items-center gap-2 text-sm text-amber-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing your payment… this usually takes a few seconds.
              </div>
            ) : feeDollars > 0 ? (
              <Button className="w-full h-12" onClick={payAndRegister} disabled={submitting || (hasTiers && !selectedTierId)}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                {hasTiers && !selectedTierId ? "Select an option to continue" : `Pay ${formatMoney(feeDollars)} & Register`}
              </Button>
            ) : hasTiers ? (
              <Button className="w-full h-12" disabled>Select an option to continue</Button>
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

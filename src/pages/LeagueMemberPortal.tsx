import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import MemberSeasonStandingsCard from "@/components/leagues/MemberSeasonStandingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, User, Trophy, ArrowLeft, CreditCard, ClipboardList, Lock, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { LEAGUE_FORMATS } from "@/components/leagues/LeagueEventsTab";
import { buildAllocation } from "@/lib/leagueHandicap";

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

export default function LeagueMemberPortal() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [params] = useSearchParams();
  const preEventId = params.get("event");
  const [league, setLeague] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [standing, setStanding] = useState<any>(null);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [registration, setRegistration] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsReload, setEventsReload] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: lg } = await (supabase as any).from("golf_leagues").select("*").eq("league_slug", slug).maybeSingle();
      if (!lg) { setLoading(false); return; }
      const { data: mRows } = await (supabase as any).rpc("lookup_league_member_by_code", {
        _league_slug: slug || null,
        _code: (code || "").toUpperCase(),
      });
      const m = Array.isArray(mRows) ? mRows[0] : mRows;
      if (!m) { setLoading(false); return; }
      setLeague(lg); setMember(m);

      const [{ data: ev, error: evErr }, { data: st }] = await Promise.all([
        (supabase as any).from("league_events").select("id, event_name, event_date, registration_fee_cents, format_type, course_name, start_time, league_course_id").eq("league_id", lg.id).order("event_date"),
        (supabase as any).from("league_standings").select("*").eq("league_id", lg.id).eq("member_id", m.id).maybeSingle(),
      ]);
      setEventsError(evErr ? (evErr.message || "Could not load the schedule.") : null);
      setEvents(ev || []);
      const initial = preEventId && ev?.find((x: any) => x.id === preEventId) ? preEventId : ev?.[0]?.id;
      if (initial) setEventId(initial);
      setStanding(st);
      setLoading(false);
    })();
  }, [slug, code, eventsReload]);


  // Load registration + course + existing scores whenever selected event changes
  useEffect(() => {
    if (!eventId || !member) { setRegistration(null); setCourse(null); setScores({}); return; }
    (async () => {
      const ev = events.find((e: any) => e.id === eventId);
      const [{ data: regRows }, { data: existing }, courseRes] = await Promise.all([
        (supabase as any).rpc("get_member_event_registration", {
          _league_slug: slug || null,
          _code: (code || "").toUpperCase(),
          _event_id: eventId,
        }),
        (supabase as any).from("league_event_scores").select("hole_number, gross_score").eq("event_id", eventId).eq("member_id", member.id),
        ev?.league_course_id
          ? (supabase as any).from("league_courses").select("*").eq("id", ev.league_course_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const reg = Array.isArray(regRows) ? regRows[0] : regRows;

      setRegistration(reg);
      setCourse(courseRes?.data || null);
      const map: Record<number, string> = {};
      (existing || []).forEach((s: any) => { map[s.hole_number] = String(s.gross_score); });
      setScores(map);
    })();
  }, [eventId, member, events]);

  const save = async () => {
    if (!eventId || !member) return;
    setSaving(true);
    let count = 0;
    let lastError: any = null;
    for (let h = 1; h <= 18; h++) {
      const g = scores[h];
      if (g !== "" && g != null && !isNaN(Number(g))) {
        const { error } = await (supabase as any).rpc("member_submit_score", {
          _code: code?.toUpperCase(),
          _league_slug: slug,
          _event_id: eventId,
          _hole: h,
          _gross: Number(g),
        });
        if (error) lastError = error;
        else count++;
      }
    }
    if (count === 0) { toast({ title: "Enter at least one score" }); setSaving(false); return; }
    if (lastError) toast({ title: "Some scores failed", description: lastError.message, variant: "destructive" });
    else toast({ title: `Saved ${count} scores · handicap updated` });
    // Refresh member row so the just-recalculated Handicap Index shows up.
    const { data: freshRows } = await (supabase as any).rpc("lookup_league_member_by_code", {
      _league_slug: slug || null,
      _code: (code || "").toUpperCase(),
    });
    const fresh = Array.isArray(freshRows) ? freshRows[0] : freshRows;
    if (fresh) setMember(fresh);
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!league || !member) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-3">
      <p className="text-muted-foreground">Invalid code or league.</p>
      <Button asChild variant="link"><Link to={`/league/${slug}/score`}>Try again</Link></Button>
    </div>;
  }

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const total = holes.reduce((s, h) => s + Number(scores[h] || 0), 0);

  const selectedEvent = events.find(e => e.id === eventId);
  const feeCents = Number(selectedEvent?.registration_fee_cents || 0);
  const isRegistered = !!registration && (registration.registration_fee_paid || registration.fee_paid || feeCents === 0);

  // Build handicap allocation from course if available
  const alloc = course ? buildAllocation(member.handicap_index, {
    par_total: course.par_total,
    course_rating: course.course_rating,
    slope_rating: course.slope_rating,
    hole_pars: course.hole_pars,
    hole_stroke_indexes: course.hole_stroke_indexes,
  }) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${member.member_name} — ${league.league_name}`} description={`Member portal for ${league.league_name}`} />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/league/${slug}`}><ArrowLeft className="h-4 w-4 mr-1" /> {league.league_name}</Link>
        </Button>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {member.profile_image_url ? (
                <img src={member.profile_image_url} alt={`${member.member_name} headshot`} className="h-12 w-12 rounded-full object-cover border" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
              )}
              <div>
                <p className="text-xl font-bold">{member.member_name}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {member.membership_status}
                  {member.shirt_size ? ` · Shirt: ${member.shirt_size}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">Login code: <span className="font-mono">{member.scoring_code}</span></p>
              </div>
            </div>

            {standing && (
              <div className="text-right">
                <div className="text-2xl font-bold flex items-center gap-2 justify-end"><Trophy className="h-5 w-5 text-primary" /> {standing.points} pts</div>
                <p className="text-xs text-muted-foreground">{standing.matches_played} matches · {standing.wins ?? 0} wins</p>
              </div>
            )}
          </CardContent>
          <CardContent className="pt-0 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Handicap Index</p>
                <p className="text-xl font-bold">{member.handicap_index != null ? Number(member.handicap_index).toFixed(1) : "—"}</p>
                {member.handicap_updated_at && (
                  <p className="text-[10px] text-muted-foreground">Updated {new Date(member.handicap_updated_at).toLocaleDateString()}</p>
                )}
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Course Hcp</p>
                <p className="text-xl font-bold">{alloc ? alloc.courseHandicap : (member.course_handicap ?? "—")}</p>
                <p className="text-[10px] text-muted-foreground">{course ? "this event" : "select an event"}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Playing Hcp</p>
                <p className="text-xl font-bold">{alloc ? alloc.courseHandicap : (member.playing_handicap ?? "—")}</p>
                <p className="text-[10px] text-muted-foreground">applied to net</p>
              </div>
            </div>
          </CardContent>
        </Card>


        {member.membership_fee_cents > 0 && !member.membership_fee_paid && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold">Season Membership Fee</p>
                <p className="text-sm text-muted-foreground">${(member.membership_fee_cents/100).toFixed(2)} — pay to activate your membership.</p>
              </div>
              <Button
                onClick={async () => {
                  const { data, error } = await (supabase as any).functions.invoke("create-league-member-checkout", {
                    body: { member_id: member.id, scoring_code: code?.toUpperCase(), return_url: window.location.href },
                  });
                  if (error || !data?.url) return toast({ title: "Checkout failed", description: error?.message || data?.error, variant: "destructive" });
                  window.location.href = data.url;
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" /> Pay Membership
              </Button>
            </CardContent>
          </Card>
        )}

        {slug && <MemberSeasonStandingsCard leagueSlug={slug} highlightMemberId={member?.id} />}

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Events — tap one to register or enter scores</Label>
              <Button variant="ghost" size="sm" onClick={() => setEventsReload((n) => n + 1)}>Refresh</Button>
            </div>

            {eventsError && (
              <p className="text-sm text-destructive">
                {eventsError} Tap Refresh to try again.
              </p>
            )}

            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events on the schedule yet. If you expect events here, tap Refresh.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {events.map((e) => {
                    const active = e.id === eventId;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEventId(e.id)}
                        className={`w-full text-left rounded-lg border p-3 transition ${active ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <span className="block font-medium">{e.event_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {e.event_date}
                          {e.start_time ? ` · ${e.start_time}` : ""}
                          {e.course_name ? ` · ${e.course_name}` : ""}
                          {Number(e.registration_fee_cents || 0) > 0 ? ` · $${(e.registration_fee_cents / 100).toFixed(2)}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Native picker fallback — always works on older mobile browsers */}
                <select
                  aria-label="Choose event"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventId}
                  onChange={(ev) => setEventId(ev.target.value)}
                >
                  <option value="">Choose event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.event_name} — {e.event_date}</option>
                  ))}
                </select>
              </>
            )}
          </CardContent>
        </Card>


        {selectedEvent && (() => {
          const fmt = LEAGUE_FORMATS.find(f => f.id === selectedEvent.format_type);
          const desc = FORMAT_DESCRIPTIONS[selectedEvent.format_type];
          if (!fmt && !desc) return null;
          return (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <p className="flex items-center gap-2 text-sm font-semibold mb-1">
                  <ClipboardList className="h-4 w-4" /> Event Format{fmt ? ` · ${fmt.name}` : ""}
                </p>
                {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
              </CardContent>
            </Card>
          );
        })()}

        {/* Registration guard — the member is already signed in with their code here,
            so this is about joining the selected event, not logging in. */}
        {eventId && !isRegistered ? (
          <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <Lock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Membership Required</p>
                  <p className="text-sm text-muted-foreground">
                    Join this event to view the leaderboard and enter scores.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to={`/league/${slug}/register/${code}?event=${eventId}`}>
                  {feeCents > 0 ? `Join Event — $${(feeCents/100).toFixed(2)}` : "Join Event"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : eventId && isRegistered ? (
          <>
            <Card className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="pt-6">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  ✅ You are registered for this event.
                </p>
                <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  <p>Event: {selectedEvent?.event_name}</p>
                  <p>Date: {selectedEvent?.event_date}</p>
                  {registration?.tee_time && <p>Tee Time: {registration.tee_time}</p>}
                </div>
              </CardContent>
            </Card>

            {alloc && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Your Handicap Pops</h2>
                  <p className="text-xs text-muted-foreground">
                    Course Handicap {alloc.courseHandicap} · ● = you receive a stroke on this hole (net = gross − strokes)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse w-full">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="p-1 text-left">Hole</th>
                          {holes.map(h => <th key={h} className="p-1 min-w-[36px] text-center">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-1 font-medium">Par</td>
                          {alloc.holePars.map((p, i) => <td key={i} className="p-1 text-center">{p}</td>)}
                        </tr>
                        <tr>
                          <td className="p-1 font-medium">Pops</td>
                          {alloc.strokesPerHole.map((s, i) => (
                            <td key={i} className="p-1 text-center">
                              {s > 0 ? <span className="text-primary font-bold">{"●".repeat(Math.min(s, 3))}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold">Enter Your Score</h2>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Score
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {holes.map(h => <TableHead key={h} className="text-center min-w-[52px]">H{h}</TableHead>)}
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        {holes.map(h => {
                          const strokes = alloc?.strokesPerHole[h - 1] || 0;
                          return (
                            <TableCell key={h} className="p-1">
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={scores[h] ?? ""}
                                  onChange={(e) => setScores({ ...scores, [h]: e.target.value })}
                                  className="h-9 w-12 px-1 text-center"
                                />
                                {strokes > 0 && (
                                  <span className="absolute -top-1 -right-1 text-[9px] text-primary font-bold">
                                    {"•".repeat(Math.min(strokes, 2))}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold">{total || "—"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

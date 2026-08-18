import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy, Calendar, KeyRound, Sparkles, Smartphone, Ticket } from "lucide-react";
import SEO from "@/components/SEO";

export default function PublicLeague() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [skinTotals, setSkinTotals] = useState<Record<string, { count: number; cents: number }>>({});
  const [pastResults, setPastResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: lg } = await (supabase as any)
        .from("golf_leagues").select("*").eq("league_slug", slug).eq("is_public", true).maybeSingle();
      if (!lg) { setLoading(false); return; }
      setLeague(lg);

      // Member display names come from a safe lookup (no contact info is exposed publicly).
      const [{ data: ev }, { data: st }, { data: roster }] = await Promise.all([
        (supabase as any).from("league_events").select("*").eq("league_id", lg.id).order("event_date"),
        (supabase as any).from("league_standings").select("*").eq("league_id", lg.id).order("points", { ascending: false }).limit(25),
        (supabase as any).rpc("get_public_league_member_names", { _league_id: lg.id }),
      ]);
      const nameById: Record<string, string> = {};
      (roster || []).forEach((m: any) => { nameById[m.id] = m.member_name; });
      setEvents(ev || []);
      setStandings((st || []).map((s: any) => ({
        ...s,
        league_members: { member_name: nameById[s.member_id] || "Member" },
      })));

      // Aggregate skins per member (season-wide)
      const eventIds = (ev || []).map((e: any) => e.id);
      if (eventIds.length) {
        const { data: sk } = await (supabase as any)
          .from("league_skins")
          .select("winner_member_id, skin_amount_cents, event_id")
          .in("event_id", eventIds)
          .not("winner_member_id", "is", null);
        const totals: Record<string, { count: number; cents: number }> = {};
        (sk || []).forEach((row: any) => {
          const t = totals[row.winner_member_id] || { count: 0, cents: 0 };
          t.count += 1;
          t.cents += Number(row.skin_amount_cents || 0);
          totals[row.winner_member_id] = t;
        });
        setSkinTotals(totals);
      }

      // Past results: completed events with top 3 by total gross
      const completed = (ev || []).filter((e: any) => e.is_completed);
      const results: any[] = [];
      for (const e of completed) {
        const { data: scores } = await (supabase as any)
          .from("league_event_scores")
          .select("member_id, gross_score, net_score")
          .eq("event_id", e.id);
        const byMember: Record<string, { name: string; gross: number; net: number }> = {};
        (scores || []).forEach((s: any) => {
          const key = s.member_id;
          if (!byMember[key]) byMember[key] = { name: nameById[key] || "Member", gross: 0, net: 0 };
          byMember[key].gross += Number(s.gross_score || 0);
          byMember[key].net += Number(s.net_score || s.gross_score || 0);
        });
        const rows = Object.values(byMember).sort((a, b) => a.gross - b.gross).slice(0, 3);
        results.push({ event: e, top: rows });
      }

      setPastResults(results);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!league) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-3">League not found or not public.</p>
        <Button asChild variant="link"><Link to="/">Home</Link></Button>
      </div>
    );
  }

  const primary = league.primary_color || "#1a5c38";
  const accent = league.accent_color || "#F5A623";
  const fontColor = league.font_color || "#FFFFFF";
  const showSchedule = league.show_schedule !== false;
  const showStandings = league.show_standings !== false;
  const showResults = league.show_results !== false;
  const showRegister = league.show_register !== false;

  return (
    <div className="min-h-screen bg-background" style={{ ["--league-primary" as any]: primary, ["--league-accent" as any]: accent }}>
      <SEO
        title={`${league.league_name} — Golf League`}
        description={(league.description || league.tagline || `${league.league_name} standings, schedule and results.`).replace(/<[^>]+>/g, "").slice(0, 160)}
        path={`/league/${league.league_slug || slug}`}
        ogImage={league.logo_url || undefined}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card">
        <p className="text-sm font-semibold truncate">{league.league_name}</p>
        <Button size="sm" className="gap-2" style={{ background: accent, color: primary }} onClick={() => navigate(`/league/${slug}/score`)}>
          <KeyRound className="h-4 w-4" /> Login
        </Button>
      </div>
      {league.banner_url ? (
        <div className="relative">
          <img src={league.banner_url} alt="" className="w-full h-auto max-h-56 object-contain sm:h-56 sm:object-cover md:h-72" />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(0deg, ${primary}CC, ${primary}66)`, color: fontColor }}>
            <div className="text-center px-4 flex flex-col items-center gap-3">
              {league.logo_url && (
                <img
                  src={league.logo_url}
                  alt={`${league.league_name} logo`}
                  className="h-24 w-24 md:h-28 md:w-28 rounded-full object-contain bg-white p-2 shadow-lg ring-2 ring-white/60"
                  loading="eager"
                />
              )}
              <h1 className="text-3xl md:text-5xl font-bold drop-shadow">{league.league_name}</h1>
              {league.tagline && <p className="text-lg opacity-90">{league.tagline}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 px-6 text-center" style={{ background: primary, color: fontColor }}>
          {league.logo_url && (
            <img
              src={league.logo_url}
              alt={`${league.league_name} logo`}
              className="h-24 w-24 md:h-28 md:w-28 mx-auto mb-4 rounded-full object-contain bg-white p-2 shadow-lg"
              loading="eager"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold">{league.league_name}</h1>
          {league.tagline && <p className="mt-2 opacity-90">{league.tagline}</p>}
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {league.season_year && <p className="text-muted-foreground">Season {league.season_year}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {showRegister && (
              <Button
                onClick={() => navigate(`/league/${slug}/register`)}
                className="gap-2"
                style={{ background: accent, color: primary }}
              >
                <Ticket className="h-4 w-4" /> Join the League
              </Button>

            )}
            <Button
              onClick={() => navigate(`/league/${slug}/score`)}
              className="gap-2"
              style={{ background: primary, color: fontColor }}
            >
              <KeyRound className="h-4 w-4" /> Member Login
            </Button>
            <Button
              onClick={() => navigate(`/league/${slug}/score`)}
              variant="outline"
              className="gap-2"
            >
              <Smartphone className="h-4 w-4" /> Score on your phone
            </Button>
          </div>
        </div>

        {league.welcome_message && (
          <Card><CardContent className="pt-6"><p className="whitespace-pre-wrap">{league.welcome_message}</p></CardContent></Card>
        )}
        {league.description && !league.welcome_message && (
          <Card><CardContent className="pt-6"><p className="whitespace-pre-wrap">{league.description}</p></CardContent></Card>
        )}

        {showSchedule && (
          <Card id="schedule">
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: primary }}><Calendar className="h-5 w-5" /> Schedule</h2>
              {events.length === 0 ? <p className="text-muted-foreground text-sm">No events scheduled.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="text-right">{showRegister ? "Register" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.event_date}</TableCell>
                        <TableCell className="font-medium">
                          {e.event_name}
                          {e.skins_enabled && (
                            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-900 border-yellow-300 gap-1">
                              <Sparkles className="h-3 w-3" /> Skins
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{e.course_name || "—"}</TableCell>
                        <TableCell className="capitalize">{String(e.format_type || "").replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right">
                          {e.is_completed || (e.event_date && String(e.event_date) < new Date().toLocaleDateString("en-CA")) ? (
                            <Badge variant="secondary">Completed</Badge>
                          ) : showRegister ? (
                            <Button
                              size="sm"
                              style={{ background: accent, color: primary }}
                              onClick={() => navigate(`/league/${slug}/score?event=${e.id}`)}
                            >
                              Register
                              {Number(e.registration_fee_cents || 0) > 0 && (
                                <span className="ml-1 opacity-80">${(e.registration_fee_cents / 100).toFixed(0)}</span>
                              )}
                            </Button>
                          ) : (
                            <Badge>Upcoming</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {showStandings && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: primary }}><Trophy className="h-5 w-5" /> Season Standings</h2>
              {standings.length === 0 ? <p className="text-muted-foreground text-sm">Standings will appear once results are posted.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Matches</TableHead>
                      <TableHead className="text-right">Wins</TableHead>
                      <TableHead className="text-right">Prize Money</TableHead>
                      <TableHead className="text-right font-bold">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((s, i) => {
                      const skin = skinTotals[s.member_id];
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-bold">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.league_members.member_name}</TableCell>
                          <TableCell className="text-right">{s.matches_played}</TableCell>
                          <TableCell className="text-right">{s.wins ?? 0}</TableCell>
                          <TableCell className="text-right">
                            {skin && skin.cents > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-yellow-100 text-yellow-900 border border-yellow-300 font-medium">
                                <Sparkles className="h-3 w-3" /> ${(skin.cents / 100).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold">{s.points}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {showResults && pastResults.length > 0 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: primary }}><Trophy className="h-5 w-5" /> Previous Results</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pastResults.map(({ event, top }) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <p className="font-medium">{event.event_name}</p>
                    <p className="text-xs text-muted-foreground mb-3">{event.event_date} · {event.course_name || ""}</p>
                    {top.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scores posted.</p>
                    ) : (
                      <ol className="space-y-1 text-sm">
                        {top.map((r: any, i: number) => (
                          <li key={i} className="flex justify-between">
                            <span>{i + 1}. {r.name}</span>
                            <span className="text-muted-foreground">
                              <span className="font-medium text-foreground">{r.gross}</span> gross · {r.net} net
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/40" style={{ background: `${accent}15`, borderColor: accent }}>
          <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5" style={{ color: primary }} />
              <div>
                <p className="font-semibold">Members: enter your scores from your phone</p>
                <p className="text-sm text-muted-foreground">Use your 6‑character scoring code — no app required.</p>
              </div>
            </div>
            <Button onClick={() => navigate(`/league/${slug}/score`)} style={{ background: primary, color: fontColor }}>Open Scoring</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

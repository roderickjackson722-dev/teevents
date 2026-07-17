import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, User, Trophy, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

export default function LeagueMemberPortal() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [league, setLeague] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [standing, setStanding] = useState<any>(null);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: lg } = await (supabase as any).from("golf_leagues").select("*").eq("league_slug", slug).maybeSingle();
      if (!lg) { setLoading(false); return; }
      const { data: m } = await (supabase as any).from("league_members").select("*").eq("league_id", lg.id).eq("scoring_code", code?.toUpperCase()).maybeSingle();
      if (!m) { setLoading(false); return; }
      setLeague(lg); setMember(m);

      const [{ data: ev }, { data: st }] = await Promise.all([
        (supabase as any).from("league_events").select("id, event_name, event_date").eq("league_id", lg.id).order("event_date"),
        (supabase as any).from("league_standings").select("*").eq("league_id", lg.id).eq("member_id", m.id).maybeSingle(),
      ]);
      setEvents(ev || []);
      if (ev?.[0]) setEventId(ev[0].id);
      setStanding(st);
      setLoading(false);
    })();
  }, [slug, code]);

  useEffect(() => {
    if (!eventId || !member) return;
    (async () => {
      const { data } = await (supabase as any).from("league_event_scores").select("hole_number, gross_score").eq("event_id", eventId).eq("member_id", member.id);
      const m: Record<number, string> = {};
      (data || []).forEach((s: any) => { m[s.hole_number] = String(s.gross_score); });
      setScores(m);
    })();
  }, [eventId, member]);

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
    else toast({ title: `Saved ${count} scores` });
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
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-xl font-bold">{member.member_name}</p>
                <p className="text-sm text-muted-foreground">Handicap: {member.handicap_index ?? "—"} · Status: {member.membership_status}</p>
              </div>
            </div>
            {standing && (
              <div className="text-right">
                <div className="text-2xl font-bold flex items-center gap-2 justify-end"><Trophy className="h-5 w-5 text-primary" /> {standing.points} pts</div>
                <p className="text-xs text-muted-foreground">{standing.matches_played} matches · {standing.wins}-{standing.losses}-{standing.ties}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Enter Your Score</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <Label>Event</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger><SelectValue placeholder="Choose event" /></SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name} — {e.event_date}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={save} disabled={saving || !eventId}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Score
              </Button>
            </div>

            {eventId && (
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
                      {holes.map(h => (
                        <TableCell key={h} className="p-1">
                          <Input
                            type="number"
                            value={scores[h] ?? ""}
                            onChange={(e) => setScores({ ...scores, [h]: e.target.value })}
                            className="h-9 w-12 px-1 text-center"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">{total || "—"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import TeeventsFooter from "@/components/TeeventsFooter";

interface TeamInfo {
  found: boolean;
  pairing_id?: string;
  team_name?: string;
  scoring_code?: string;
  holes?: number;
  event_name?: string;
  event_date?: string;
  league_name?: string;
  course_name?: string;
  hole_pars?: number[] | null;
  players?: { id: string; name: string; handicap_index: number | null }[];
  scores?: Record<string, number>;
}

/** Public team score entry for league events (2-person scramble, 9 or 18 holes). */
export default function LeagueTeamScoring() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam || "");
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [hole, setHole] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const lookup = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("lookup_league_team_by_code", { _code: c.trim() });
    setLoading(false);
    if (error || !data?.found) {
      toast({ title: "Invalid scoring code", variant: "destructive" });
      return;
    }
    setTeam(data as TeamInfo);
    const existing: Record<number, number> = {};
    Object.entries((data.scores || {}) as Record<string, number>).forEach(([k, v]) => {
      if (v != null) existing[Number(k)] = Number(v);
    });
    setScores(existing);
    localStorage.setItem("league_team_code", c.trim().toUpperCase());
  };

  useEffect(() => {
    const saved = codeParam || localStorage.getItem("league_team_code") || "";
    if (saved) { setCode(saved); lookup(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  const holes = team?.holes === 9 ? 9 : 18;
  const pars = Array.isArray(team?.hole_pars) && team!.hole_pars!.length >= 18
    ? team!.hole_pars!.map((p) => Number(p) || 4)
    : Array(18).fill(4);

  const saveScore = async (h: number, value: number, advance: boolean) => {
    if (!team?.scoring_code) return;
    const next = { ...scores, [h]: value };
    setScores(next);
    setSaving(true);
    const payload: Record<string, number> = {};
    Object.entries(next).forEach(([k, v]) => { payload[k] = v; });
    const { data, error } = await (supabase as any).rpc("save_league_team_scores", {
      _code: team.scoring_code,
      _scores: payload,
    });
    setSaving(false);
    if (error || data?.ok === false) {
      toast({ title: "Save failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    if (advance && h < holes) setHole(h + 1);
  };

  const signOut = () => {
    localStorage.removeItem("league_team_code");
    setTeam(null);
    setCode("");
    navigate("/league-score", { replace: true });
  };

  if (!team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <h1 className="text-xl font-bold">Team Score Entry</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-character scoring code your league manager sent you.</p>
            <div>
              <Label>Scoring Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="font-mono text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            <Button className="w-full" onClick={() => lookup(code)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Start Scoring
            </Button>
          </CardContent>
        </Card>
        <TeeventsFooter tournament={null} />
      </div>
    );
  }

  const totalGross = Object.entries(scores)
    .filter(([h]) => Number(h) <= holes)
    .reduce((s, [, v]) => s + Number(v), 0);
  const played = Object.keys(scores).filter((h) => Number(h) <= holes).length;

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <div className="bg-card border-b">
        <div className="max-w-lg mx-auto p-4">
          <p className="text-xs text-muted-foreground">{team.league_name} · {team.event_name}</p>
          <h1 className="text-lg font-bold">{team.team_name}</h1>
          <p className="text-sm text-muted-foreground">
            {holes} holes{team.course_name ? ` · ${team.course_name}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Players: {(team.players || []).map((p) => p.name).join(", ")}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setHole(Math.max(1, hole - 1))} disabled={hole === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Hole</p>
                <p className="text-3xl font-bold">{hole}</p>
                <p className="text-xs text-muted-foreground">Par {pars[hole - 1]}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setHole(Math.min(holes, hole + 1))} disabled={hole === holes}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => (
                <Button
                  key={v}
                  variant={scores[hole] === v ? "default" : "outline"}
                  onClick={() => saveScore(hole, v, true)}
                  disabled={saving}
                >
                  {v}
                </Button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Tap the team score — it saves and moves to the next hole automatically.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Team total</span>
              <span>{totalGross} ({played} of {holes} holes)</span>
            </div>
            <div className="grid grid-cols-9 gap-1 text-center text-xs">
              {Array.from({ length: holes }, (_, i) => i + 1).map((h) => (
                <button
                  key={h}
                  onClick={() => setHole(h)}
                  className={`rounded border py-1 ${h === hole ? "border-primary font-bold" : ""}`}
                >
                  <span className="block text-muted-foreground">{h}</span>
                  <span className="block">{scores[h] ?? "—"}</span>
                </button>
              ))}
            </div>
            {played === holes && (
              <p className="text-sm text-center text-green-700 flex items-center justify-center gap-1 pt-2">
                <Check className="h-4 w-4" /> All {holes} holes recorded
              </p>
            )}
          </CardContent>
        </Card>

        {team.event_id && (
          <Button asChild variant="secondary" className="w-full">
            <a href={`/league-leaderboard/${team.event_id}`} target="_blank" rel="noreferrer">View Live Leaderboard</a>
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={signOut}>Exit scoring</Button>

      </div>
      <TeeventsFooter tournament={null} />
    </div>
  );
}

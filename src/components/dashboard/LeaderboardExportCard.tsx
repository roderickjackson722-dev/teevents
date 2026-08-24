import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPublicLeaderboardScores } from "@/lib/fetchLeaderboardScores";
import { buildLeaderboard, type LeaderboardRow } from "@/lib/liveLeaderboardRows";
import { getFormatById } from "@/lib/scoringFormats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tournamentId: string;
}

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(s: string) {
  return (s || "tournament").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

type Division = { key: string; label: string; rows: LeaderboardRow[] };

/**
 * Archive export — organizers can save the final leaderboard for every division
 * as CSV (summary standings and hole-by-hole scores) for their records.
 */
export default function LeaderboardExportCard({ tournamentId }: Props) {
  const [busy, setBusy] = useState<null | "summary" | "holes">(null);

  async function loadDivisions(): Promise<{ divisions: Division[]; title: string; isStableford: boolean }> {
    const [tRes, fRes, rRes, cRes, scores] = await Promise.all([
      (supabase as any)
        .from("tournaments")
        .select("title, scoring_format, course_par, course_name, date")
        .eq("id", tournamentId)
        .maybeSingle(),
      (supabase as any)
        .from("tournament_tiers")
        .select("id, tier_name, display_order")
        .eq("tournament_id", tournamentId)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      (supabase as any)
        .from("tournament_registrations")
        .select("id, flight_id")
        .eq("tournament_id", tournamentId),
      (supabase as any)
        .from("golf_courses")
        .select("hole_pars, par")
        .eq("tournament_id", tournamentId)
        .limit(1)
        .maybeSingle(),
      fetchAllPublicLeaderboardScores(tournamentId),
    ]);

    const tRow = tRes?.data || { title: "Tournament", scoring_format: "stroke_play", course_par: 72 };
    const holePars = (cRes?.data?.hole_pars as number[] | null) || null;
    // Prefer the course scorecard's par total (e.g. 71) over any stale value on the tournament.
    const coursePar = Number(cRes?.data?.par) > 0 ? Number(cRes.data.par) : Number(tRow.course_par) || 72;
    const tournament = { ...tRow, course_par: coursePar };
    const regFlights: Record<string, string | null> = {};
    (rRes?.data || []).forEach((r: any) => { regFlights[r.id] = r.flight_id; });
    const flightOf = (s: any) => (s?.flight_id as string | null) ?? regFlights[s?.registration_id] ?? null;

    const divisions: Division[] = ((fRes?.data as any[]) || []).map((f) => ({
      key: f.id,
      label: f.tier_name,
      rows: buildLeaderboard(scores.filter((s: any) => flightOf(s) === f.id), tournament, holePars),
    }));
    divisions.push({ key: "__overall", label: "Overall", rows: buildLeaderboard(scores, tournament, holePars) });

    return {
      divisions: divisions.filter((d) => d.rows.length > 0),
      title: tournament.title || "Tournament",
      isStableford: getFormatById(tournament.scoring_format || "stroke_play")?.scoring === "stableford",
    };
  }


  async function exportSummary() {
    setBusy("summary");
    try {
      const { divisions, title, isStableford } = await loadDivisions();
      if (divisions.length === 0) { toast.error("No scores to export yet."); return; }
      const header = [
        "division", "position", "name", "team_players",
        isStableford ? "points" : "total_strokes",
        "to_par", "thru", "round_totals",
      ];
      const lines: string[] = [header.join(",")];
      divisions.forEach((d) => {
        d.rows.forEach((r, i) => {
          const toPar = isStableford ? "" : Number(r.total || 0) - Number(r.parPlayed || 0);
          const rounds = Object.entries(r.roundTotals || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([n, v]) => `R${n}: ${v}`)
            .join(" | ");
          lines.push([
            d.label, i + 1, r.name, (r.players || []).join(" / "),
            r.total, toPar === "" ? "" : (Number(toPar) > 0 ? `+${toPar}` : toPar),
            r.thru, rounds,
          ].map(esc).join(","));
        });
      });
      download(`${slugify(title)}-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
      toast.success("Leaderboard exported");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function exportHoles() {
    setBusy("holes");
    try {
      const { divisions, title } = await loadDivisions();
      if (divisions.length === 0) { toast.error("No scores to export yet."); return; }
      const header = ["division", "name", "team_players", "round", ...Array.from({ length: 18 }, (_, i) => `h${i + 1}`), "round_total"];
      const lines: string[] = [header.join(",")];
      divisions.forEach((d) => {
        d.rows.forEach((r) => {
          const byRound = r.holesByRound || {};
          Object.keys(byRound)
            .sort((a, b) => Number(a) - Number(b))
            .forEach((round) => {
              const holes = byRound[Number(round)] || {};
              const cells = Array.from({ length: 18 }, (_, i) => holes[i + 1] ?? "");
              const total = Object.values(holes).reduce((n: number, v: any) => n + Number(v || 0), 0);
              lines.push([d.label, r.name, (r.players || []).join(" / "), round, ...cells, total].map(esc).join(","));
            });
        });
      });
      download(`${slugify(title)}-hole-by-hole-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
      toast.success("Hole-by-hole scores exported");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!tournamentId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" /> Export &amp; Archive Results
        </CardTitle>
        <CardDescription>
          Save the final standings for every division to your own records. Files open in Excel,
          Numbers or Google Sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportSummary} disabled={busy !== null}>
          {busy === "summary" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Leaderboard (All Divisions)
        </Button>
        <Button variant="outline" onClick={exportHoles} disabled={busy !== null}>
          {busy === "holes" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Hole-by-Hole Scores
        </Button>
      </CardContent>
    </Card>
  );
}

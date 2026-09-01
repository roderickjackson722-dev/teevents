import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  divisionIdFromName,
  normalizeStatus,
  playerName,
  type Division,
  type PlayerRow,
} from "@/lib/collegeScoring";
import type { ScoringEvent } from "@/lib/collegeScoringAdapter";

interface TeamRow {
  id: string;
  team_name: string;
  division_id: string | null;
}

interface Props {
  event: ScoringEvent;
  onChanged: () => void;
}

/**
 * Organizer-only setup: grand event title, divisions, rounds, teams, and
 * assigning each player to a team + division.
 */
export function CollegeEventSetupCard({ event, onChanged }: Props) {
  const [eventTitle, setEventTitle] = useState(event.eventTitle || "");
  const [rounds, setRounds] = useState(String(event.rounds));
  const [teamSize, setTeamSize] = useState(String(event.teamSize ?? 5));
  const [countingScores, setCountingScores] = useState(String(event.countingScores ?? 4));
  const [divisions, setDivisions] = useState<Division[]>(event.divisions);
  const [newDivision, setNewDivision] = useState("");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [newTeam, setNewTeam] = useState("");
  const [newTeamDivision, setNewTeamDivision] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEventTitle(event.eventTitle || "");
    setRounds(String(event.rounds));
    setTeamSize(String(event.teamSize ?? 5));
    setCountingScores(String(event.countingScores ?? 4));
    setDivisions(event.divisions);
  }, [event.id, event.eventTitle, event.rounds, event.divisions]);

  const loadTeams = async () => {
    setLoading(true);
    const [{ data: teamRows }, { data: regRows }] = await Promise.all([
      (supabase as any)
        .from("tournament_teams")
        .select("id, team_name, division_id")
        .eq("tournament_id", event.id)
        .order("team_name"),
      (supabase as any)
        .from("tournament_registrations")
        .select("id, first_name, last_name, status, team_id, division_id")
        .eq("tournament_id", event.id)
        .order("last_name"),
    ]);
    setTeams((teamRows || []) as TeamRow[]);
    setPlayers(
      ((regRows || []) as any[]).map((r) => ({
        registration_id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        status: normalizeStatus(r.status),
        team_id: r.team_id ?? null,
        team_name: null,
        division_id: r.division_id ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const saveEvent = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("tournaments")
      .update({
        event_title: eventTitle || null,
        divisions,
        scoring_rounds: Math.max(1, Math.min(6, parseInt(rounds, 10) || 1)),
        college_team_size: Math.max(1, parseInt(teamSize, 10) || 5),
        college_counting_scores: Math.max(
          1,
          Math.min(
            Math.max(1, parseInt(teamSize, 10) || 5),
            parseInt(countingScores, 10) || 4,
          ),
        ),
      })
      .eq("id", event.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event structure saved");
    onChanged();
  };

  const addDivision = () => {
    const name = newDivision.trim();
    if (!name) return;
    const id = divisionIdFromName(name);
    if (divisions.some((d) => d.id === id)) return;
    setDivisions([...divisions, { id, name }]);
    setNewDivision("");
  };

  const addTeam = async () => {
    const name = newTeam.trim();
    if (!name) return;
    const { error } = await (supabase as any).from("tournament_teams").insert({
      tournament_id: event.id,
      team_name: name,
      division_id: newTeamDivision || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewTeam("");
    loadTeams();
  };

  const removeTeam = async (id: string) => {
    const { error } = await (supabase as any).from("tournament_teams").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    loadTeams();
    onChanged();
  };

  const assignPlayer = async (registrationId: string, teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    const { error } = await (supabase as any)
      .from("tournament_registrations")
      .update({
        team_id: teamId || null,
        division_id: team?.division_id ?? null,
        team_score_count: Math.max(1, parseInt(countingScores, 10) || 4),
      })
      .eq("id", registrationId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPlayers((prev) =>
      prev.map((p) =>
        p.registration_id === registrationId
          ? { ...p, team_id: teamId || null, division_id: team?.division_id ?? null }
          : p
      )
    );
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Event Structure – Divisions &amp; Teams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label>Grand Event Title</Label>
            <Input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="2026 HBCU College Golf Classic"
            />
          </div>
          <div className="space-y-1">
            <Label>Rounds (18 holes each)</Label>
            <Input
              type="number"
              min={1}
              max={6}
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Players per team</Label>
            <Input
              type="number"
              min={1}
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Counting scores</Label>
            <Input
              type="number"
              min={1}
              value={countingScores}
              onChange={(e) => setCountingScores(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:self-end sm:pb-2">
            Example: 5 players play and the best 4 scores count toward the team total. Rosters can hold as many
            players as your event needs.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Divisions</Label>
          <div className="flex flex-wrap gap-2">
            {divisions.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              >
                {d.name}
                <button
                  type="button"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => setDivisions(divisions.filter((x) => x.id !== d.id))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
            {!divisions.length && (
              <span className="text-sm text-muted-foreground">No divisions yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDivision}
              onChange={(e) => setNewDivision(e.target.value)}
              placeholder="Men's Division 1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDivision())}
            />
            <Button type="button" variant="outline" onClick={addDivision}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        <Button onClick={saveEvent} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Event Structure
        </Button>

        <div className="space-y-2 border-t pt-4">
          <Label>Teams (5 players, best 4 scores count)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              placeholder="FAMU"
              className="sm:max-w-xs"
            />
            <Select value={newTeamDivision} onValueChange={setNewTeamDivision}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Division (optional)" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={addTeam}>
              <Plus className="h-4 w-4 mr-1" /> Add Team
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                {t.team_name}
                <span className="text-xs text-muted-foreground">
                  {divisions.find((d) => d.id === t.division_id)?.name || "No division"}
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${t.team_name}`}
                  onClick={() => removeTeam(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Assign Players to Teams</Label>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
              {players.map((p) => (
                <div key={p.registration_id} className="flex items-center gap-3 p-2 text-sm">
                  <span className="flex-1 truncate">{playerName(p)}</span>
                  <Select
                    value={p.team_id || "none"}
                    onValueChange={(v) => assignPlayer(p.registration_id, v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.team_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {!players.length && (
                <div className="p-3 text-sm text-muted-foreground">No registered players yet.</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

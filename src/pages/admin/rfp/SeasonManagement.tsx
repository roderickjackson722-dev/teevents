import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSeasons, upsertSeason, deleteSeason, upsertSeasonTeam, deleteSeasonTeam, saveStanding } from "@/lib/rfp.functions";
import { SPORT_TYPES } from "@/lib/rfp.functions";

const blankSeason = { name: "", sport_type: "baseball", season_type: "league", status: "draft", start_date: "", end_date: "" };
const blankTeam = { team_name: "", division: "", coach_name: "", coach_email: "" };

export default function SeasonManagement() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonForm, setSeasonForm] = useState<any>(blankSeason);
  const [teamForm, setTeamForm] = useState<any>(blankTeam);
  const [selected, setSelected] = useState<string>("");
  const [edits, setEdits] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listSeasons({ data: {} } as any);
      setSeasons(res.seasons || []);
      setTeams(res.teams || []);
      setStandings(res.standings || []);
      if (!selected && res.seasons?.length) setSelected(res.seasons[0].id);
    } catch (e: any) {
      toast.error(e?.message || "Could not load seasons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const seasonTeams = useMemo(() => teams.filter((t) => t.season_id === selected), [teams, selected]);
  const standingFor = (teamId: string) =>
    edits[teamId] || standings.find((s) => s.team_id === teamId) || { wins: 0, losses: 0, ties: 0, points: 0, runs_scored: 0, runs_allowed: 0 };

  const saveSeason = async () => {
    if (!seasonForm.name) return toast.error("Season name is required");
    try {
      await upsertSeason({ data: seasonForm } as any);
      toast.success("Season saved");
      setSeasonForm(blankSeason);
      await load();
    } catch (e: any) { toast.error(e?.message || "Could not save season"); }
  };

  const saveTeam = async () => {
    if (!selected) return toast.error("Select a season first");
    if (!teamForm.team_name) return toast.error("Team name is required");
    try {
      await upsertSeasonTeam({ data: { ...teamForm, season_id: selected } } as any);
      toast.success("Team saved");
      setTeamForm(blankTeam);
      await load();
    } catch (e: any) { toast.error(e?.message || "Could not save team"); }
  };

  const persistStanding = async (teamId: string) => {
    try {
      await saveStanding({ data: { ...standingFor(teamId), season_id: selected, team_id: teamId } } as any);
      toast.success("Standings saved");
      setEdits((p) => { const n = { ...p }; delete n[teamId]; return n; });
      await load();
    } catch (e: any) { toast.error(e?.message || "Could not save standings"); }
  };

  const numField = (teamId: string, key: string) => (
    <Input
      type="number"
      className="w-20"
      value={String(standingFor(teamId)[key] ?? 0)}
      onChange={(e) => setEdits((p) => ({ ...p, [teamId]: { ...standingFor(teamId), [key]: Number(e.target.value) } }))}
    />
  );

  return (
    <RfpAdminGate title="Season Management" subtitle="Create seasons, add teams and divisions, and maintain standings.">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">{seasonForm.id ? "Edit season" : "New season"}</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Season name</Label><Input value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} placeholder="Spring 2026 Season" /></div>
              <div>
                <Label>Sport</Label>
                <Select value={seasonForm.sport_type} onValueChange={(v) => setSeasonForm({ ...seasonForm, sport_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SPORT_TYPES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={seasonForm.season_type} onValueChange={(v) => setSeasonForm({ ...seasonForm, season_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="league">League</SelectItem><SelectItem value="tournament">Tournament</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Start date</Label><Input type="date" value={seasonForm.start_date || ""} onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })} /></div>
              <div><Label>End date</Label><Input type="date" value={seasonForm.end_date || ""} onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={seasonForm.status} onValueChange={(v) => setSeasonForm({ ...seasonForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveSeason}>{seasonForm.id ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}{seasonForm.id ? "Save season" : "Create season"}</Button>
              {seasonForm.id && <Button variant="ghost" onClick={() => setSeasonForm(blankSeason)}>Cancel</Button>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground">Seasons</h2></div>
            <Table>
              <TableHeader><TableRow><TableHead>Season</TableHead><TableHead>Sport</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Teams</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {seasons.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No seasons yet.</TableCell></TableRow>}
                {seasons.map((s) => (
                  <TableRow key={s.id} className={s.id === selected ? "bg-muted/40" : ""}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="capitalize">{(s.sport_type || "").replace("_", " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.start_date || "—"} → {s.end_date || "—"}</TableCell>
                    <TableCell className="capitalize">{s.status}</TableCell>
                    <TableCell>{teams.filter((t) => t.season_id === s.id).length}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(s.id)}>Manage</Button>
                      <Button size="sm" variant="ghost" onClick={() => setSeasonForm({ ...s, start_date: s.start_date || "", end_date: s.end_date || "" })}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Delete season and its teams?")) return; await deleteSeason({ data: { id: s.id } } as any); await load(); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {selected && (
            <Card className="p-4 space-y-4">
              <h2 className="font-semibold text-foreground">Teams &amp; standings — {seasons.find((s) => s.id === selected)?.name}</h2>
              <div className="grid gap-3 md:grid-cols-5 items-end">
                <div><Label>Team name</Label><Input value={teamForm.team_name} onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })} /></div>
                <div><Label>Division</Label><Input value={teamForm.division} onChange={(e) => setTeamForm({ ...teamForm, division: e.target.value })} /></div>
                <div><Label>Coach</Label><Input value={teamForm.coach_name} onChange={(e) => setTeamForm({ ...teamForm, coach_name: e.target.value })} /></div>
                <div><Label>Coach email</Label><Input type="email" value={teamForm.coach_email} onChange={(e) => setTeamForm({ ...teamForm, coach_email: e.target.value })} /></div>
                <Button onClick={saveTeam}><Plus className="h-4 w-4 mr-2" />Add team</Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead><TableHead>Division</TableHead><TableHead>Coach</TableHead>
                      <TableHead>W</TableHead><TableHead>L</TableHead><TableHead>T</TableHead><TableHead>Pts</TableHead>
                      <TableHead>Scored</TableHead><TableHead>Allowed</TableHead><TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonTeams.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">No teams in this season yet.</TableCell></TableRow>}
                    {seasonTeams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.team_name}</TableCell>
                        <TableCell>{t.division || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.coach_name || "—"}</TableCell>
                        <TableCell>{numField(t.id, "wins")}</TableCell>
                        <TableCell>{numField(t.id, "losses")}</TableCell>
                        <TableCell>{numField(t.id, "ties")}</TableCell>
                        <TableCell>{numField(t.id, "points")}</TableCell>
                        <TableCell>{numField(t.id, "runs_scored")}</TableCell>
                        <TableCell>{numField(t.id, "runs_allowed")}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => persistStanding(t.id)}><Save className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Remove team?")) return; await deleteSeasonTeam({ data: { id: t.id } } as any); await load(); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}
    </RfpAdminGate>
  );
}

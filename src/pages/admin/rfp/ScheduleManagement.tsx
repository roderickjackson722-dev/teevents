import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Pencil, Printer, RefreshCw, Save, Trash2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsvStream } from "@/lib/streamCsv";
import {
  deleteRfpScheduleEvent,
  listRfpSchedule,
  upsertRfpScheduleEvent,
} from "@/lib/rfpPrograms.functions";
import { deleteSeasonTeam, upsertSeasonTeam } from "@/lib/rfp.functions";

const emptyEvent = {
  id: undefined as string | undefined,
  title: "",
  event_type: "game",
  event_date: "",
  start_time: "18:00",
  end_time: "20:00",
  status: "scheduled",
  facility_id: "",
  season_id: "",
  team_id: "",
  opponent_team_id: "",
  notes: "",
};

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function RfpScheduleManagement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ events: [], facilities: [], seasons: [], teams: [] });
  const [draft, setDraft] = useState({ ...emptyEvent });
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [filterSeason, setFilterSeason] = useState("");
  const [filterFacility, setFilterFacility] = useState("");
  const [team, setTeam] = useState({ id: undefined as string | undefined, season_id: "", team_name: "", division: "", coach_name: "", coach_email: "" });

  const load = async () => {
    setLoading(true);
    try {
      setData(await listRfpSchedule({ data: {} } as any));
    } catch (error: any) {
      toast.error(error?.message || "Could not load the schedule");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const events = useMemo(
    () => (data.events as any[]).filter((e) =>
      (!filterSeason || e.season_id === filterSeason) && (!filterFacility || e.facility_id === filterFacility)),
    [data.events, filterSeason, filterFacility],
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const facilityName = (id: string | null) => (data.facilities as any[]).find((f) => f.id === id)?.name || "—";
  const teamName = (id: string | null) => (data.teams as any[]).find((t) => t.id === id)?.team_name || "—";
  const seasonName = (id: string | null) => (data.seasons as any[]).find((s) => s.id === id)?.name || "—";

  const save = async (payload: any = draft) => {
    setSaving(true);
    try {
      await upsertRfpScheduleEvent({
        data: {
          ...payload,
          facility_id: payload.facility_id || null,
          season_id: payload.season_id || null,
          team_id: payload.team_id || null,
          opponent_team_id: payload.opponent_team_id || null,
        },
      } as any);
      toast.success("Schedule saved");
      if (payload === draft) setDraft({ ...emptyEvent });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save the event");
    } finally {
      setSaving(false);
    }
  };

  const move = async (event: any, newDate: string) => {
    if (event.event_date === newDate) return;
    await save({ ...event, event_date: newDate });
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this scheduled event?")) return;
    await deleteRfpScheduleEvent({ data: { id } } as any);
    toast.success("Event deleted");
    await load();
  };

  const exportCsv = async () => {
    await downloadCsvStream(
      `rfp-schedule-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Start", "End", "Type", "Title", "Facility", "Season", "Team", "Opponent", "Status"],
      events.map((e) => [e.event_date, e.start_time, e.end_time, e.event_type, e.title || "", facilityName(e.facility_id), seasonName(e.season_id), teamName(e.team_id), teamName(e.opponent_team_id), e.status]),
    );
    toast.success("Schedule exported");
  };

  const saveTeam = async () => {
    if (!team.season_id || !team.team_name) return toast.error("Season and team name are required");
    try {
      await upsertSeasonTeam({ data: team } as any);
      toast.success("Team saved");
      setTeam({ id: undefined, season_id: "", team_name: "", division: "", coach_name: "", coach_email: "" });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save the team");
    }
  };

  return (
    <RfpAdminGate title="Scheduling & Team Admin" subtitle="Private game and practice scheduling, facility assignments, rosters and coaches.">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="list">Schedule list</TabsTrigger>
            <TabsTrigger value="teams">Teams & coaches</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4 pt-4">
            <Card className="p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1"><Label>Week of</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
              <div className="space-y-1"><Label>Season</Label>
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
                  <option value="">All</option>{(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Facility</Label>
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)}>
                  <option value="">All</option>{(data.facilities as any[]).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>Previous week</Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week</Button>
              <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button>
              <Button variant="outline" size="sm" onClick={() => void exportCsv()}><Download className="h-4 w-4" />Export CSV</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / PDF</Button>
            </Card>

            <p className="text-sm text-muted-foreground">Drag an event card onto another day to move it.</p>
            <div className="grid gap-2 md:grid-cols-7">
              {days.map((day) => (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain");
                    const found = (data.events as any[]).find((x) => x.id === id);
                    if (found) void move(found, day);
                  }}
                  className="min-h-32 rounded-lg border border-border bg-card p-2"
                >
                  <p className="text-xs font-semibold text-foreground mb-2">
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" })}
                  </p>
                  <div className="space-y-2">
                    {events.filter((e) => e.event_date === day).map((e) => (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.id)}
                        className="cursor-grab rounded-md border border-border bg-muted/40 p-2 text-xs"
                      >
                        <div className="font-medium">{e.title || e.event_type}</div>
                        <div className="text-muted-foreground">{e.start_time?.slice(0, 5)}–{e.end_time?.slice(0, 5)}</div>
                        <div className="text-muted-foreground">{facilityName(e.facility_id)}</div>
                        <div className="text-muted-foreground">{teamName(e.team_id)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-foreground">{draft.id ? "Edit event" : "Add game or practice"}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
                <div className="space-y-1"><Label>Type</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.event_type} onChange={(e) => setDraft({ ...draft, event_type: e.target.value })}>
                    <option value="game">game</option><option value="practice">practice</option><option value="meeting">meeting</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Status</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                    <option value="scheduled">scheduled</option><option value="rescheduled">rescheduled</option><option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Start</Label><Input type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} /></div>
                <div className="space-y-1"><Label>End</Label><Input type="time" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} /></div>
                <div className="space-y-1"><Label>Facility</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.facility_id} onChange={(e) => setDraft({ ...draft, facility_id: e.target.value })}>
                    <option value="">None</option>{(data.facilities as any[]).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Season</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.season_id} onChange={(e) => setDraft({ ...draft, season_id: e.target.value, team_id: "", opponent_team_id: "" })}>
                    <option value="">None</option>{(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Team</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.team_id} onChange={(e) => setDraft({ ...draft, team_id: e.target.value })}>
                    <option value="">None</option>{(data.teams as any[]).filter((t) => !draft.season_id || t.season_id === draft.season_id).map((t) => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Opponent</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.opponent_team_id} onChange={(e) => setDraft({ ...draft, opponent_team_id: e.target.value })}>
                    <option value="">None</option>{(data.teams as any[]).filter((t) => !draft.season_id || t.season_id === draft.season_id).map((t) => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void save()} disabled={saving || !draft.event_date}><Save className="h-4 w-4" />{draft.id ? "Save changes" : "Add to schedule"}</Button>
                {draft.id && <Button variant="outline" onClick={() => setDraft({ ...emptyEvent })}>Cancel</Button>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="pt-4">
            <Card className="overflow-hidden"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Facility</TableHead><TableHead>Team</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{e.event_date}</TableCell>
                    <TableCell className="text-sm">{e.start_time?.slice(0, 5)}–{e.end_time?.slice(0, 5)}</TableCell>
                    <TableCell className="text-sm"><div className="font-medium">{e.title || e.event_type}</div><div className="text-xs text-muted-foreground">{seasonName(e.season_id)}</div></TableCell>
                    <TableCell className="text-sm">{facilityName(e.facility_id)}</TableCell>
                    <TableCell className="text-sm">{teamName(e.team_id)}{e.opponent_team_id ? ` vs ${teamName(e.opponent_team_id)}` : ""}</TableCell>
                    <TableCell className="text-sm">{e.status}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({
                        id: e.id, title: e.title || "", event_type: e.event_type, event_date: e.event_date,
                        start_time: e.start_time?.slice(0, 5) || "", end_time: e.end_time?.slice(0, 5) || "",
                        status: e.status, facility_id: e.facility_id || "", season_id: e.season_id || "",
                        team_id: e.team_id || "", opponent_team_id: e.opponent_team_id || "", notes: e.notes || "",
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {events.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nothing scheduled yet.</TableCell></TableRow>}
              </TableBody>
            </Table></div></Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4 pt-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-foreground">{team.id ? "Edit team" : "Create team"}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1"><Label>Season</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={team.season_id} onChange={(e) => setTeam({ ...team, season_id: e.target.value })}>
                    <option value="">Select</option>{(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Team name</Label><Input value={team.team_name} onChange={(e) => setTeam({ ...team, team_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Division</Label><Input value={team.division} onChange={(e) => setTeam({ ...team, division: e.target.value })} /></div>
                <div className="space-y-1"><Label>Coach</Label><Input value={team.coach_name} onChange={(e) => setTeam({ ...team, coach_name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Coach email</Label><Input type="email" value={team.coach_email} onChange={(e) => setTeam({ ...team, coach_email: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveTeam()}><Save className="h-4 w-4" />{team.id ? "Save team" : "Create team"}</Button>
                {team.id && <Button variant="outline" onClick={() => setTeam({ id: undefined, season_id: "", team_name: "", division: "", coach_name: "", coach_email: "" })}>Cancel</Button>}
              </div>
              <p className="text-xs text-muted-foreground">Players are added to a team from the Participant Registration section by setting a registration&apos;s team.</p>
            </Card>

            <Card className="overflow-hidden"><Table>
              <TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Season</TableHead><TableHead>Division</TableHead><TableHead>Coach</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.teams as any[]).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.team_name}</TableCell>
                    <TableCell className="text-sm">{seasonName(t.season_id)}</TableCell>
                    <TableCell className="text-sm">{t.division || "—"}</TableCell>
                    <TableCell className="text-sm">{t.coach_name || "—"}<div className="text-xs text-muted-foreground">{t.coach_email || ""}</div></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setTeam({ id: t.id, season_id: t.season_id, team_name: t.team_name, division: t.division || "", coach_name: t.coach_name || "", coach_email: t.coach_email || "" })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={async () => { if (!window.confirm("Delete this team?")) return; await deleteSeasonTeam({ data: { id: t.id } } as any); toast.success("Team deleted"); await load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data.teams as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No teams yet.</TableCell></TableRow>}
              </TableBody>
            </Table></Card>
          </TabsContent>
        </Tabs>
      )}
    </RfpAdminGate>
  );
}

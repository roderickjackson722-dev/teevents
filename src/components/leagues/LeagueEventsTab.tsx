import { useEffect, useState } from "react";
import { TimeField } from "@/components/ui/time-field";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Calendar, DollarSign } from "lucide-react";
import { FLIGHT_METHODS, SHOOTOUT_DEFAULT_ROUNDS, THREE_MAN_SCRAMBLE_WEIGHTS } from "@/lib/flightPayouts";

export const LEAGUE_FORMATS = [
  { id: "individual_stroke", name: "Individual Stroke Play", teamSize: 1 },
  { id: "match_play", name: "Match Play", teamSize: 1 },
  { id: "two_man_scramble", name: "Two-Man Scramble", teamSize: 2 },
  { id: "two_man_shamble", name: "Two-Man Shamble", teamSize: 2 },
  { id: "four_man_best_ball", name: "Four-Man Best Ball", teamSize: 4 },
  { id: "three_man_scramble", name: "3-Man Scramble", teamSize: 3 },
  { id: "four_man_scramble", name: "Four-Man Scramble", teamSize: 4 },
  { id: "shootout", name: "Shootout (multi-round)", teamSize: 2 },

  { id: "stableford", name: "Stableford", teamSize: 1 },
  { id: "quota", name: "Quota", teamSize: 1 },
  { id: "team_points", name: "Team Points", teamSize: 4 },
  { id: "ryder_cup", name: "Ryder Cup Style", teamSize: 2 },
  { id: "round_robin", name: "Round Robin", teamSize: 1 },
];

const RECURRENCE_OPTIONS = [
  { id: "", label: "One-time (no recurrence)" },
  { id: "weekly", label: "Weekly (same day each week)" },
  { id: "biweekly", label: "Every 2 weeks" },
  { id: "monthly", label: "Monthly" },
];

type FeeTier = { id: string; label: string; amount: string };

const empty = {
  event_name: "",
  event_date: "",
  end_date: "",
  course_name: "",
  format_type: "individual_stroke",
  holes: 18,
  start_time: "",
  registration_deadline: "",
  max_players: "" as any,
  registration_fee_cents: "" as any,
  recurrence_freq: "",
  recurrence_count: "" as any,
  skins_enabled: false,
  skins_mode: "gross",
  skins_carryover: true,
  skins_value_cents: "" as any,
  pass_platform_fee_to_player: false,
  fee_tiers: [] as FeeTier[],
  start_format: "shotgun",
  tee_interval_minutes: 10 as any,
  flights_enabled: false,
  flight_method: "half",
  flight_based_on: "score",

};

function newTierId() {
  return `t_${Math.random().toString(36).slice(2, 9)}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function LeagueEventsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: cs }] = await Promise.all([
      (supabase as any).from("league_events").select("*").eq("league_id", leagueId).order("event_date"),
      (supabase as any).from("league_courses").select("id, course_name, tee_name").eq("league_id", leagueId).order("course_name"),
    ]);
    setEvents(ev || []);
    setCourses(cs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leagueId]);

  const save = async () => {
    if (!editing.event_name.trim() || !editing.event_date) {
      toast({ title: "Event name and date are required", variant: "destructive" });
      return;
    }
    const base: any = {
      league_id: leagueId,
      event_name: editing.event_name.trim(),
      event_date: editing.event_date,
      end_date: editing.end_date || null,
      course_name: editing.course_name || null,
      league_course_id: editing.league_course_id || null,
      format_type: editing.format_type,
      holes: Number(editing.holes) === 9 ? 9 : 18,
      start_time: editing.start_time || null,
      registration_deadline: editing.registration_deadline || null,
      max_players: editing.max_players !== "" ? Number(editing.max_players) : null,
      registration_fee_cents: editing.registration_fee_cents !== "" ? Math.round(Number(editing.registration_fee_cents) * 100) : 0,
      skins_enabled: !!editing.skins_enabled,
      skins_mode: editing.skins_mode || "gross",
      skins_carryover: !!editing.skins_carryover,
      skins_value_cents: editing.skins_value_cents !== "" ? Math.round(Number(editing.skins_value_cents) * 100) : 0,
      pass_platform_fee_to_player: !!editing.pass_platform_fee_to_player,
      start_format: editing.start_format === "tee_times" ? "tee_times" : "shotgun",
      tee_interval_minutes: editing.tee_interval_minutes !== "" && editing.tee_interval_minutes != null
        ? Math.max(5, Math.min(30, Number(editing.tee_interval_minutes) || 10))
        : 10,
      flights_enabled: !!editing.flights_enabled,
      flight_method: editing.flights_enabled ? (editing.flight_method || "half") : "none",
      flight_based_on: editing.flight_based_on || "score",

      recurrence_rule: editing.recurrence_freq
        ? { freq: editing.recurrence_freq, count: editing.recurrence_count ? Number(editing.recurrence_count) : null }
        : null,
      fee_tiers: (editing.fee_tiers || [])
        .filter((t: FeeTier) => t.label.trim() && t.amount !== "" && !isNaN(Number(t.amount)))
        .map((t: FeeTier) => ({
          id: t.id || newTierId(),
          label: t.label.trim(),
          amount_cents: Math.round(Number(t.amount) * 100),
        })),
    };

    if (editing.id) {
      const { error } = await (supabase as any).from("league_events").update(base).eq("id", editing.id);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Event updated" });
    } else {
      // Handle recurrence: expand into multiple rows
      const rows: any[] = [base];
      if (editing.recurrence_freq && editing.recurrence_count && Number(editing.recurrence_count) > 1) {
        const step = editing.recurrence_freq === "weekly" ? 7 : editing.recurrence_freq === "biweekly" ? 14 : 30;
        for (let i = 1; i < Number(editing.recurrence_count); i++) {
          rows.push({ ...base, event_date: addDays(base.event_date, step * i), end_date: base.end_date ? addDays(base.end_date, step * i) : null });
        }
      }
      const { error } = await (supabase as any).from("league_events").insert(rows);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: `Created ${rows.length} event${rows.length === 1 ? "" : "s"}` });
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event? All scores and pairings will be removed.")) return;
    const { error } = await (supabase as any).from("league_events").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" /> Events ({events.length})</h2>
          <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add Event</Button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No events scheduled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Skins</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.event_name}</TableCell>
                    <TableCell>
                      {e.event_date}{e.end_date && e.end_date !== e.event_date ? ` – ${e.end_date}` : ""}
                      {e.start_time ? ` @ ${e.start_time}` : ""}
                    </TableCell>
                    <TableCell>{LEAGUE_FORMATS.find(f => f.id === e.format_type)?.name || e.format_type}</TableCell>
                    <TableCell>{e.course_name || "—"}</TableCell>
                    <TableCell>
                      {Array.isArray(e.fee_tiers) && e.fee_tiers.length > 0
                        ? `${e.fee_tiers.length} option${e.fee_tiers.length === 1 ? "" : "s"}`
                        : e.registration_fee_cents ? `$${(e.registration_fee_cents / 100).toFixed(2)}` : "Free"}
                      {e.pass_platform_fee_to_player && <Badge variant="outline" className="ml-2 text-xs">+ fee</Badge>}
                    </TableCell>
                    <TableCell>
                      {e.skins_enabled
                        ? <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400">{e.skins_mode}</Badge>
                        : <span className="text-muted-foreground text-xs">off</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({
                        ...e,
                        max_players: e.max_players ?? "",
                        registration_fee_cents: e.registration_fee_cents ? e.registration_fee_cents / 100 : "",
                        skins_value_cents: e.skins_value_cents ? e.skins_value_cents / 100 : "",
                        course_name: e.course_name ?? "",
                        league_course_id: e.league_course_id ?? "",
                        end_date: e.end_date ?? "",
                        start_time: e.start_time ?? "",
                        registration_deadline: e.registration_deadline ?? "",
                        skins_enabled: !!e.skins_enabled,
                        skins_mode: e.skins_mode || "gross",
                        skins_carryover: e.skins_carryover !== false,
                        pass_platform_fee_to_player: !!e.pass_platform_fee_to_player,
                        start_format: e.start_format || "shotgun",
                        tee_interval_minutes: e.tee_interval_minutes ?? 10,
                        holes: e.holes === 9 ? 9 : 18,

                        recurrence_freq: e.recurrence_rule?.freq || "",
                        recurrence_count: "",
                        fee_tiers: Array.isArray(e.fee_tiers)
                          ? e.fee_tiers.map((t: any) => ({ id: t.id || newTierId(), label: t.label || "", amount: t.amount_cents != null ? (Number(t.amount_cents) / 100).toString() : "" }))
                          : [],
                      })}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {editing && (
          <Dialog open onOpenChange={() => setEditing(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing.id ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Event Name *</Label>
                  <Input value={editing.event_name} onChange={(e) => setEditing({ ...editing, event_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={editing.event_date} onChange={(e) => setEditing({ ...editing, event_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date (multi-day)</Label>
                    <Input type="date" value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{editing.start_format === "tee_times" ? "First Tee Time" : "Shotgun Start Time"}</Label>
                    <TimeField value={editing.start_time} minuteStep={5} onChange={(v) => setEditing({ ...editing, start_time: v })} />
                  </div>
                  <div>
                    <Label>Course (display name)</Label>
                    <Input value={editing.course_name} onChange={(e) => setEditing({ ...editing, course_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Format</Label>
                    <Select value={editing.start_format || "shotgun"} onValueChange={(v) => setEditing({ ...editing, start_format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shotgun">Shotgun Start</SelectItem>
                        <SelectItem value="tee_times">Tee Times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editing.start_format === "tee_times" && (
                    <div>
                      <Label>Interval Between Groups (minutes)</Label>
                      <Input type="number" min={5} max={30} value={editing.tee_interval_minutes ?? 10}
                        onChange={(e) => setEditing({ ...editing, tee_interval_minutes: e.target.value })} />
                      <p className="text-xs text-muted-foreground mt-1">Default 10 minutes.</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Course Details (for handicap pops)</Label>
                  <Select
                    value={editing.league_course_id || "__none"}
                    onValueChange={(v) => setEditing({ ...editing, league_course_id: v === "__none" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="No course details attached" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No course details</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_name} — {c.tee_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {courses.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Add courses in the <span className="font-medium">Courses</span> tab to enable stroke allocation.</p>
                  )}
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={editing.format_type} onValueChange={(v) => setEditing({ ...editing, format_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {LEAGUE_FORMATS.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Number of Holes</Label>
                  <Select value={String(editing.holes ?? 18)} onValueChange={(v) => setEditing({ ...editing, holes: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">18 holes</SelectItem>
                      <SelectItem value="9">9 holes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                {editing.format_type === "three_man_scramble" && (
                  <p className="text-xs text-muted-foreground rounded-md border bg-muted/30 p-2">
                    Team handicap for a 3-Man Scramble is calculated as {THREE_MAN_SCRAMBLE_WEIGHTS} of the three players' handicaps.
                  </p>
                )}
                {editing.format_type === "shootout" && (
                  <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Shootout rounds (scores aggregate):</p>
                    <ul className="list-disc pl-4">
                      {SHOOTOUT_DEFAULT_ROUNDS.map((r) => <li key={r.round}>{r.label}</li>)}
                    </ul>
                  </div>
                )}

                <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="event-flights"
                      checked={!!editing.flights_enabled}
                      onCheckedChange={(v) => setEditing({ ...editing, flights_enabled: v })}
                    />
                    <Label htmlFor="event-flights" className="text-sm font-semibold">Flight this event</Label>
                  </div>
                  {editing.flights_enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Flight Method</Label>
                        <Select value={editing.flight_method || "half"} onValueChange={(v) => setEditing({ ...editing, flight_method: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FLIGHT_METHODS.filter((m) => m.id !== "none").map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Based on</Label>
                        <Select value={editing.flight_based_on || "score"} onValueChange={(v) => setEditing({ ...editing, flight_based_on: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="score">Total Score</SelectItem>
                            <SelectItem value="handicap">Handicap</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>



                {!editing.id && (
                  <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                    <div className="text-sm font-semibold">Recurring Event</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Frequency</Label>
                        <Select value={editing.recurrence_freq} onValueChange={(v) => setEditing({ ...editing, recurrence_freq: v })}>
                          <SelectTrigger><SelectValue placeholder="One-time" /></SelectTrigger>
                          <SelectContent>
                            {RECURRENCE_OPTIONS.map(r => <SelectItem key={r.id || "none"} value={r.id || "none"}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {editing.recurrence_freq && editing.recurrence_freq !== "none" && (
                        <div>
                          <Label>How many events?</Label>
                          <Input type="number" min={2} max={52} value={editing.recurrence_count}
                            onChange={(e) => setEditing({ ...editing, recurrence_count: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Registration Deadline</Label>
                    <Input type="date" value={editing.registration_deadline} onChange={(e) => setEditing({ ...editing, registration_deadline: e.target.value })} />
                  </div>
                  <div>
                    <Label>Max Players</Label>
                    <Input type="number" value={editing.max_players} onChange={(e) => setEditing({ ...editing, max_players: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Base Registration Fee ($)</Label>
                    <Input type="number" step="0.01" value={editing.registration_fee_cents} onChange={(e) => setEditing({ ...editing, registration_fee_cents: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Used when no fee options are defined below.</p>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <Switch checked={!!editing.pass_platform_fee_to_player}
                        onCheckedChange={(v) => setEditing({ ...editing, pass_platform_fee_to_player: v })} />
                      <Label className="text-sm">Pass 5% platform fee to player</Label>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold">Registration Fee Options</Label>
                      <p className="text-xs text-muted-foreground">Offer multiple choices — e.g. Walking, Riding, Guest. Players pick one at checkout.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditing({
                      ...editing,
                      fee_tiers: [...(editing.fee_tiers || []), { id: newTierId(), label: "", amount: "" }],
                    })}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                    </Button>
                  </div>
                  {(editing.fee_tiers || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No fee options — the base fee above will apply to everyone.</p>
                  ) : (
                    <div className="space-y-2">
                      {(editing.fee_tiers as FeeTier[]).map((t, idx) => (
                        <div key={t.id} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs">Label</Label>
                            <Input placeholder="e.g. Walking" value={t.label}
                              onChange={(e) => {
                                const next = [...editing.fee_tiers];
                                next[idx] = { ...t, label: e.target.value };
                                setEditing({ ...editing, fee_tiers: next });
                              }} />
                          </div>
                          <div className="w-32">
                            <Label className="text-xs">Price ($)</Label>
                            <Input type="number" step="0.01" placeholder="0.00" value={t.amount}
                              onChange={(e) => {
                                const next = [...editing.fee_tiers];
                                next[idx] = { ...t, amount: e.target.value };
                                setEditing({ ...editing, fee_tiers: next });
                              }} />
                          </div>
                          <Button type="button" size="icon" variant="ghost" onClick={() => {
                            const next = [...editing.fee_tiers];
                            next.splice(idx, 1);
                            setEditing({ ...editing, fee_tiers: next });
                          }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


                <div className="rounded-md border p-3 space-y-3 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-yellow-600" />
                      <Label className="font-semibold">Skins Game</Label>
                    </div>
                    <Switch checked={!!editing.skins_enabled}
                      onCheckedChange={(v) => setEditing({ ...editing, skins_enabled: v })} />
                  </div>
                  {editing.skins_enabled && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Mode</Label>
                        <Select value={editing.skins_mode} onValueChange={(v) => setEditing({ ...editing, skins_mode: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gross">Gross</SelectItem>
                            <SelectItem value="net">Net</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Per-skin $</Label>
                        <Input type="number" step="0.01" value={editing.skins_value_cents}
                          onChange={(e) => setEditing({ ...editing, skins_value_cents: e.target.value })} />
                      </div>
                      <div className="flex items-end pb-2">
                        <div className="flex items-center gap-2">
                          <Switch checked={!!editing.skins_carryover}
                            onCheckedChange={(v) => setEditing({ ...editing, skins_carryover: v })} />
                          <Label className="text-sm">Carryover</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>{editing.id ? "Save" : "Create Event"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

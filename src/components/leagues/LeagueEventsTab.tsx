import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Calendar } from "lucide-react";

export const LEAGUE_FORMATS = [
  { id: "individual_stroke", name: "Individual Stroke Play", teamSize: 1 },
  { id: "two_man_scramble", name: "Two-Man Scramble", teamSize: 2 },
  { id: "two_man_shamble", name: "Two-Man Shamble", teamSize: 2 },
  { id: "four_man_baseball", name: "Four-Man Baseball (Best Ball)", teamSize: 4 },
  { id: "four_man_scramble", name: "Four-Man Scramble", teamSize: 4 },
];

const empty = {
  event_name: "",
  event_date: "",
  course_name: "",
  format_type: "individual_stroke",
  start_time: "",
  registration_deadline: "",
  max_players: "" as any,
  registration_fee_cents: "" as any,
};

export default function LeagueEventsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("league_events").select("*").eq("league_id", leagueId).order("event_date");
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leagueId]);

  const save = async () => {
    if (!editing.event_name.trim() || !editing.event_date) {
      toast({ title: "Event name and date are required", variant: "destructive" });
      return;
    }
    const payload: any = {
      league_id: leagueId,
      event_name: editing.event_name.trim(),
      event_date: editing.event_date,
      course_name: editing.course_name || null,
      format_type: editing.format_type,
      start_time: editing.start_time || null,
      registration_deadline: editing.registration_deadline || null,
      max_players: editing.max_players !== "" ? Number(editing.max_players) : null,
      registration_fee_cents: editing.registration_fee_cents !== "" ? Math.round(Number(editing.registration_fee_cents) * 100) : 0,
    };
    const q = editing.id
      ? (supabase as any).from("league_events").update(payload).eq("id", editing.id)
      : (supabase as any).from("league_events").insert(payload);
    const { error } = await q;
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Event updated" : "Event created" });
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.event_name}</TableCell>
                    <TableCell>{e.event_date}{e.start_time ? ` @ ${e.start_time}` : ""}</TableCell>
                    <TableCell>{LEAGUE_FORMATS.find(f => f.id === e.format_type)?.name || e.format_type}</TableCell>
                    <TableCell>{e.course_name || "—"}</TableCell>
                    <TableCell>{e.registration_fee_cents ? `$${(e.registration_fee_cents / 100).toFixed(2)}` : "Free"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({
                        ...e,
                        max_players: e.max_players ?? "",
                        registration_fee_cents: e.registration_fee_cents ? e.registration_fee_cents / 100 : "",
                        course_name: e.course_name ?? "",
                        start_time: e.start_time ?? "",
                        registration_deadline: e.registration_deadline ?? "",
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
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing.id ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Event Name *</Label>
                  <Input value={editing.event_name} onChange={(e) => setEditing({ ...editing, event_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={editing.event_date} onChange={(e) => setEditing({ ...editing, event_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input type="time" value={editing.start_time} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Course</Label>
                  <Input value={editing.course_name} onChange={(e) => setEditing({ ...editing, course_name: e.target.value })} />
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={editing.format_type} onValueChange={(v) => setEditing({ ...editing, format_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAGUE_FORMATS.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
                <div>
                  <Label>Registration Fee ($)</Label>
                  <Input type="number" step="0.01" value={editing.registration_fee_cents} onChange={(e) => setEditing({ ...editing, registration_fee_cents: e.target.value })} />
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

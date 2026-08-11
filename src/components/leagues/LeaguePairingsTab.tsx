import { useEffect, useState } from "react";
import { TimeField } from "@/components/ui/time-field";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shuffle, Save, Users } from "lucide-react";
import { LEAGUE_FORMATS } from "./LeagueEventsTab";

interface Row {
  member_id: string;
  member_name: string;
  handicap_index: number | null;
  registered: boolean;
  pairing_group: number | null;
  pairing_position: number | null;
  tee_time: string | null;
  registration_id?: string;
}

export default function LeaguePairingsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [event, setEvent] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("league_events").select("*").eq("league_id", leagueId).order("event_date");
      setEvents(data || []);
      if (data?.[0]) setEventId(data[0].id);
    })();
  }, [leagueId]);

  const load = async (evId: string) => {
    if (!evId) return;
    setLoading(true);
    const ev = events.find(e => e.id === evId);
    setEvent(ev);
    const [{ data: members }, { data: regs }] = await Promise.all([
      (supabase as any).from("league_members").select("id, member_name, handicap_index").eq("league_id", leagueId).order("member_name"),
      (supabase as any).from("league_event_registrations").select("*").eq("event_id", evId),
    ]);
    const regMap = new Map((regs || []).map((r: any) => [r.member_id, r]));
    setRows((members || []).map((m: any) => {
      const r: any = regMap.get(m.id);
      return {
        member_id: m.id,
        member_name: m.member_name,
        handicap_index: m.handicap_index,
        registered: !!r,
        pairing_group: r?.pairing_group ?? null,
        pairing_position: r?.pairing_position ?? null,
        tee_time: r?.tee_time ?? null,
        registration_id: r?.id,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { if (eventId) load(eventId); }, [eventId, events.length]);

  const autoPair = () => {
    if (!event) return;
    const teamSize = LEAGUE_FORMATS.find(f => f.id === event.format_type)?.teamSize || 4;
    const registered = rows.filter(r => r.registered)
      .sort((a, b) => (a.handicap_index ?? 99) - (b.handicap_index ?? 99));
    const updated = [...rows];
    registered.forEach((r, idx) => {
      const group = Math.floor(idx / teamSize) + 1;
      const pos = (idx % teamSize) + 1;
      const rowIdx = updated.findIndex(x => x.member_id === r.member_id);
      updated[rowIdx] = { ...updated[rowIdx], pairing_group: group, pairing_position: pos };
    });
    setRows(updated);
    toast({ title: `Auto-paired ${registered.length} players into ${Math.ceil(registered.length / teamSize)} groups` });
  };

  const saveAll = async () => {
    if (!eventId) return;
    setSaving(true);
    const toUpsert = rows.filter(r => r.registered).map(r => ({
      event_id: eventId,
      member_id: r.member_id,
      pairing_group: r.pairing_group,
      pairing_position: r.pairing_position,
      tee_time: r.tee_time,
    }));
    const toDelete = rows.filter(r => !r.registered && r.registration_id).map(r => r.registration_id!);

    if (toDelete.length) {
      await (supabase as any).from("league_event_registrations").delete().in("id", toDelete);
    }
    if (toUpsert.length) {
      const { error } = await (supabase as any)
        .from("league_event_registrations")
        .upsert(toUpsert, { onConflict: "event_id,member_id" });
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    toast({ title: "Pairings saved" });
    setSaving(false);
    load(eventId);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5" />
          <div className="flex-1 max-w-xs">
            <Label className="sr-only">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Choose an event" /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name} — {e.event_date}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {event && (
            <>
              <Button variant="outline" onClick={autoPair}><Shuffle className="h-4 w-4 mr-2" /> Auto-Pair by Handicap</Button>
              <Button onClick={saveAll} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pairings
              </Button>
            </>
          )}
        </div>

        {!eventId ? (
          <p className="text-muted-foreground text-sm py-6 text-center">Create an event first, then set up pairings here.</p>
        ) : loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 w-16">In</th>
                  <th className="p-2">Member</th>
                  <th className="p-2 w-20">HCP</th>
                  <th className="p-2 w-24">Group</th>
                  <th className="p-2 w-24">Position</th>
                  <th className="p-2 w-32">Tee Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.member_id} className="border-b">
                    <td className="p-2">
                      <Checkbox checked={r.registered} onCheckedChange={(v) => {
                        const u = [...rows]; u[i] = { ...r, registered: !!v }; setRows(u);
                      }} />
                    </td>
                    <td className="p-2">{r.member_name}</td>
                    <td className="p-2">{r.handicap_index ?? "—"}</td>
                    <td className="p-2">
                      <Input type="number" value={r.pairing_group ?? ""} disabled={!r.registered}
                        onChange={(e) => { const u = [...rows]; u[i] = { ...r, pairing_group: e.target.value ? Number(e.target.value) : null }; setRows(u); }} />
                    </td>
                    <td className="p-2">
                      <Input type="number" value={r.pairing_position ?? ""} disabled={!r.registered}
                        onChange={(e) => { const u = [...rows]; u[i] = { ...r, pairing_position: e.target.value ? Number(e.target.value) : null }; setRows(u); }} />
                    </td>
                    <td className="p-2">
                      <TimeField value={r.tee_time ?? ""} disabled={!r.registered} minuteStep={1}
                        onChange={(v) => { const u = [...rows]; u[i] = { ...r, tee_time: v || null }; setRows(u); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Download } from "lucide-react";

export default function TripRooms({ tripId }: { tripId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [form, setForm] = useState({ room_number: "", room_type: "double", notes: "" });

  const load = async () => {
    const [{ data }, { data: pp }] = await Promise.all([
      supabase.from("trip_rooms").select("*").eq("trip_id", tripId).order("room_number"),
      supabase.from("trip_participants").select("id, name").eq("trip_id", tripId),
    ]);
    setList(data || []);
    setParticipants(pp || []);
  };
  useEffect(() => { load(); }, [tripId]);

  const add = async () => {
    await supabase.from("trip_rooms").insert({
      trip_id: tripId,
      room_number: form.room_number || null,
      room_type: form.room_type,
      notes: form.notes || null,
      occupants: [],
    });
    setForm({ room_number: "", room_type: "double", notes: "" });
    load();
  };

  const toggleOccupant = async (room: any, pid: string) => {
    const cur: string[] = Array.isArray(room.occupants) ? room.occupants : [];
    const next = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid];
    await supabase.from("trip_rooms").update({ occupants: next }).eq("id", room.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("trip_rooms").delete().eq("id", id);
    load();
  };

  const exportCsv = () => {
    const rows = [["Room", "Type", "Occupants", "Notes"]];
    list.forEach((r) => {
      const names = (r.occupants || []).map((pid: string) => participants.find((p) => p.id === pid)?.name).filter(Boolean).join("; ");
      rows.push([r.room_number || "", r.room_type || "", names, r.notes || ""]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rooming-list.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
          <Input placeholder="Room #" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
          <Select value={form.room_type} onValueChange={(v) => setForm({ ...form, room_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="double">Double</SelectItem>
              <SelectItem value="suite">Suite</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="md:col-span-2" />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add Room</Button>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rooms assigned yet.</p>
      ) : list.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold">Room {r.room_number || "—"}</span>
                <span className="text-xs text-muted-foreground ml-2 uppercase">{r.room_type}</span>
                {r.notes && <span className="text-sm text-muted-foreground ml-3">{r.notes}</span>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const sel = (r.occupants || []).includes(p.id);
                return (
                  <Button key={p.id} size="sm" variant={sel ? "default" : "outline"} onClick={() => toggleOccupant(r, p.id)}>
                    {p.name}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

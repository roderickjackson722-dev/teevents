import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TT {
  id: string;
  day: string;
  tee_time: string;
  course_name: string | null;
  group_name: string | null;
  players: any;
}

export default function TripTeeTimes({ tripId }: { tripId: string }) {
  const [list, setList] = useState<TT[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [form, setForm] = useState({ day: "", tee_time: "", course_name: "", group_name: "" });

  const load = async () => {
    const [{ data: tt }, { data: pp }] = await Promise.all([
      supabase.from("trip_tee_times").select("*").eq("trip_id", tripId).order("day").order("tee_time"),
      supabase.from("trip_participants").select("id, name, handicap_index").eq("trip_id", tripId),
    ]);
    setList(tt || []);
    setParticipants(pp || []);
  };

  useEffect(() => { load(); }, [tripId]);

  const add = async () => {
    if (!form.day || !form.tee_time) return toast.error("Day & time required");
    await supabase.from("trip_tee_times").insert({
      trip_id: tripId,
      day: form.day,
      tee_time: form.tee_time,
      course_name: form.course_name || null,
      group_name: form.group_name || null,
      players: [],
    });
    setForm({ day: "", tee_time: "", course_name: "", group_name: "" });
    load();
  };

  const togglePlayer = async (tt: TT, pid: string) => {
    const cur = Array.isArray(tt.players) ? tt.players : [];
    const next = cur.includes(pid) ? cur.filter((x: string) => x !== pid) : [...cur, pid];
    await supabase.from("trip_tee_times").update({ players: next }).eq("id", tt.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("trip_tee_times").delete().eq("id", id);
    load();
  };

  const autoPair = async () => {
    if (list.length === 0) return toast.error("Add tee times first");
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const groups = list.length;
    const updates = list.map((tt, idx) => {
      const players = shuffled.filter((_, i) => i % groups === idx).map((p) => p.id);
      return supabase.from("trip_tee_times").update({ players }).eq("id", tt.id);
    });
    await Promise.all(updates);
    toast.success("Pairings randomized");
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
          <Input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
          <Input type="time" value={form.tee_time} onChange={(e) => setForm({ ...form, tee_time: e.target.value })} />
          <Input placeholder="Course" value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
          <Input placeholder="Group A" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={autoPair}><Shuffle className="h-4 w-4 mr-1" /> Auto-pair (random)</Button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tee times yet.</p>
      ) : list.map((tt) => (
        <Card key={tt.id}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold">{tt.tee_time.slice(0, 5)}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {format(new Date(tt.day + "T00:00:00"), "MMM d")}
                  {tt.course_name && ` · ${tt.course_name}`}
                  {tt.group_name && ` · ${tt.group_name}`}
                </span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(tt.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const sel = (tt.players || []).includes(p.id);
                return (
                  <Button key={p.id} size="sm" variant={sel ? "default" : "outline"} onClick={() => togglePlayer(tt, p.id)}>
                    {p.name} {p.handicap_index != null && <span className="text-xs opacity-70 ml-1">({p.handicap_index})</span>}
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

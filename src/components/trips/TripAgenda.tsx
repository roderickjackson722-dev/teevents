import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Item {
  id: string;
  day: string;
  time: string | null;
  activity: string;
  location: string | null;
  notes: string | null;
  sort_order: number;
}

export default function TripAgenda({ tripId }: { tripId: string }) {
  const [list, setList] = useState<Item[]>([]);
  const [form, setForm] = useState({ day: "", time: "", activity: "", location: "" });

  const load = async () => {
    const { data } = await supabase
      .from("trip_agenda")
      .select("*")
      .eq("trip_id", tripId)
      .order("day").order("time").order("sort_order");
    setList(data || []);
  };

  useEffect(() => { load(); }, [tripId]);

  const add = async () => {
    if (!form.day || !form.activity) return toast.error("Day & activity required");
    const { error } = await supabase.from("trip_agenda").insert({
      trip_id: tripId,
      day: form.day,
      time: form.time || null,
      activity: form.activity,
      location: form.location || null,
    });
    if (error) return toast.error(error.message);
    setForm({ day: "", time: "", activity: "", location: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("trip_agenda").delete().eq("id", id);
    load();
  };

  const grouped = list.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.day] = acc[item.day] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
          <Input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
          <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <Input placeholder="Activity *" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="md:col-span-2" />
          <div className="flex gap-2">
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Button onClick={add} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-muted-foreground">No agenda items yet.</p>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <Card key={day}>
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3">{format(new Date(day + "T00:00:00"), "EEEE, MMM d")}</h4>
              <ul className="space-y-2">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between border-l-2 border-primary/30 pl-3 py-1">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-3">{it.time?.slice(0, 5) || "—"}</span>
                      <span className="font-medium">{it.activity}</span>
                      {it.location && <span className="text-muted-foreground text-sm ml-2">@ {it.location}</span>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

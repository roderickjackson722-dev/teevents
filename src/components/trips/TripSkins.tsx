import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TripSkins({ tripId }: { tripId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [form, setForm] = useState({ day: "", hole_number: "", winning_participant_id: "", amount: "" });

  const load = async () => {
    const [{ data: s }, { data: pp }] = await Promise.all([
      supabase.from("trip_skins").select("*").eq("trip_id", tripId).order("day").order("hole_number"),
      supabase.from("trip_participants").select("id, name").eq("trip_id", tripId),
    ]);
    setList(s || []);
    setParticipants(pp || []);
  };
  useEffect(() => { load(); }, [tripId]);

  const add = async () => {
    if (!form.winning_participant_id || !form.hole_number) return toast.error("Hole & winner required");
    await supabase.from("trip_skins").insert({
      trip_id: tripId,
      day: form.day || null,
      hole_number: parseInt(form.hole_number),
      winning_participant_id: form.winning_participant_id,
      amount_cents: form.amount ? Math.round(parseFloat(form.amount) * 100) : 0,
    });
    setForm({ day: "", hole_number: "", winning_participant_id: "", amount: "" });
    load();
  };

  const togglePaid = async (s: any) => {
    await supabase.from("trip_skins").update({ status: s.status === "paid" ? "pending" : "paid" }).eq("id", s.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("trip_skins").delete().eq("id", id);
    load();
  };

  // Settlement: who's owed how much
  const totals = list.reduce<Record<string, number>>((acc, s) => {
    if (s.winning_participant_id) {
      acc[s.winning_participant_id] = (acc[s.winning_participant_id] || 0) + (s.amount_cents || 0);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
          <Input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
          <Input type="number" placeholder="Hole" value={form.hole_number} onChange={(e) => setForm({ ...form, hole_number: e.target.value })} />
          <Select value={form.winning_participant_id} onValueChange={(v) => setForm({ ...form, winning_participant_id: v })}>
            <SelectTrigger><SelectValue placeholder="Winner" /></SelectTrigger>
            <SelectContent>
              {participants.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Amount $" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Log Skin</Button>
        </CardContent>
      </Card>

      {Object.keys(totals).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-semibold mb-2">Settlement Sheet</h4>
            <ul className="text-sm space-y-1">
              {Object.entries(totals).map(([pid, cents]) => {
                const p = participants.find((x) => x.id === pid);
                return <li key={pid}>{p?.name || "Unknown"}: <strong>${(cents / 100).toFixed(2)}</strong></li>;
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No skins logged yet.</p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="py-2">Day</th><th>Hole</th><th>Winner</th><th>Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{s.day || "—"}</td>
                    <td>#{s.hole_number}</td>
                    <td>{participants.find((p) => p.id === s.winning_participant_id)?.name || "—"}</td>
                    <td>${((s.amount_cents || 0) / 100).toFixed(2)}</td>
                    <td>
                      <Button size="sm" variant={s.status === "paid" ? "default" : "outline"} onClick={() => togglePaid(s)}>
                        {s.status}
                      </Button>
                    </td>
                    <td><Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

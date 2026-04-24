import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  handicap_index: number | null;
  rooming_info: string | null;
  dietary_restrictions: string | null;
  shirt_size: string | null;
}

export default function TripParticipants({ tripId }: { tripId: string }) {
  const [list, setList] = useState<Participant[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", handicap_index: "", shirt_size: "" });

  const load = async () => {
    const { data } = await supabase
      .from("trip_participants")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at");
    setList(data || []);
  };

  useEffect(() => { load(); }, [tripId]);

  const add = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("trip_participants").insert({
      trip_id: tripId,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      handicap_index: form.handicap_index ? parseFloat(form.handicap_index) : null,
      shirt_size: form.shirt_size || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", email: "", phone: "", handicap_index: "", shirt_size: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove participant?")) return;
    await supabase.from("trip_participants").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-6">
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="md:col-span-2" />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="HCP" value={form.handicap_index} onChange={(e) => setForm({ ...form, handicap_index: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Shirt" value={form.shirt_size} onChange={(e) => setForm({ ...form, shirt_size: e.target.value })} />
            <Button onClick={add} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No participants yet.</p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="py-2">Name</th><th>Email</th><th>Phone</th><th>HCP</th><th>Shirt</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td>{p.email || "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>{p.handicap_index ?? "—"}</td>
                    <td>{p.shirt_size || "—"}</td>
                    <td><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
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

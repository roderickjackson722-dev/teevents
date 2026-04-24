import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const GAME_TYPES = [
  { value: "ryder_cup", label: "Ryder Cup" },
  { value: "skins", label: "Skins" },
  { value: "stableford", label: "Stableford" },
  { value: "match_play", label: "Match Play" },
  { value: "scramble", label: "Scramble" },
  { value: "best_ball", label: "Best Ball" },
];

export default function TripGames({ tripId }: { tripId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ game_type: "ryder_cup", name: "", buy_in: "" });

  const load = async () => {
    const { data } = await supabase.from("trip_games").select("*").eq("trip_id", tripId).order("created_at");
    setList(data || []);
  };
  useEffect(() => { load(); }, [tripId]);

  const add = async () => {
    if (!form.name) return toast.error("Name required");
    await supabase.from("trip_games").insert({
      trip_id: tripId,
      game_type: form.game_type,
      name: form.name,
      details: form.buy_in ? { buy_in_cents: Math.round(parseFloat(form.buy_in) * 100) } : {},
    });
    setForm({ game_type: "ryder_cup", name: "", buy_in: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("trip_games").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-4">
          <Select value={form.game_type} onValueChange={(v) => setForm({ ...form, game_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GAME_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Buy-in $ (optional)" value={form.buy_in} onChange={(e) => setForm({ ...form, buy_in: e.target.value })} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add Game</Button>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No games configured. Add a Ryder Cup, Skins, or other game above.</p>
      ) : list.map((g) => (
        <Card key={g.id}>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="font-semibold">{g.name}</span>
              <span className="text-xs text-muted-foreground ml-2 uppercase">{g.game_type.replace("_", " ")}</span>
              {g.details?.buy_in_cents && (
                <span className="text-xs ml-3">Buy-in ${(g.details.buy_in_cents / 100).toFixed(2)}</span>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(g.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

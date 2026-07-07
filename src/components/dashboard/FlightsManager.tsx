import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

interface Flight {
  id: string;
  tournament_id: string;
  tier_name: string;
  tier_description: string | null;
  display_order: number;
  is_active: boolean;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  flight_id: string | null;
}

interface Props {
  tournamentId: string;
}

const emptyDraft = { tier_name: "", tier_description: "", display_order: 0, is_active: true };

export default function FlightsManager({ tournamentId }: Props) {
  const { toast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, pRes] = await Promise.all([
      (supabase as any)
        .from("tournament_tiers")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("display_order", { ascending: true }),
      (supabase as any)
        .from("tournament_registrations")
        .select("id, first_name, last_name, flight_id")
        .eq("tournament_id", tournamentId)
        .order("last_name", { ascending: true }),
    ]);
    setFlights(fRes.data || []);
    setPlayers(pRes.data || []);
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId, load]);

  const openAdd = () => {
    setEditingId(null);
    setDraft({ ...emptyDraft, display_order: flights.length });
    setDialogOpen(true);
  };
  const openEdit = (f: Flight) => {
    setEditingId(f.id);
    setDraft({
      tier_name: f.tier_name,
      tier_description: f.tier_description || "",
      display_order: f.display_order,
      is_active: f.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.tier_name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload = {
      tournament_id: tournamentId,
      tier_name: draft.tier_name.trim(),
      tier_description: draft.tier_description.trim() || null,
      display_order: Number(draft.display_order) || 0,
      is_active: draft.is_active,
    };
    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("tournament_tiers").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("tournament_tiers").insert(payload));
    }
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Flight updated" : "Flight created" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this flight? Players will be unassigned.")) return;
    const { error } = await (supabase as any).from("tournament_tiers").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Flight deleted" });
    load();
  };

  const assign = async (playerId: string, flightId: string | null) => {
    const { error } = await (supabase as any)
      .from("tournament_registrations")
      .update({ flight_id: flightId })
      .eq("id", playerId);
    if (error) {
      toast({ title: "Assign failed", description: error.message, variant: "destructive" });
      return;
    }
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, flight_id: flightId } : p)));
  };

  const countByFlight = (id: string) => players.filter((p) => p.flight_id === id).length;

  if (loading) return <p className="text-sm text-muted-foreground">Loading flights…</p>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Tournament Flights</h3>
            <p className="text-sm text-muted-foreground">
              Create competition flights (e.g. Championship, Senior, Ladies, Net). Each flight gets its own leaderboard.
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Flight
          </Button>
        </div>

        {flights.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No flights defined yet. Your tournament will show a single combined leaderboard.
          </div>
        ) : (
          <div className="space-y-2">
            {flights.map((f) => (
              <div key={f.id} className="rounded-lg border border-border p-4 flex items-start justify-between gap-4 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.tier_name}</span>
                    {!f.is_active && <Badge variant="secondary">Inactive</Badge>}
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" /> {countByFlight(f.id)} players
                    </Badge>
                  </div>
                  {f.tier_description && <p className="text-sm text-muted-foreground mt-1">{f.tier_description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {flights.length > 0 && players.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-1">Assign Players to Flights</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Change a player's flight at any time. Scores automatically feed the assigned flight's leaderboard.
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Player</th>
                  <th className="px-4 py-2 font-medium w-64">Flight</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={p.flight_id || "__none"}
                        onValueChange={(v) => assign(p.id, v === "__none" ? null : v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Unassigned</SelectItem>
                          {flights.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.tier_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Flight" : "Add Flight"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Flight Name *</Label>
              <Input
                value={draft.tier_name}
                onChange={(e) => setDraft({ ...draft, tier_name: e.target.value })}
                placeholder="Championship"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={draft.tier_description}
                onChange={(e) => setDraft({ ...draft, tier_description: e.target.value })}
                placeholder="For players with handicap 0-10"
                rows={2}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={draft.display_order}
                onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save Flight</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

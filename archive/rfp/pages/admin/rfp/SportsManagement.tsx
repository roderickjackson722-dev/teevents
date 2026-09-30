import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listSports,
  upsertSport,
  deleteSport,
  assignTournamentSport,
  type SportSetting,
} from "@/lib/rfp.functions";

const blank = {
  sport_type: "",
  label: "",
  field_name: "Field",
  scoring_type: "points",
  period_name: "Quarter",
  max_players_per_team: 9,
  min_players_per_team: 9,
  innings_or_halves: 4,
  is_active: true,
};

export default function SportsManagement() {
  const [sports, setSports] = useState<SportSetting[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(blank);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listSports({ data: {} } as any);
      setSports(res.sports || []);
      setTournaments(res.tournaments || []);
    } catch (e: any) {
      toast.error(e?.message || "Could not load sports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.sport_type || !form.label) return toast.error("Sport key and label are required");
    setSaving(true);
    try {
      await upsertSport({ data: form } as any);
      toast.success("Sport saved");
      setForm(blank);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not save sport");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sport?")) return;
    try {
      await deleteSport({ data: { id } } as any);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not delete sport");
    }
  };

  const assign = async (tournamentId: string, sportType: string) => {
    try {
      await assignTournamentSport({ data: { tournamentId, sportType } } as any);
      setTournaments((prev) => prev.map((t) => (t.id === tournamentId ? { ...t, sport_type: sportType } : t)));
      toast.success("Sport assigned");
    } catch (e: any) {
      toast.error(e?.message || "Could not assign sport");
    }
  };

  const filtered = tournaments.filter((t) =>
    (t.title || "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <RfpAdminGate
      title="Sports Management"
      subtitle="Add sport types, configure their scoring rules, and assign a sport to any tournament."
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-foreground">{form.id ? "Edit sport" : "Add a sport"}</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <div><Label>Sport key</Label><Input value={form.sport_type} onChange={(e) => setForm({ ...form, sport_type: e.target.value })} placeholder="baseball" /></div>
              <div><Label>Display name</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Baseball" /></div>
              <div><Label>Playing surface label</Label><Input value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })} placeholder="Field" /></div>
              <div>
                <Label>Scoring type</Label>
                <Select value={form.scoring_type} onValueChange={(v) => setForm({ ...form, scoring_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="runs">Runs</SelectItem>
                    <SelectItem value="goals">Goals</SelectItem>
                    <SelectItem value="strokes">Strokes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Period name</Label><Input value={form.period_name} onChange={(e) => setForm({ ...form, period_name: e.target.value })} placeholder="Inning / Half / Quarter / Hole" /></div>
              <div><Label>Periods per game</Label><Input type="number" value={form.innings_or_halves} onChange={(e) => setForm({ ...form, innings_or_halves: e.target.value })} /></div>
              <div><Label>Min players / team</Label><Input type="number" value={form.min_players_per_team} onChange={(e) => setForm({ ...form, min_players_per_team: e.target.value })} /></div>
              <div><Label>Max players / team</Label><Input type="number" value={form.max_players_per_team} onChange={(e) => setForm({ ...form, max_players_per_team: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : form.id ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {form.id ? "Save sport" : "Add sport"}
              </Button>
              {form.id && <Button variant="ghost" onClick={() => setForm(blank)}>Cancel</Button>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border"><h2 className="font-semibold text-foreground">Sport types</h2></div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sport</TableHead><TableHead>Surface</TableHead><TableHead>Scoring</TableHead>
                  <TableHead>Periods</TableHead><TableHead>Roster</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sports.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.label} <span className="text-xs text-muted-foreground">({s.sport_type})</span></TableCell>
                    <TableCell>{s.field_name}</TableCell>
                    <TableCell className="capitalize">{s.scoring_type}</TableCell>
                    <TableCell>{s.innings_or_halves} × {s.period_name}</TableCell>
                    <TableCell>{s.min_players_per_team}–{s.max_players_per_team}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setForm(s)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border space-y-2">
              <h2 className="font-semibold text-foreground">Assign sports to tournaments</h2>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tournaments..." className="max-w-sm" />
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Tournament</TableHead><TableHead>Date</TableHead><TableHead>Sport</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.date || "—"}</TableCell>
                    <TableCell>
                      <Select value={t.sport_type || "golf"} onValueChange={(v) => assign(t.id, v)}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sports.map((s) => <SelectItem key={s.sport_type} value={s.sport_type}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </RfpAdminGate>
  );
}

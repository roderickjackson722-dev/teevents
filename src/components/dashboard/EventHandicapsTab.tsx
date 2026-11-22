import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  displayCourseHandicap, playingFromRaw, unroundedCourseHandicap,
  validateAllowance, validateIndex, validateTeeSet,
} from "@/lib/eventHandicaps";

type Tee = { key: string; id?: string; name: string; slope: string; rating: string; par: string };
type Player = { id: string; name: string; index: string; teeKey: string };

let seq = 0;
const newKey = () => `new-${++seq}`;

export default function EventHandicapsTab({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tees, setTees] = useState<Tee[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allowance, setAllowance] = useState("100");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [teeRes, regRes, tRes] = await Promise.all([
      supabase.from("course_tee_sets").select("id, tee_name, slope_rating, course_rating, par_total").eq("tournament_id", tournamentId).order("created_at"),
      supabase.from("tournament_registrations").select("id, first_name, last_name, handicap_index, handicap, tee_set_id, status").eq("tournament_id", tournamentId).order("last_name"),
      supabase.from("tournaments").select("handicap_allowance_percentage").eq("id", tournamentId).maybeSingle(),
    ]);
    const t = (teeRes.data || []).map((r) => ({ key: r.id, id: r.id, name: r.tee_name, slope: String(r.slope_rating), rating: String(r.course_rating), par: String(r.par_total) }));
    setTees(t);
    setDeleted([]);
    setPlayers((regRes.data || []).filter((r) => r.status !== "cancelled").map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      index: r.handicap_index != null ? String(r.handicap_index) : r.handicap != null ? Number(r.handicap).toFixed(1) : "",
      teeKey: r.tee_set_id || "",
    })));
    setAllowance(String(tRes.data?.handicap_allowance_percentage ?? 100));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tournamentId]);

  const teeByKey = useMemo(() => new Map(tees.map((t) => [t.key, t])), [tees]);
  const allowancePct = Number(allowance);

  const updateTee = (key: string, patch: Partial<Tee>) => setTees((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const removeTee = (key: string) => {
    const t = teeByKey.get(key);
    if (t?.id) setDeleted((d) => [...d, t.id!]);
    setTees((ts) => ts.filter((x) => x.key !== key));
    setPlayers((ps) => ps.map((p) => (p.teeKey === key ? { ...p, teeKey: "" } : p)));
  };
  const updatePlayer = (id: string, patch: Partial<Player>) => setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function save() {
    setError(null);
    for (const t of tees) {
      const msg = validateTeeSet({ name: t.name, slope: Number(t.slope), rating: Number(t.rating), par: Number(t.par) });
      if (msg) return setError(msg);
    }
    for (const p of players) {
      const msg = validateIndex(p.index);
      if (msg) return setError(`${p.name}: ${msg}`);
    }
    const aMsg = validateAllowance(allowancePct);
    if (aMsg) return setError(aMsg);

    setSaving(true);
    try {
      if (deleted.length) {
        const { error } = await supabase.from("course_tee_sets").delete().in("id", deleted);
        if (error) throw error;
      }
      const keyToId = new Map<string, string>();
      for (const t of tees) {
        const row = { tee_name: t.name.trim(), slope_rating: Number(t.slope), course_rating: Number(t.rating), par_total: Number(t.par) };
        if (t.id) {
          const { error } = await supabase.from("course_tee_sets").update(row).eq("id", t.id);
          if (error) throw error;
          keyToId.set(t.key, t.id);
        } else {
          const { data, error } = await supabase.from("course_tee_sets").insert({ ...row, tournament_id: tournamentId }).select("id").single();
          if (error) throw error;
          keyToId.set(t.key, data.id);
        }
      }
      const { error: aErr } = await supabase.from("tournaments").update({ handicap_allowance_percentage: allowancePct }).eq("id", tournamentId);
      if (aErr) throw aErr;
      for (const p of players) {
        const tee = teeByKey.get(p.teeKey);
        const idx = p.index.trim() === "" ? null : Number(p.index);
        const raw = tee ? unroundedCourseHandicap(idx, Number(tee.slope), Number(tee.rating), Number(tee.par)) : null;
        const { error } = await supabase.from("tournament_registrations").update({
          handicap_index: idx,
          tee_set_id: keyToId.get(p.teeKey) ?? null,
          course_handicap: raw == null ? null : Number(displayCourseHandicap(raw)),
          playing_handicap: playingFromRaw(raw, allowancePct),
        }).eq("id", p.id);
        if (error) throw error;
      }
      toast.success("Handicaps saved.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Tee Sets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tees.length === 0 && <p className="text-sm text-muted-foreground">No tee sets yet. Add one to assign players.</p>}
          {tees.map((t) => (
            <div key={t.key} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end">
              <div><Label className="text-xs">Name</Label><Input value={t.name} onChange={(e) => updateTee(t.key, { name: e.target.value })} placeholder="Men, Women, Blue…" /></div>
              <div><Label className="text-xs">Slope Rating</Label><Input type="number" min={55} max={155} value={t.slope} onChange={(e) => updateTee(t.key, { slope: e.target.value })} /></div>
              <div><Label className="text-xs">Course Rating</Label><Input type="number" step="0.1" min={55} max={85} value={t.rating} onChange={(e) => updateTee(t.key, { rating: e.target.value })} /></div>
              <div><Label className="text-xs">Par</Label><Input type="number" min={27} max={72} value={t.par} onChange={(e) => updateTee(t.key, { par: e.target.value })} /></div>
              <Button variant="ghost" size="sm" onClick={() => removeTee(t.key)} aria-label={`Delete ${t.name || "tee set"}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setTees((ts) => [...ts, { key: newKey(), name: "", slope: "113", rating: "72", par: "72" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add tee set
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Players</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="hcp-allowance">Handicap Allowance (%)</Label>
            <Input id="hcp-allowance" type="number" min={0} max={100} value={allowance} onChange={(e) => setAllowance(e.target.value)} />
          </div>
          <p className="text-sm font-medium text-foreground">TeeVents calculated Course Handicap. Not an official USGA Handicap Index. No GHIN sync.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-2">Player name</th><th className="py-2 pr-2">Handicap Index</th><th className="py-2 pr-2">Tee</th>
                  <th className="py-2 pr-2">Slope Rating</th><th className="py-2 pr-2">Course Rating</th><th className="py-2 pr-2">Par</th>
                  <th className="py-2 pr-2">Course Handicap</th><th className="py-2">Playing Handicap</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 && <tr><td colSpan={8} className="py-4 text-muted-foreground">No players on the registration list yet.</td></tr>}
                {players.map((p) => {
                  const tee = teeByKey.get(p.teeKey);
                  const idx = p.index.trim() === "" || validateIndex(p.index) ? null : Number(p.index);
                  const raw = tee ? unroundedCourseHandicap(idx, Number(tee.slope), Number(tee.rating), Number(tee.par)) : null;
                  const play = playingFromRaw(raw, Number.isFinite(allowancePct) ? allowancePct : 100);
                  return (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-2 pr-2 font-medium">{p.name}</td>
                      <td className="py-2 pr-2"><Input className="h-8 w-20" type="number" step="0.1" min={0} max={54} value={p.index} onChange={(e) => updatePlayer(p.id, { index: e.target.value })} aria-label={`Handicap Index for ${p.name}`} /></td>
                      <td className="py-2 pr-2">
                        <select className="h-8 rounded-md border border-input bg-background px-2" value={p.teeKey} onChange={(e) => updatePlayer(p.id, { teeKey: e.target.value })} aria-label={`Tee for ${p.name}`}>
                          <option value="">Select tee</option>
                          {tees.map((t) => <option key={t.key} value={t.key}>{t.name || "Unnamed tee"}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-2">{tee?.slope ?? "—"}</td>
                      <td className="py-2 pr-2">{tee?.rating ?? "—"}</td>
                      <td className="py-2 pr-2">{tee?.par ?? "—"}</td>
                      <td className="py-2 pr-2">{displayCourseHandicap(raw)}</td>
                      <td className="py-2">{play == null ? "—" : play}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes</Button>
      </div>
    </div>
  );
}

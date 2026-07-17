import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Trash2, Loader2, Settings } from "lucide-react";
import LeagueForm from "./LeagueForm";

export default function LeagueSettingsTab({ league, onSaved }: { league: any; onSaved: () => void }) {
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);
  const [pts, setPts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("league_point_systems").select("*").eq("league_id", league.id).maybeSingle();
    setPts(data || { win_points: 2, tie_points: 1, loss_points: 0, position_points: { "1": 10, "2": 8, "3": 6, "4": 4, "5": 2 } });
    setLoading(false);
  };

  useEffect(() => { load(); }, [league.id]);

  const savePts = async () => {
    setSaving(true);
    const payload = {
      league_id: league.id,
      win_points: Number(pts.win_points),
      tie_points: Number(pts.tie_points),
      loss_points: Number(pts.loss_points),
      position_points: typeof pts.position_points === "string" ? JSON.parse(pts.position_points) : pts.position_points,
    };
    const { error } = await (supabase as any).from("league_point_systems").upsert(payload, { onConflict: "league_id" });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Point system saved" });
    setSaving(false);
  };

  const del = async () => {
    if (!confirm(`Delete "${league.league_name}"? This removes all members, events, and scores.`)) return;
    if (!confirm("This action cannot be undone. Really delete?")) return;
    const { error } = await (supabase as any).from("golf_leagues").delete().eq("id", league.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "League deleted" });
    navigate("/dashboard/leagues");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> League Details</h2>
            <Button variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {league.league_name}</div>
            <div><span className="text-muted-foreground">Slug:</span> {league.league_slug}</div>
            <div><span className="text-muted-foreground">Season:</span> {league.season_year || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> {league.is_active ? "Active" : "Inactive"}</div>
            <div><span className="text-muted-foreground">Public:</span> {league.is_public ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground">Dates:</span> {league.start_date || "?"} → {league.end_date || "?"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-lg font-semibold">Point System</h2>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Win Points</Label>
                  <Input type="number" value={pts.win_points} onChange={(e) => setPts({ ...pts, win_points: e.target.value })} />
                </div>
                <div>
                  <Label>Tie Points</Label>
                  <Input type="number" value={pts.tie_points} onChange={(e) => setPts({ ...pts, tie_points: e.target.value })} />
                </div>
                <div>
                  <Label>Loss Points</Label>
                  <Input type="number" value={pts.loss_points} onChange={(e) => setPts({ ...pts, loss_points: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Position Points (JSON)</Label>
                <Input
                  value={typeof pts.position_points === "string" ? pts.position_points : JSON.stringify(pts.position_points)}
                  onChange={(e) => setPts({ ...pts, position_points: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Example: {`{"1":10,"2":8,"3":6,"4":4,"5":2}`}</p>
              </div>
              <Button onClick={savePts} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Point System
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-destructive mb-3">Danger Zone</h2>
          <Button variant="destructive" onClick={del}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete League
          </Button>
        </CardContent>
      </Card>

      {showEdit && (
        <LeagueForm
          initial={league}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onSaved(); }}
        />
      )}
    </div>
  );
}

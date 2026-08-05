import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, RefreshCw, ListOrdered } from "lucide-react";
import {
  buildLeaderboardRows,
  formatToPar,
  type LeaderboardPayload,
  type LeaderboardRow,
} from "@/lib/leagueTeamLeaderboard";

interface Props {
  eventId: string;
  /** Allows league managers to edit team scores inline. */
  editable?: boolean;
}

/** Team leaderboard for a league event. Supports 9- and 18-hole events. */
export default function LeagueTeamLeaderboard({ eventId, editable = false }: Props) {
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LeaderboardRow | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<LeaderboardRow | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    const { data, error } = await (supabase as any).rpc("get_league_event_leaderboard", { _event_id: eventId });
    if (!error && data?.found) {
      setPayload(data as LeaderboardPayload);
      setRows(buildLeaderboardRows(data as LeaderboardPayload));
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  useEffect(() => {
    if (!eventId) return;
    const channel = (supabase as any)
      .channel(`league-team-scores-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_team_scores", filter: `event_id=eq.${eventId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "league_team_pairings", filter: `event_id=eq.${eventId}` }, () => load())
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [eventId, load]);

  const openEdit = (row: LeaderboardRow) => {
    const d: Record<number, string> = {};
    for (let h = 1; h <= row.holes; h++) d[h] = row.scores[h] != null ? String(row.scores[h]) : "";
    setDraft(d);
    setEditing(row);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const upserts = Object.entries(draft)
      .filter(([, v]) => v.trim() !== "")
      .map(([h, v]) => ({
        pairing_id: editing.pairing_id,
        event_id: eventId,
        hole_number: Number(h),
        gross_score: Number(v),
      }));
    const clears = Object.entries(draft).filter(([, v]) => v.trim() === "").map(([h]) => Number(h));

    let err: any = null;
    if (upserts.length > 0) {
      const { error } = await (supabase as any)
        .from("league_team_scores")
        .upsert(upserts, { onConflict: "pairing_id,hole_number" });
      err = error;
    }
    if (!err && clears.length > 0) {
      const { error } = await (supabase as any)
        .from("league_team_scores")
        .delete()
        .eq("pairing_id", editing.pairing_id)
        .in("hole_number", clears);
      err = error;
    }
    setSaving(false);
    if (err) return toast({ title: "Save failed", description: err.message, variant: "destructive" });
    toast({ title: "Scores updated" });
    setEditing(null);
    load();
  };

  const showGross = payload?.show_gross !== false;
  const showNet = payload?.show_net !== false;

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No teams paired for this event yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {payload?.holes === 9 ? 9 : 18} holes{payload?.course_name ? ` • ${payload.course_name}` : ""}
        </p>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Pos</TableHead>
              <TableHead>Team</TableHead>
              {showGross && <TableHead className="text-right">Gross</TableHead>}
              {showNet && <TableHead className="text-right">Net</TableHead>}
              <TableHead className="text-right">Thru</TableHead>
              <TableHead className="text-right">Scores</TableHead>
              {editable && <TableHead className="text-right">Edit</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.pairing_id}>
                <TableCell className="font-bold">{r.thru > 0 ? i + 1 : "—"}</TableCell>
                <TableCell className="font-medium">
                  {r.team_name}
                  {r.players && <span className="block text-xs text-muted-foreground">{r.players}</span>}
                </TableCell>
                {showGross && <TableCell className="text-right">{r.thru > 0 ? formatToPar(r.toParGross) : "—"}</TableCell>}
                {showNet && <TableCell className="text-right">{r.thru > 0 ? formatToPar(r.toParNet) : "—"}</TableCell>}
                <TableCell className="text-right">{r.thru}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                    <ListOrdered className="h-3.5 w-3.5 mr-1" /> Hole-by-Hole
                  </Button>
                </TableCell>
                {editable && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Hole-by-Hole Scores — {viewing?.team_name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hole</TableHead>
                    <TableHead className="text-right">Par</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: viewing.holes }, (_, i) => i + 1).map((h) => {
                    const par = Array.isArray(payload?.hole_pars) ? Number(payload!.hole_pars![h - 1]) : null;
                    const sc = viewing.scores[h];
                    return (
                      <TableRow key={h}>
                        <TableCell>{h}</TableCell>
                        <TableCell className="text-right">{par ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">{sc != null ? sc : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-sm font-semibold mt-3">
                Total: {viewing.gross || "—"} {viewing.thru > 0 ? `(thru ${viewing.thru})` : ""}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit scores — {editing?.team_name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto">
            {Object.keys(draft).map((h) => (
              <div key={h}>
                <p className="text-xs text-muted-foreground mb-1">Hole {h}</p>
                <Input
                  inputMode="numeric"
                  value={draft[Number(h)]}
                  onChange={(e) => setDraft((p) => ({ ...p, [Number(h)]: e.target.value.replace(/[^0-9]/g, "") }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save Scores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

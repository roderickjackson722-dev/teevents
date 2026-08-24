import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, RotateCcw, Loader2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { fetchAllTournamentScores, chunkRows } from "@/lib/fetchLeaderboardScores";

interface Props {
  tournamentId: string;
  canManage: boolean;
  lastResetAt?: string | null;
  onChange?: () => void;
}

interface SnapshotRow {
  id: string;
  created_at: string;
  score_count: number;
  retrieved_at: string | null;
  reset_by: string | null;
}

interface SnapshotScore {
  registration_id: string;
  hole_number: number;
  round_number?: number;
  strokes: number;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeaderboardResetCard({ tournamentId, canManage, lastResetAt, onChange }: Props) {
  const queryClient = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [retrieveId, setRetrieveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: snapshots, refetch } = useQuery({
    queryKey: ["leaderboard-snapshots", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard_snapshots")
        .select("id, created_at, score_count, retrieved_at, reset_by")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SnapshotRow[];
    },
    enabled: !!tournamentId && canManage,
  });

  if (!canManage) return null;

  const latest = snapshots?.[0] ?? null;

  const doReset = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Paginated read: large events can hold 20,000+ score rows, well past the
      // 1000-row response cap, and a snapshot must capture every one of them.
      const rows = (await fetchAllTournamentScores(tournamentId, {
        columns: "registration_id, hole_number, round_number, strokes",
      })) as SnapshotScore[];

      const { error: snapErr } = await supabase.from("leaderboard_snapshots").insert({
        tournament_id: tournamentId,
        snapshot_data: rows as unknown as never,
        score_count: rows.length,
        reset_by: user?.id ?? null,
      } as never);
      if (snapErr) throw snapErr;

      const { error: delErr } = await supabase
        .from("tournament_scores")
        .delete()
        .eq("tournament_id", tournamentId);
      if (delErr) throw delErr;

      const { data: tRow } = await supabase
        .from("tournaments")
        .select("leaderboard_reset_count")
        .eq("id", tournamentId)
        .maybeSingle();

      await supabase
        .from("tournaments")
        .update({
          leaderboard_reset_count: (((tRow as { leaderboard_reset_count?: number } | null)?.leaderboard_reset_count) || 0) + 1,
          leaderboard_last_reset_at: new Date().toISOString(),
          leaderboard_last_reset_by: user?.id ?? null,
        } as never)
        .eq("id", tournamentId);

      toast({ title: "Leaderboard reset", description: `${rows.length} score(s) cleared and saved to a snapshot.` });
      setConfirmReset(false);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tournament-scores", tournamentId] });
      onChange?.();
    } catch (e) {
      toast({ title: "Reset failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const doRetrieve = async (snapshotId: string) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: snap, error: snapErr } = await supabase
        .from("leaderboard_snapshots")
        .select("id, snapshot_data")
        .eq("id", snapshotId)
        .maybeSingle();
      if (snapErr) throw snapErr;
      const rows = ((snap as { snapshot_data?: SnapshotScore[] } | null)?.snapshot_data || []) as SnapshotScore[];
      if (rows.length === 0) {
        toast({ title: "Nothing to restore", description: "That snapshot has no saved scores." });
        setRetrieveId(null);
        return;
      }

      const restoreRows = rows.map((r) => ({
        tournament_id: tournamentId,
        registration_id: r.registration_id,
        hole_number: r.hole_number,
        round_number: r.round_number || 1,
        strokes: r.strokes,
      }));
      for (const batch of chunkRows(restoreRows, 500)) {
        const { error: upErr } = await supabase.from("tournament_scores").upsert(
          batch as never,
          { onConflict: "registration_id,round_number,hole_number" }
        );
        if (upErr) throw upErr;
      }

      await supabase
        .from("leaderboard_snapshots")
        .update({ retrieved_at: new Date().toISOString(), retrieved_by: user?.id ?? null } as never)
        .eq("id", snapshotId);

      toast({ title: "Leaderboard restored", description: `${rows.length} score(s) restored.` });
      setRetrieveId(null);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tournament-scores", tournamentId] });
      onChange?.();
    } catch (e) {
      toast({ title: "Retrieve failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" /> Edit History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {lastResetAt && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span>Last reset: {fmt(lastResetAt)}</span>
          </div>
        )}

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Reset Leaderboard
          </div>
          <p className="text-sm text-muted-foreground">
            This will clear ALL current scores from the leaderboard. This action can be undone by using the
            "Retrieve Last Leaderboard" button below.
          </p>
          <Button variant="destructive" disabled={busy} onClick={() => setConfirmReset(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reset Leaderboard
          </Button>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Reset History</h4>
          {!snapshots || snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leaderboard resets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Scores Saved</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{fmt(s.created_at)}</TableCell>
                      <TableCell>{s.score_count}</TableCell>
                      <TableCell>
                        {s.retrieved_at ? (
                          <Badge variant="secondary">Reverted</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setRetrieveId(s.id)}>
                          Retrieve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {latest && (
            <Button variant="outline" disabled={busy} onClick={() => setRetrieveId(latest.id)}>
              <RotateCcw className="h-4 w-4 mr-2" /> Retrieve Last Leaderboard
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmReset} onOpenChange={(o) => !o && setConfirmReset(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Confirm Reset Leaderboard
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to reset the leaderboard?</p>
                <p>This will clear ALL current scores from the leaderboard.</p>
                <p>A snapshot of the current scores will be saved in case you need to restore them.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void doReset();
              }}
            >
              Yes, Reset Leaderboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!retrieveId} onOpenChange={(o) => !o && setRetrieveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Confirm Retrieve Last Leaderboard
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to retrieve the last leaderboard snapshot?</p>
                <p>This will restore the scores from the previous reset.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (retrieveId) void doRetrieve(retrieveId);
              }}
            >
              Yes, Retrieve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

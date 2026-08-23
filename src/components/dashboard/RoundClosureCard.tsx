import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Info, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parsePairingsConfig, roundLabel, roundDateFor } from "@/lib/pairingsConfig";
import { closedRoundSet, type TournamentRoundRow } from "@/lib/tournamentRounds";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * "Close Round" control for the Scoring dashboard. Closing a round locks its
 * scores (writes are rejected by the database) and moves player scoring — with
 * the same scoring codes — onto the next round.
 */
export default function RoundClosureCard({ tournamentId }: { tournamentId: string }) {
  const queryClient = useQueryClient();
  const [confirmRound, setConfirmRound] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: tournament } = useQuery({
    queryKey: ["round-closure-tournament", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, date, pairings_config")
        .eq("id", tournamentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const { data: rounds, isLoading } = useQuery({
    queryKey: ["tournament-rounds", tournamentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tournament_rounds")
        .select("round_number, status, closed_at")
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      return (data || []) as TournamentRoundRow[];
    },
    enabled: !!tournamentId,
  });

  const cfg = parsePairingsConfig((tournament as any)?.pairings_config);
  const totalRounds = Math.max(1, cfg.rounds || 1);
  const closed = closedRoundSet(rounds);

  const setStatus = async (roundNumber: number, status: "active" | "closed") => {
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("tournament_rounds").upsert(
      {
        tournament_id: tournamentId,
        round_number: roundNumber,
        status,
        closed_at: status === "closed" ? new Date().toISOString() : null,
        closed_by: status === "closed" ? userRes?.user?.id ?? null : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tournament_id,round_number" }
    );
    setBusy(false);
    setConfirmRound(null);
    if (error) {
      toast({ title: "Could not update round", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["tournament-rounds", tournamentId] });
    toast({
      title: status === "closed" ? `${roundLabel(roundNumber - 1)} closed` : `${roundLabel(roundNumber - 1)} reopened`,
      description:
        status === "closed"
          ? "Scores for this round are now locked. Players use the same codes for the next round."
          : "Scores for this round can be edited again.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" /> Round Status
        </CardTitle>
        <CardDescription>
          Close a round once all scores are in. Closed rounds are locked and players keep the same
          scoring codes for the next round.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          Array.from({ length: totalRounds }, (_, i) => i + 1).map((rn) => {
            const isClosed = closed.has(rn);
            const date = roundDateFor(cfg, rn - 1, rn === 1 ? (tournament as any)?.date : null);
            return (
              <div
                key={rn}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{roundLabel(rn - 1)} Status:</span>
                    {isClosed ? (
                      <Badge variant="secondary">Closed</Badge>
                    ) : (
                      <Badge>In Progress</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {date ? new Date(`${String(date).slice(0, 10)}T12:00:00`).toLocaleDateString() : "No date set"}
                  </p>
                </div>
                {isClosed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setStatus(rn, "active")}
                  >
                    <Unlock className="h-4 w-4 mr-1.5" /> Reopen {roundLabel(rn - 1)}
                  </Button>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => setConfirmRound(rn)}>
                    <Lock className="h-4 w-4 mr-1.5" /> Close {roundLabel(rn - 1)}
                  </Button>
                )}
              </div>
            );
          })
        )}

        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p>
            Closing a round locks its scores and prepares the next round. Scoring codes never change —
            the scoring app simply shows the next round.
          </p>
        </div>
      </CardContent>

      <AlertDialog open={confirmRound != null} onOpenChange={(o) => !o && setConfirmRound(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Close {confirmRound ? roundLabel(confirmRound - 1) : "round"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will lock {confirmRound ? roundLabel(confirmRound - 1) : "this round"} scores and
              prepare for {confirmRound ? roundLabel(confirmRound) : "the next round"}. You can reopen
              the round later if you need to make corrections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRound && setStatus(confirmRound, "closed")}>
              Close Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

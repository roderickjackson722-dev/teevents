import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
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

/** True when a registration row is withdrawn. */
export function isWithdrawn(status?: string | null) {
  return String(status || "active").toLowerCase() === "wd";
}

/**
 * Mark a player WD (withdrawn) — or reinstate them — straight from score entry,
 * so organizers don't have to leave the scoring table. Withdrawn players stop
 * counting toward scoring, team totals, skins and payouts.
 */
export default function ScoreEntryWd({
  registrationId,
  playerName,
  status,
  disabled,
  onChanged,
}: {
  registrationId: string;
  playerName: string;
  status?: string | null;
  disabled?: boolean;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const wd = isWithdrawn(status);

  const mutation = useMutation({
    mutationFn: async (next: "active" | "wd") => {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({
          status: next,
          wd_at: next === "wd" ? new Date().toISOString() : null,
        } as any)
        .eq("id", registrationId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast({ title: next === "wd" ? "Player marked WD" : "Player reinstated" });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-players"] });
      onChanged?.();
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Could not update player", description: e.message, variant: "destructive" }),
  });

  if (wd) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px]"
        disabled={disabled || mutation.isPending}
        onClick={() => mutation.mutate("active")}
      >
        Reinstate
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[11px]"
        disabled={disabled || mutation.isPending}
        onClick={() => setOpen(true)}
      >
        WD
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as WD (Withdrawn)</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Player: <strong>{playerName}</strong></p>
                <p>Are you sure you want to mark {playerName} as withdrawn (WD)?</p>
                <p>This will:</p>
                <ul className="list-disc pl-5">
                  <li>Remove them from the live leaderboard</li>
                  <li>Remove them from scoring</li>
                  <li>Remove them from skins eligibility</li>
                  <li>They will not receive payouts</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate("wd")}>Confirm WD</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

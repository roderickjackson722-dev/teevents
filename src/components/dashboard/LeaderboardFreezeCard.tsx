import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  tournamentId: string;
  frozenAt: string | null;
  canManage: boolean;
  onChange: () => void;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LeaderboardFreezeCard({ tournamentId, frozenAt, canManage, onChange }: Props) {
  const [when, setWhen] = useState<string>(toLocalInputValue(frozenAt));
  const [saving, setSaving] = useState(false);

  const isFrozen = !!frozenAt && new Date(frozenAt).getTime() <= Date.now();
  const isScheduled = !!frozenAt && new Date(frozenAt).getTime() > Date.now();

  const applyFreeze = async (whenIso: string | null) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("tournaments")
      .update({
        leaderboard_frozen_at: whenIso,
        leaderboard_frozen_by: whenIso ? user?.id ?? null : null,
      } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't update freeze", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: whenIso ? (new Date(whenIso).getTime() <= Date.now() ? "Leaderboard frozen" : "Freeze scheduled") : "Leaderboard unfrozen",
    });
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isFrozen ? <Lock className="h-5 w-5 text-destructive" /> : <Unlock className="h-5 w-5" />}
          Freeze Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Lock scores so nobody can add or edit them. Freeze immediately, or schedule a future time (e.g. tee-off close).
        </p>

        {isFrozen && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            <strong>Frozen</strong> — score entry is disabled for everyone.
            Applied {new Date(frozenAt!).toLocaleString()}.
          </div>
        )}
        {isScheduled && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 px-3 py-2 text-sm">
            <strong>Scheduled</strong> — leaderboard will lock on {new Date(frozenAt!).toLocaleString()}.
          </div>
        )}

        {canManage ? (
          <>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <Label htmlFor="freeze-at" className="text-xs">Freeze at (leave blank to freeze now)</Label>
                <Input
                  id="freeze-at"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => applyFreeze(when ? new Date(when).toISOString() : new Date().toISOString())}
                  disabled={saving}
                  variant="destructive"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                  {when ? "Schedule Freeze" : "Freeze Now"}
                </Button>
                {frozenAt && (
                  <Button variant="outline" onClick={() => applyFreeze(null)} disabled={saving}>
                    <Unlock className="h-4 w-4 mr-1" /> Unfreeze
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Only owners, admins, or platform admins can change the freeze.</p>
        )}
      </CardContent>
    </Card>
  );
}

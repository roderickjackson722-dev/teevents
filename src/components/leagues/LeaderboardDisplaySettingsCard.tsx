import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, ListOrdered, Save } from "lucide-react";

/** Controls whether the live league leaderboard shows Gross and/or Net columns. */
export default function LeaderboardDisplaySettingsCard({
  league,
  onSaved,
}: {
  league: any;
  onSaved?: () => void;
}) {
  const [showGross, setShowGross] = useState(league.leaderboard_show_gross !== false);
  const [showNet, setShowNet] = useState(league.leaderboard_show_net !== false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!showGross && !showNet) {
      return toast({ title: "Keep at least one column", description: "Show Gross, Net, or both.", variant: "destructive" });
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("golf_leagues")
      .update({ leaderboard_show_gross: showGross, leaderboard_show_net: showNet })
      .eq("id", league.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Leaderboard display settings saved" });
    onSaved?.();
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListOrdered className="h-5 w-5" /> Leaderboard Display Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose which score columns appear on the live event leaderboard. Turn Net off if your league is not using handicaps.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={showGross} onCheckedChange={(v) => setShowGross(!!v)} />
          Show Gross scores
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={showNet} onCheckedChange={(v) => setShowNet(!!v)} />
          Show Net scores
        </label>

        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

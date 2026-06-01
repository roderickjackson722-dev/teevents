import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props { tournamentId: string }

interface Settings {
  live_leaderboard_enabled: boolean;
  live_scoring_require_code: boolean;
  live_show_gross: boolean;
  live_show_net: boolean;
  live_default_view: string;
  live_show_sponsors: boolean;
  live_sponsor_placement: string;
  live_allow_edit_past_holes: boolean;
  live_require_confirm_save: boolean;
}

const DEFAULTS: Settings = {
  live_leaderboard_enabled: true,
  live_scoring_require_code: true,
  live_show_gross: true,
  live_show_net: true,
  live_default_view: "gross",
  live_show_sponsors: true,
  live_sponsor_placement: "footer",
  live_allow_edit_past_holes: true,
  live_require_confirm_save: false,
};

export default function LiveLeaderboardSettings({ tournamentId }: Props) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("live_leaderboard_enabled, live_scoring_require_code, live_show_gross, live_show_net, live_default_view, live_show_sponsors, live_sponsor_placement, live_allow_edit_past_holes, live_require_confirm_save")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setS({ ...DEFAULTS, ...(data as any) });
        setLoading(false);
      });
  }, [tournamentId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("tournaments").update(s as any).eq("id", tournamentId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Live Leaderboard Settings</CardTitle>
        <CardDescription>Control the player-facing scoring and leaderboard experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Row label="Enable live leaderboard" desc="Show the public leaderboard at /live/{slug}.">
          <Switch checked={s.live_leaderboard_enabled} onCheckedChange={(v) => set("live_leaderboard_enabled", v)} />
        </Row>

        <section className="space-y-3 pt-2 border-t">
          <h3 className="text-sm font-semibold">Scoring Access</h3>
          <RadioGroup value={s.live_scoring_require_code ? "code" : "open"} onValueChange={(v) => set("live_scoring_require_code", v === "code")}>
            <div className="flex items-center space-x-2"><RadioGroupItem value="code" id="r-code" /><Label htmlFor="r-code">Scoring code required (players enter 6-character code)</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="open" id="r-open" /><Label htmlFor="r-open">No code required (anyone can enter scores)</Label></div>
          </RadioGroup>
        </section>

        <section className="space-y-3 pt-2 border-t">
          <h3 className="text-sm font-semibold">Leaderboard Display</h3>
          <Row label="Show Gross scores"><Switch checked={s.live_show_gross} onCheckedChange={(v) => set("live_show_gross", v)} /></Row>
          <Row label="Show Net scores"><Switch checked={s.live_show_net} onCheckedChange={(v) => set("live_show_net", v)} /></Row>
          <div>
            <Label className="text-sm">Default view</Label>
            <RadioGroup className="flex gap-4 mt-2" value={s.live_default_view} onValueChange={(v) => set("live_default_view", v)}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="gross" id="v-gross" /><Label htmlFor="v-gross">Gross</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="net" id="v-net" /><Label htmlFor="v-net">Net</Label></div>
            </RadioGroup>
          </div>
        </section>

        <section className="space-y-3 pt-2 border-t">
          <h3 className="text-sm font-semibold">Sponsor Logos on Leaderboard</h3>
          <Row label="Show sponsor logos"><Switch checked={s.live_show_sponsors} onCheckedChange={(v) => set("live_show_sponsors", v)} /></Row>
          {s.live_show_sponsors && (
            <div>
              <Label className="text-sm">Placement</Label>
              <RadioGroup className="flex gap-4 mt-2" value={s.live_sponsor_placement} onValueChange={(v) => set("live_sponsor_placement", v)}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="footer" id="p-footer" /><Label htmlFor="p-footer">Footer</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="banner" id="p-banner" /><Label htmlFor="p-banner">Rotating banner</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="sidebar" id="p-sidebar" /><Label htmlFor="p-sidebar">Sidebar</Label></div>
              </RadioGroup>
            </div>
          )}
        </section>

        <section className="space-y-3 pt-2 border-t">
          <h3 className="text-sm font-semibold">Scoring Interface</h3>
          <Row label="Allow players to edit past holes"><Switch checked={s.live_allow_edit_past_holes} onCheckedChange={(v) => set("live_allow_edit_past_holes", v)} /></Row>
          <Row label="Require confirmation before saving"><Switch checked={s.live_require_confirm_save} onCheckedChange={(v) => set("live_require_confirm_save", v)} /></Row>
        </section>

        <div className="pt-2 border-t">
          <Button onClick={save} disabled={saving} style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label className="text-sm">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

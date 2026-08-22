import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trophy, Coins } from "lucide-react";
import { toast } from "sonner";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import FlightsManager from "@/components/dashboard/FlightsManager";

const EXTRA_FORMATS = [
  { id: "match_play", name: "Match Play", description: "Head-to-head, hole-by-hole competition" },
  { id: "skins", name: "Skins", description: "Lowest score on a hole wins the skin" },
];

const FORMAT_OPTIONS = [
  ...SCORING_FORMATS.map((f) => ({ id: f.id, name: f.name, description: f.description })),
  ...EXTRA_FORMATS,
];

export default function ScoringPayouts() {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useTournamentIdParam();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [format, setFormat] = useState("stroke_play");
  const [customFormat, setCustomFormat] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [skinsEnabled, setSkinsEnabled] = useState(false);
  const [skinsMode, setSkinsMode] = useState("gross");
  const [skinsFee, setSkinsFee] = useState("");

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = data || [];
        setTournaments(t);
        if (t.length > 0 && !selected) setSelected(t[0].id);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const load = useCallback(async (tid: string) => {
    if (!tid) return;
    const { data } = await supabase
      .from("tournaments")
      .select("scoring_format, skins_enabled, skins_mode, skins_entry_fee_cents")
      .eq("id", tid)
      .maybeSingle();
    if (!data) return;
    const fmt = (data as any).scoring_format || "stroke_play";
    const known = FORMAT_OPTIONS.some((f) => f.id === fmt);
    setIsCustom(!known);
    setFormat(known ? fmt : "custom");
    setCustomFormat(known ? "" : fmt);
    setSkinsEnabled(!!(data as any).skins_enabled);
    setSkinsMode((data as any).skins_mode || "gross");
    const cents = (data as any).skins_entry_fee_cents || 0;
    setSkinsFee(cents ? (cents / 100).toString() : "");
  }, []);

  useEffect(() => {
    if (selected) load(selected);
  }, [selected, load]);

  async function save() {
    if (!selected) return;
    const value = isCustom ? customFormat.trim() : format;
    if (isCustom && !value) return toast.error("Enter a custom format name");
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        scoring_format: value,
        skins_enabled: skinsEnabled,
        skins_mode: skinsMode,
        skins_entry_fee_cents: skinsFee.trim() ? Math.round(parseFloat(skinsFee) * 100) : 0,
      } as any)
      .eq("id", selected);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Scoring & payouts saved");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Scoring &amp; Payouts</h1>
        <p className="text-muted-foreground">Create a tournament first to configure scoring and payouts.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Scoring &amp; Payouts</h1>
        <p className="text-muted-foreground mt-1">
          Choose how your event is scored, turn on skins, flight the field, and confirm the payout breakdown — all in one place.
        </p>
      </div>

      {tournaments.length > 1 && (
        <div className="max-w-sm">
          <Label>Tournament</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select a tournament" /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-primary" /> Scoring Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Select the format for your tournament:</p>
          <RadioGroup
            value={isCustom ? "custom" : format}
            onValueChange={(v) => {
              if (v === "custom") { setIsCustom(true); }
              else { setIsCustom(false); setFormat(v); }
            }}
            className="grid sm:grid-cols-2 gap-2"
          >
            {FORMAT_OPTIONS.map((f) => (
              <div key={f.id} className="flex items-start gap-2 rounded-md border p-3">
                <RadioGroupItem value={f.id} id={`fmt-${f.id}`} className="mt-1" />
                <div>
                  <Label htmlFor={`fmt-${f.id}`} className="font-medium cursor-pointer">{f.name}</Label>
                  {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2 rounded-md border p-3 sm:col-span-2">
              <RadioGroupItem value="custom" id="fmt-custom" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="fmt-custom" className="font-medium cursor-pointer">Custom</Label>
                <Input
                  className="mt-2"
                  placeholder="Name your own format"
                  value={customFormat}
                  onChange={(e) => { setCustomFormat(e.target.value); setIsCustom(true); }}
                />
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Coins className="h-5 w-5 text-primary" /> Skins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="skins-enabled" checked={skinsEnabled} onCheckedChange={setSkinsEnabled} />
            <Label htmlFor="skins-enabled">Enable Skins</Label>
          </div>
          {skinsEnabled && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Skins Type</Label>
                <RadioGroup value={skinsMode} onValueChange={setSkinsMode} className="mt-2 space-y-2">
                  {[["gross", "Gross Skins"], ["net", "Net Skins"], ["both", "Both"]].map(([v, label]) => (
                    <div key={v} className="flex items-center gap-2">
                      <RadioGroupItem value={v} id={`skins-${v}`} />
                      <Label htmlFor={`skins-${v}`} className="font-normal cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="skins-fee">Skins Entry Fee (USD)</Label>
                <Input
                  id="skins-fee"
                  type="number"
                  min="0"
                  step="1"
                  value={skinsFee}
                  onChange={(e) => setSkinsFee(e.target.value)}
                  placeholder="20"
                />
                <p className="text-xs text-muted-foreground mt-1">Per-player skins buy-in collected at registration or on event day.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Scoring &amp; Payouts
        </Button>
      </div>

      {selected && <DivisionSkinsManager tournamentId={selected} />}

      {selected && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">Flights &amp; Payout Breakdown</h2>
          <FlightsManager tournamentId={selected} />
        </div>
      )}

    </div>
  );
}

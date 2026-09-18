import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import EnterpriseEventPicker from "@/components/enterprise/EnterpriseEventPicker";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, ExternalLink, Loader2, Monitor, Save } from "lucide-react";
import { toast } from "sonner";
import type { EnterpriseLeaderboardSettings as LbSettings } from "@/lib/enterprise";

export default function EnterpriseLeaderboardSettings() {
  const { events, event, settings, loading, selectEvent, saveSettings } = useEnterpriseEvent();
  const [lb, setLb] = useState<LbSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setLb(settings.leaderboard); }, [settings]);

  const set = (patch: Partial<LbSettings>) => setLb((v) => (v ? { ...v, ...patch } : v));
  const setTv = (patch: Partial<LbSettings["tv"]>) => setLb((v) => (v ? { ...v, tv: { ...v.tv, ...patch } } : v));
  const setEv = (patch: Partial<LbSettings["eventOptions"]>) =>
    setLb((v) => (v ? { ...v, eventOptions: { ...v.eventOptions, ...patch } } : v));

  const tvUrl = event ? `https://www.teevents.golf/t/${event.slug || event.id}/tv` : "";
  const holes = settings?.holes || 18;

  const save = async () => {
    if (!lb) return;
    setSaving(true);
    await saveSettings({ leaderboard: lb }, {
      leaderboard_show_gross: lb.showGross,
      leaderboard_show_net: lb.showNet,
    });
    setSaving(false);
    toast.success("Leaderboard settings saved.");
  };

  const toggle = (label: string, key: keyof LbSettings, hint?: string) => (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={Boolean(lb?.[key])} onCheckedChange={(v) => set({ [key]: v } as never)} />
    </label>
  );

  return (
    <EnterpriseLayout
      title="Leaderboard & Scoring"
      description="Handicap allowances, what players see on the leaderboard, and your TV display."
      crumbs={[{ label: "Leaderboard & Scoring" }]}
      actions={<EnterpriseEventPicker events={events} eventId={event?.id} onChange={selectEvent} />}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !event || !lb ? (
        <p className="text-sm text-muted-foreground">Create an event first.</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Handicaps</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Allowance — Player 1 (%)</Label>
                <Input type="number" value={lb.allowancePlayer1} onChange={(e) => set({ allowancePlayer1: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Allowance — Player 2 (%)</Label>
                <Input type="number" value={lb.allowancePlayer2} onChange={(e) => set({ allowancePlayer2: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Max course handicap</Label>
                <Input type="number" value={lb.maxCourseHandicap ?? ""} onChange={(e) => set({ maxCourseHandicap: e.target.value ? Number(e.target.value) : null })} placeholder="No cap" />
              </div>
              <div>
                <Label>Max handicap differential</Label>
                <Input type="number" value={lb.maxCourseHandicapDiff ?? ""} onChange={(e) => set({ maxCourseHandicapDiff: e.target.value ? Number(e.target.value) : null })} placeholder="No cap" />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                {toggle("Start at handicap / quota", "startAtHandicap", "Players begin at their handicap instead of even.")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Leaderboard</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {toggle("Show first and last names", "showFirstLastNames")}
              {toggle("Show flight under team name", "showFlightUnderTeam")}
              {toggle("Hide scorecards on the leaderboard", "hideScorecards")}
              {toggle("Hide dues in the scoring tab", "hideDues")}
              {toggle("Hide the leaderboard", "hideLeaderboard", "For private events.")}
              {toggle("Show total score instead of to par", "showTotalScore")}
              {toggle("Allow codeless scoring", "codelessScoring", "Players can score without a code.")}
              <div className="flex items-center gap-6 rounded-lg border border-border p-3 text-sm">
                <span className="font-medium">Visible scoring</span>
                <label className="flex items-center gap-2">
                  <Checkbox checked={lb.showGross} onCheckedChange={(v) => set({ showGross: Boolean(v) })} /> Gross
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={lb.showNet} onCheckedChange={(v) => set({ showNet: Boolean(v) })} /> Net
                </label>
              </div>
              <div>
                <Label>Sponsor image URL</Label>
                <Input value={lb.sponsorImageUrl} onChange={(e) => set({ sponsorImageUrl: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label>Rules sheet link</Label>
                <Input value={lb.rulesSheetUrl} onChange={(e) => set({ rulesSheetUrl: e.target.value })} placeholder="https://…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Monitor className="h-4 w-4 text-secondary" /> TV display</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Rotation speed</Label>
                <Slider value={[lb.tv.speed]} min={1} max={10} step={1} onValueChange={([v]) => setTv({ speed: v })} />
              </div>
              <div>
                <Label>Text size</Label>
                <Slider value={[lb.tv.size]} min={1} max={10} step={1} onValueChange={([v]) => setTv({ size: v })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Background image URL</Label>
                <Input value={lb.tv.backgroundImageUrl} onChange={(e) => setTv({ backgroundImageUrl: e.target.value })} placeholder="https://…" />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Always show leader on top <Switch checked={lb.tv.leaderOnTop} onCheckedChange={(v) => setTv({ leaderOnTop: v })} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Switch between gross and net <Switch checked={lb.tv.switchGrossNet} onCheckedChange={(v) => setTv({ switchGrossNet: v })} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Show skins <Switch checked={lb.tv.showSkins} onCheckedChange={(v) => setTv({ showSkins: v })} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Switch between flights <Switch checked={lb.tv.switchFlights} onCheckedChange={(v) => setTv({ switchFlights: v })} />
              </label>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <Input readOnly value={tvUrl} className="max-w-md text-xs" />
                <Button variant="outline" size="icon" aria-label="Copy TV link" onClick={() => { navigator.clipboard.writeText(tvUrl); toast.success("TV link copied."); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/t/${event.slug || event.id}/tv`} target="_blank">Open TV view <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card id="event-options">
            <CardHeader className="pb-3"><CardTitle className="text-base">Event options</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Show information banner <Switch checked={lb.eventOptions.showInfoBanner} onCheckedChange={(v) => setEv({ showInfoBanner: v })} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                Turn on "Take It" scoring <Switch checked={lb.eventOptions.takeItScoring} onCheckedChange={(v) => setEv({ takeItScoring: v })} />
              </label>
              <div className="sm:col-span-2">
                <Label>Banner message</Label>
                <Input value={lb.eventOptions.infoBannerText} onChange={(e) => setEv({ infoBannerText: e.target.value })} placeholder="Shown at the top of the leaderboard" />
              </div>
              <div>
                <Label>Max hole score</Label>
                <Input type="number" value={lb.eventOptions.maxHoleScore ?? ""} onChange={(e) => setEv({ maxHoleScore: e.target.value ? Number(e.target.value) : null })} placeholder="No maximum" />
              </div>
              <div>
                <Label>Best holes</Label>
                <Select value={lb.eventOptions.bestHoles} onValueChange={(v) => setEv({ bestHoles: v as "all" | "front9" | "back9" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All holes</SelectItem>
                    <SelectItem value="front9">Front 9</SelectItem>
                    <SelectItem value="back9">Back 9</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Specific holes counted</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: holes }, (_, i) => i + 1).map((h) => {
                    const on = lb.eventOptions.specificHoles.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() =>
                          setEv({
                            specificHoles: on
                              ? lb.eventOptions.specificHoles.filter((x) => x !== h)
                              : [...lb.eventOptions.specificHoles, h].sort((a, b) => a - b),
                          })
                        }
                        className={`h-9 w-9 rounded-md border text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Leave all off to count every hole.</p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={save} disabled={saving} className="bg-secondary text-primary hover:bg-secondary/90">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save settings
          </Button>
        </div>
      )}
    </EnterpriseLayout>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Copy, RotateCcw, Save, ExternalLink, Tv2 } from "lucide-react";


export interface LeaderboardDesign {
  title: string;
  show_position: boolean;
  show_player: boolean;
  show_gross: boolean;
  show_net: boolean;
  show_thru: boolean;
  default_view: "gross" | "net" | "both";
  auto_refresh_seconds: number;
  max_rows: number;
  background_color: string;
  header_background: string;
  text_color: string;
  accent_color: string;
  row_stripe: boolean;
  font_size: "small" | "medium" | "large";
  font_family: string;
  show_sponsor_banner: boolean;
  sponsor_banner_position: "top" | "bottom" | "sidebar";
  sponsor_rotation_seconds: number;
  sponsor_filter: "all" | "selected";
  show_ticker: boolean;
  ticker_text: string;
  ticker_speed: "slow" | "normal" | "fast";
  /** How multiple flights are displayed on the public leaderboard. */
  flight_display_mode: "tabs" | "grid" | "rotate";
  /** Columns used when several flight leaderboards share one screen. */
  flight_columns: number;
  /** Seconds each flight stays on screen in rotate mode. */
  flight_rotate_seconds: number;
  /** Include a combined "Overall" board alongside the flights. */
  flight_include_overall: boolean;
  /** Where the tournament title sits in the header. */
  title_align: "center" | "left" | "right";
  /** Logo shown to the left of the tournament title. */
  left_logo_url: string;
  /** Logo shown to the right of the title (replaces the trophy icon). */
  right_logo_url: string;
  /** Overrides the date shown under the leaderboard title. */
  display_date: string;
  /** Whether long fields scroll on one page or rotate page by page. */
  row_paging_mode: "scroll" | "pages";
  /** Seconds each page of names stays on screen in page-by-page mode. */
  row_page_seconds: number;
}

export const DEFAULT_DESIGN: LeaderboardDesign = {
  title: "",
  show_position: true,
  show_player: true,
  show_gross: true,
  show_net: true,
  show_thru: true,
  default_view: "both",
  auto_refresh_seconds: 10,
  max_rows: 20,
  background_color: "#1a5c38",
  header_background: "#0d3b26",
  text_color: "#FFFFFF",
  accent_color: "#F5A623",
  row_stripe: true,
  font_size: "medium",
  font_family: "Inter",
  show_sponsor_banner: true,
  sponsor_banner_position: "top",
  sponsor_rotation_seconds: 5,
  sponsor_filter: "all",
  show_ticker: false,
  ticker_text: "",
  ticker_speed: "normal",
  flight_display_mode: "tabs",
  flight_columns: 2,
  flight_rotate_seconds: 15,
  flight_include_overall: true,
  title_align: "center",
  left_logo_url: "",
  right_logo_url: "",
  display_date: "",
  row_paging_mode: "pages",
  row_page_seconds: 10,
};



const FONT_OPTIONS = ["Inter", "Roboto", "Montserrat", "Open Sans", "Lato", "Poppins"];
const FONT_SIZE_PX: Record<string, number> = { small: 14, medium: 16, large: 20 };

interface Props {
  tournamentId: string;
  tournamentSlug: string | null;
}

export default function LeaderboardDesignCard({ tournamentId, tournamentSlug }: Props) {
  const [design, setDesign] = useState<LeaderboardDesign>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("leaderboard_design")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        const d = (data as any)?.leaderboard_design;
        setDesign({ ...DEFAULT_DESIGN, ...(d || {}) });
        setLoading(false);
      });
  }, [tournamentId]);

  const update = <K extends keyof LeaderboardDesign>(k: K, v: LeaderboardDesign[K]) =>
    setDesign((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ leaderboard_design: design } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Leaderboard design saved" });
  };

  const reset = () => {
    if (!confirm("Reset all leaderboard design settings to defaults?")) return;
    setDesign(DEFAULT_DESIGN);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = tournamentSlug ? `${baseUrl}/live/${tournamentSlug}` : "";
  const tvUrl = tournamentSlug ? `${publicUrl}?display=1` : "";
  const qrUrl = tvUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(tvUrl)}`
    : "";

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast({ title: "Copied!" });
  };




  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading design settings…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tv2 className="w-5 h-5" /> Live Leaderboard Design</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DISPLAY SETTINGS */}


        {/* DISPLAY SETTINGS */}
        <section className="space-y-3 border-t pt-5">
          <Label className="text-base font-semibold">Display Settings</Label>
          <div>
            <Label className="text-xs">Leaderboard Title (optional)</Label>
            <Input value={design.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Pebble Beach Classic Leaderboard" />
          </div>
          <div>
            <Label className="text-xs">Show Columns</Label>
            <div className="flex flex-wrap gap-4 mt-1">
              <Check label="Position" checked={design.show_position} onChange={(v) => update("show_position", v)} />
              <Check label="Player / Team" checked={design.show_player} onChange={(v) => update("show_player", v)} />
              <Check label="Gross" checked={design.show_gross} onChange={(v) => update("show_gross", v)} />
              <Check label="Net" checked={design.show_net} onChange={(v) => update("show_net", v)} />
              <Check label="Thru" checked={design.show_thru} onChange={(v) => update("show_thru", v)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Default View</Label>
            <RadioGroup value={design.default_view} onValueChange={(v) => update("default_view", v as any)} className="flex flex-wrap gap-4 mt-1">
              <RadioOpt value="gross" label="Gross Only" />
              <RadioOpt value="net" label="Net Only" />
              <RadioOpt value="both" label="Both (toggle)" />
            </RadioGroup>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Auto-Refresh: {design.auto_refresh_seconds}s</Label>
              <Slider min={5} max={60} step={1} value={[design.auto_refresh_seconds]} onValueChange={([v]) => update("auto_refresh_seconds", v)} />
            </div>
            <div>
              <Label className="text-xs">Rows to Show: {design.max_rows}</Label>
              <Slider min={5} max={50} step={1} value={[design.max_rows]} onValueChange={([v]) => update("max_rows", v)} />
            </div>
          </div>
        </section>

        {/* COLOR & STYLE */}
        <section className="space-y-3 border-t pt-5">
          <Label className="text-base font-semibold">Color &amp; Style</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Color label="Background" value={design.background_color} onChange={(v) => update("background_color", v)} />
            <Color label="Header BG" value={design.header_background} onChange={(v) => update("header_background", v)} />
            <Color label="Text" value={design.text_color} onChange={(v) => update("text_color", v)} />
            <Color label="Accent" value={design.accent_color} onChange={(v) => update("accent_color", v)} />
          </div>
          <Check label="Alternate row colors (stripe)" checked={design.row_stripe} onChange={(v) => update("row_stripe", v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Font Size</Label>
              <Select value={design.font_size} onValueChange={(v) => update("font_size", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Font Family</Label>
              <Select value={design.font_family} onValueChange={(v) => update("font_family", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* SPONSOR BANNER */}
        <section className="space-y-3 border-t pt-5">
          <Label className="text-base font-semibold">Sponsor Banner</Label>
          <Check label="Show sponsor banner on leaderboard" checked={design.show_sponsor_banner} onChange={(v) => update("show_sponsor_banner", v)} />
          {design.show_sponsor_banner && (
            <>
              <div>
                <Label className="text-xs">Banner Position</Label>
                <RadioGroup value={design.sponsor_banner_position} onValueChange={(v) => update("sponsor_banner_position", v as any)} className="flex flex-wrap gap-4 mt-1">
                  <RadioOpt value="top" label="Top" />
                  <RadioOpt value="bottom" label="Bottom" />
                  <RadioOpt value="sidebar" label="Sidebar" />
                </RadioGroup>
              </div>
              <div>
                <Label className="text-xs">Rotation Speed: {design.sponsor_rotation_seconds}s between logos</Label>
                <Slider min={2} max={20} step={1} value={[design.sponsor_rotation_seconds]} onValueChange={([v]) => update("sponsor_rotation_seconds", v)} />
              </div>
              <div>
                <Label className="text-xs">Sponsor Display</Label>
                <RadioGroup value={design.sponsor_filter} onValueChange={(v) => update("sponsor_filter", v as any)} className="flex flex-wrap gap-4 mt-1">
                  <RadioOpt value="all" label="All sponsors" />
                  <RadioOpt value="selected" label="Selected only (use the ticker sponsor list below)" />
                </RadioGroup>
              </div>
            </>
          )}
        </section>

        {/* FLIGHTS / MULTIPLE LEADERBOARDS */}
        <section className="space-y-3 border-t pt-5">
          <Label className="text-base font-semibold">Flights &amp; Multiple Leaderboards</Label>
          <p className="text-xs text-muted-foreground">
            If your event has flights or divisions, choose how the public leaderboard shows them.
            Players always enter scores for their own flight only.
          </p>
          <RadioGroup
            value={design.flight_display_mode}
            onValueChange={(v) => update("flight_display_mode", v as LeaderboardDesign["flight_display_mode"])}
            className="flex flex-col gap-2 mt-1"
          >
            <RadioOpt value="tabs" label="Flight tabs — viewers pick a flight" />
            <RadioOpt value="grid" label="Multi-screen grid — all flights on one screen (big monitor / TV)" />
            <RadioOpt value="rotate" label="Auto-rotate — cycle through flights on a timer" />
          </RadioGroup>
          {design.flight_display_mode === "grid" && (
            <div>
              <Label className="text-xs">Boards per row: {design.flight_columns}</Label>
              <Slider min={1} max={4} step={1} value={[design.flight_columns]} onValueChange={([v]) => update("flight_columns", v)} />
            </div>
          )}
          {design.flight_display_mode === "rotate" && (
            <div>
              <Label className="text-xs">Seconds per flight: {design.flight_rotate_seconds}s</Label>
              <Slider min={5} max={60} step={1} value={[design.flight_rotate_seconds]} onValueChange={([v]) => update("flight_rotate_seconds", v)} />
            </div>
          )}
          <Check
            label='Include a combined "Overall" leaderboard'
            checked={design.flight_include_overall}
            onChange={(v) => update("flight_include_overall", v)}
          />
        </section>


        {/* SCROLLING TICKER */}
        <section className="space-y-3 border-t pt-5">
          <Label className="text-base font-semibold">Scrolling Ticker</Label>
          <Check label="Enable scrolling ticker" checked={design.show_ticker} onChange={(v) => update("show_ticker", v)} />
          {design.show_ticker && (
            <>
              <div>
                <Label className="text-xs">Ticker Text</Label>
                <Input value={design.ticker_text} onChange={(e) => update("ticker_text", e.target.value)} placeholder="Thank you to our sponsors!" />
              </div>
              <div>
                <Label className="text-xs">Ticker Speed</Label>
                <Select value={design.ticker_speed} onValueChange={(v) => update("ticker_speed", v as any)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </section>

        {/* TV DISPLAY MODE */}
        {tournamentSlug && (
          <section className="space-y-3 border-t pt-5">
            <Label className="text-base font-semibold">TV Display Mode (Public URL)</Label>
            <div>
              <Label className="text-xs">TV Display URL</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={tvUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={() => copy(tvUrl)}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
                <a href={tvUrl} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Open</Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Add <code>?display=1</code> for full-screen TV mode (no chrome, auto-refresh).</p>
            </div>
            {qrUrl && (
              <div className="flex items-center gap-4 flex-wrap">
                <img src={qrUrl} alt="TV display QR code" className="border rounded bg-white p-2" />
                <a href={qrUrl} download={`leaderboard-qr-${tournamentSlug}.png`} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline" size="sm">Download QR Code</Button>
                </a>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button onClick={save} disabled={saving} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
            {saving ? "Saving…" : (<><Save className="w-4 h-4 mr-1" /> Save Leaderboard Design</>)}
          </Button>
          <Button variant="ghost" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Reset to Default</Button>
        </div>
      </CardContent>
    </Card>
  );
}





function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function RadioOpt({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={`ropt-${value}`} />
      <Label htmlFor={`ropt-${value}`} className="font-normal cursor-pointer">{label}</Label>
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded border cursor-pointer bg-transparent shrink-0" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 text-xs font-mono" />
      </div>
    </div>
  );
}

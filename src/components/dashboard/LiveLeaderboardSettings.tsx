import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Settings, Trophy, Upload, Trash2, Image as ImageIcon, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { validateAndProcessLogo } from "@/lib/imageProcessing";

interface Props { tournamentId: string }

interface RotatingLogo {
  url: string;
  name?: string;
  website_url?: string;
}

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
  leaderboard_sponsor_style: string;
  leaderboard_sponsor_interval_ms: number;
  leaderboard_rotating_logos: RotatingLogo[];
  leaderboard_sponsor_banner_enabled: boolean;
  leaderboard_sponsor_rotation_order: string; // 'sequential' | 'random'
  leaderboard_sponsor_banner_position: string; // 'top' | 'bottom' | 'sidebar'
  leaderboard_sponsor_scroll_seconds: number;

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
  leaderboard_sponsor_style: "banner",
  leaderboard_sponsor_interval_ms: 5000,
  leaderboard_rotating_logos: [],
  leaderboard_sponsor_banner_enabled: true,
  leaderboard_sponsor_rotation_order: "sequential",
  leaderboard_sponsor_banner_position: "bottom",
  leaderboard_sponsor_scroll_seconds: 20,
};

const SETTINGS_COLS =
  "live_leaderboard_enabled, live_scoring_require_code, live_show_gross, live_show_net, live_default_view, live_show_sponsors, live_sponsor_placement, live_allow_edit_past_holes, live_require_confirm_save, leaderboard_sponsor_style, leaderboard_sponsor_interval_ms, leaderboard_rotating_logos, leaderboard_sponsor_banner_enabled, leaderboard_sponsor_rotation_order, leaderboard_sponsor_banner_position, leaderboard_sponsor_scroll_seconds";


export default function LiveLeaderboardSettings({ tournamentId }: Props) {
  const { org } = useOrgContext();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select(SETTINGS_COLS)
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d: any = data;
          setS({
            ...DEFAULTS,
            ...d,
            leaderboard_rotating_logos: Array.isArray(d.leaderboard_rotating_logos)
              ? d.leaderboard_rotating_logos
              : [],
          });
        }
        setLoading(false);
      });
  }, [tournamentId]);

  const persist = async (patch: Partial<Settings>) => {
    const { error } = await supabase.from("tournaments").update(patch as any).eq("id", tournamentId);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("tournaments").update(s as any).eq("id", tournamentId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const handleUpload = async (file: File) => {
    if (!org?.orgId) {
      toast({ title: "Missing organization", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const processed = await validateAndProcessLogo(file, {
        maxWidth: 600,
        maxHeight: 300,
        outputMime: file.type === "image/svg+xml" ? undefined as any : "image/png",
      });
      const ext = processed.name.split(".").pop() || "png";
      const path = `${org.orgId}/${tournamentId}/leaderboard-logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("tournament-assets").upload(path, processed, {
        upsert: true,
        contentType: processed.type,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      const newLogo: RotatingLogo = { url: urlData.publicUrl, name: file.name.replace(/\.[^.]+$/, "") };
      const updated = [...s.leaderboard_rotating_logos, newLogo];
      setS((p) => ({ ...p, leaderboard_rotating_logos: updated }));
      await persist({ leaderboard_rotating_logos: updated });
      toast({ title: "Logo uploaded", description: "Resized and optimized for the leaderboard." });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async (idx: number) => {
    const updated = s.leaderboard_rotating_logos.filter((_, i) => i !== idx);
    setS((p) => ({ ...p, leaderboard_rotating_logos: updated }));
    await persist({ leaderboard_rotating_logos: updated });
  };

  const updateLogoMeta = (idx: number, field: "name" | "website_url", value: string) => {
    setS((p) => ({
      ...p,
      leaderboard_rotating_logos: p.leaderboard_rotating_logos.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));
  };

  const moveLogo = async (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const arr = [...s.leaderboard_rotating_logos];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setS((p) => ({ ...p, leaderboard_rotating_logos: arr }));
    await persist({ leaderboard_rotating_logos: arr });
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
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

      {/* ===== Leaderboard Sponsor Display ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Leaderboard Sponsor Display</CardTitle>
          <CardDescription>
            Upload sponsor logos that rotate on the live leaderboard banner. These appear alongside any tournament sponsors marked for leaderboard display.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Row
            label="Enable rotating sponsor banner"
            desc="Master switch — turn the rotating banner on or off for this tournament."
          >
            <Switch
              checked={s.leaderboard_sponsor_banner_enabled}
              onCheckedChange={(v) => { set("leaderboard_sponsor_banner_enabled", v); persist({ leaderboard_sponsor_banner_enabled: v }); }}
            />
          </Row>

          {s.leaderboard_sponsor_banner_enabled && (
            <>
              <div>
                <Label className="text-sm mb-2 block">Display Style</Label>
                <Select value={s.leaderboard_sponsor_style} onValueChange={(v) => { set("leaderboard_sponsor_style", v); persist({ leaderboard_sponsor_style: v }); }}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Rotating Banner</SelectItem>
                    <SelectItem value="ticker">Scrolling Ticker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {s.leaderboard_sponsor_style === "banner" && (
                <>
                  <div>
                    <Label className="text-sm mb-2 block">
                      Rotation Interval: {(s.leaderboard_sponsor_interval_ms / 1000).toFixed(1)}s
                    </Label>
                    <Slider
                      value={[s.leaderboard_sponsor_interval_ms]}
                      onValueChange={([v]) => set("leaderboard_sponsor_interval_ms", v)}
                      onValueCommit={([v]) => persist({ leaderboard_sponsor_interval_ms: v })}
                      min={2000}
                      max={15000}
                      step={500}
                      className="w-64"
                    />
                    <p className="text-xs text-muted-foreground mt-1">How long each sponsor logo is shown before rotating.</p>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Rotation Order</Label>
                    <RadioGroup
                      className="flex gap-4"
                      value={s.leaderboard_sponsor_rotation_order}
                      onValueChange={(v) => { set("leaderboard_sponsor_rotation_order", v); persist({ leaderboard_sponsor_rotation_order: v }); }}
                    >
                      <div className="flex items-center space-x-2"><RadioGroupItem value="sequential" id="ro-seq" /><Label htmlFor="ro-seq">Sequential (use the order below)</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="random" id="ro-rand" /><Label htmlFor="ro-rand">Random shuffle</Label></div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </>
          )}

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm">Uploaded Sponsor Logos</Label>
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP, or SVG (max 8MB). Auto-resized to 600×300 for crisp display. Drag to reorder.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Upload Logo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            </div>

            {s.leaderboard_rotating_logos.length === 0 ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No sponsor logos uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {s.leaderboard_rotating_logos.map((logo, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) moveLogo(dragIndex, i); setDragIndex(null); }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`border rounded-lg p-3 flex gap-2 items-start bg-card transition ${dragIndex === i ? "opacity-50" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-[10px] font-semibold">#{i + 1}</span>
                    </div>
                    <div className="h-16 w-20 shrink-0 bg-muted/30 rounded flex items-center justify-center overflow-hidden">
                      <img src={logo.url} alt={logo.name || ""} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        value={logo.name || ""}
                        onChange={(e) => updateLogoMeta(i, "name", e.target.value)}
                        onBlur={() => persist({ leaderboard_rotating_logos: s.leaderboard_rotating_logos })}
                        placeholder="Sponsor name"
                        className="h-8 text-sm"
                      />
                      <Input
                        value={logo.website_url || ""}
                        onChange={(e) => updateLogoMeta(i, "website_url", e.target.value)}
                        onBlur={() => persist({ leaderboard_rotating_logos: s.leaderboard_rotating_logos })}
                        placeholder="https://sponsor.com (optional)"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeLogo(i)} className="h-8 w-8 shrink-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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

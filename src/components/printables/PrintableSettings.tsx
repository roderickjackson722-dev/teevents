import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2, Upload } from "lucide-react";
import { PRINTABLE_FONTS, PRINTABLE_LAYOUTS } from "./types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PrintableOptions {
  font: string;
  layout: string;
  showLogo: boolean;
  showTournamentTitle: boolean;
  showStartingHole: boolean;
  showCourseName: boolean;
}

interface Props {
  options: PrintableOptions;
  onChange: (options: PrintableOptions) => void;
  showCourseName?: boolean; // whether to show the course name toggle (scorecards only)
  tournamentId?: string;
  logoUrl?: string | null;
  onLogoChange?: (url: string) => void;
  /** Which printable the preview should represent */
  variant?: "scorecard" | "cartsign";
}

export function getDefaultOptions(tournament: { printable_font?: string | null; printable_layout?: string | null } | null): PrintableOptions {
  return {
    font: tournament?.printable_font || "georgia",
    layout: tournament?.printable_layout || "classic",
    showLogo: true,
    showTournamentTitle: true,
    showStartingHole: true,
    showCourseName: true,
  };
}

export default function PrintableSettings({ options, onChange, showCourseName = false, tournamentId, logoUrl, onLogoChange, variant = "scorecard" }: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!tournamentId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tournamentId}/printable-logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      await supabase.from("tournaments").update({ printable_logo_url: data.publicUrl }).eq("id", tournamentId);
      onLogoChange?.(data.publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const update = (partial: Partial<PrintableOptions>) => {
    onChange({ ...options, ...partial });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 mb-2">
          <Settings2 className="h-4 w-4" />
          {open ? "Hide" : "Customize"} Design
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Font */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Font</Label>
              <Select value={options.font} onValueChange={(v) => update({ font: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINTABLE_FONTS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span style={{ fontFamily: f.preview }}>{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layout */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Layout Style</Label>
              <Select value={options.layout} onValueChange={(v) => update({ layout: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINTABLE_LAYOUTS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} — {l.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={options.showLogo} onCheckedChange={(v) => update({ showLogo: v })} id="toggle-logo" />
              <Label htmlFor="toggle-logo" className="text-xs cursor-pointer">Logo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={options.showTournamentTitle} onCheckedChange={(v) => update({ showTournamentTitle: v })} id="toggle-title" />
              <Label htmlFor="toggle-title" className="text-xs cursor-pointer">Tournament Title</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={options.showStartingHole} onCheckedChange={(v) => update({ showStartingHole: v })} id="toggle-hole" />
              <Label htmlFor="toggle-hole" className="text-xs cursor-pointer">Starting Hole</Label>
            </div>
            {showCourseName && (
              <div className="flex items-center gap-2">
                <Switch checked={options.showCourseName} onCheckedChange={(v) => update({ showCourseName: v })} id="toggle-course" />
                <Label htmlFor="toggle-course" className="text-xs cursor-pointer">Course Name</Label>
              </div>
            )}
          </div>

          {/* Logo upload */}
          {options.showLogo && tournamentId && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-medium">Printable Logo</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain border rounded bg-white" />
                ) : (
                  <div className="h-12 w-12 border border-dashed rounded flex items-center justify-center text-muted-foreground">
                    <Upload className="h-4 w-4" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Appears on scorecards, cart signs, and other printables.</p>
            </div>
          )}

          {/* Live Preview */}
          {variant === "cartsign" ? (
            <CartSignMiniPreview options={options} logoUrl={logoUrl} />
          ) : (
            <ScorecardMiniPreview options={options} showCourseName={showCourseName} logoUrl={logoUrl} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Live mini-preview that updates as font/layout/toggles change. */
function ScorecardMiniPreview({ options, showCourseName, logoUrl }: { options: PrintableOptions; showCourseName: boolean; logoUrl?: string | null }) {
  const fontMap: Record<string, string> = {
    georgia: "'Georgia', serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    playfair: "'Playfair Display', Georgia, serif",
    roboto: "'Roboto', 'Helvetica Neue', sans-serif",
    courier: "'Courier New', Courier, monospace",
  };
  const font = fontMap[options.font] || fontMap.georgia;
  const layout = options.layout;
  const accent = "hsl(var(--primary))";

  const borderStyle =
    layout === "bold" ? `3px solid ${accent}` : layout === "modern" ? `1px solid hsl(var(--border))` : `2px solid ${accent}`;
  const headerBg = layout === "bold" ? accent : "transparent";
  const headerColor = layout === "bold" ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <Label className="text-xs font-medium text-muted-foreground">Live Preview</Label>
      <div
        className="rounded-md overflow-hidden bg-card max-w-2xl"
        style={{ border: borderStyle, fontFamily: font }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: headerBg, color: headerColor }}
        >
          <div>
            {options.showTournamentTitle && (
              <div className="text-[9px] font-semibold tracking-widest uppercase opacity-70">
                Spring Charity Classic
              </div>
            )}
            <div className="text-sm font-bold">John Smith</div>
            {showCourseName && options.showCourseName && (
              <div className="text-[10px] opacity-70">Pebble Hills CC • Blue Tees • Par 72 • 18 Holes</div>
            )}
          </div>
          {options.showLogo && (
            logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 max-w-[80px] object-contain bg-white rounded p-0.5" />
            ) : (
              <div
                className="text-[9px] font-bold border px-1.5 py-0.5 rounded"
                style={{ borderColor: layout === "bold" ? "hsl(var(--primary-foreground))" : accent, color: layout === "bold" ? "hsl(var(--primary-foreground))" : accent }}
              >
                LOGO
              </div>
            )
          )}
        </div>
        <div className="p-2 space-y-1.5">
          {([
            { holes: [1, 2, 3, 4, 5, 6, 7, 8, 9], pars: [4, 4, 3, 5, 4, 4, 3, 5, 4], label: "OUT", total: 36 },
            { holes: [10, 11, 12, 13, 14, 15, 16, 17, 18], pars: [4, 3, 4, 5, 4, 4, 3, 5, 4], label: "IN", total: 36 },
          ]).map((nine) => (
            <table key={nine.label} className="w-full border-collapse text-[9px] table-fixed">
              <tbody>
                <tr className="bg-muted/50">
                  <td className="border border-border px-1 py-0.5 font-bold w-14">Hole</td>
                  {nine.holes.map((h) => (
                    <td key={h} className="border border-border px-0.5 py-0.5 text-center font-semibold">{h}</td>
                  ))}
                  <td className="border border-border px-0.5 py-0.5 text-center font-bold bg-muted">{nine.label}</td>
                </tr>
                <tr>
                  <td className="border border-border px-1 py-0.5 font-semibold text-muted-foreground">Par</td>
                  {nine.pars.map((p, i) => (
                    <td key={i} className="border border-border px-0.5 py-0.5 text-center text-muted-foreground">{p}</td>
                  ))}
                  <td className="border border-border px-0.5 py-0.5 text-center font-semibold">{nine.total}</td>
                </tr>
                <tr>
                  <td className="border border-border px-1 py-1.5 font-semibold" style={{ color: accent }}>Score</td>
                  {nine.holes.map((h) => (
                    <td key={h} className="border border-border px-0.5 py-1.5">&nbsp;</td>
                  ))}
                  <td className="border border-border px-0.5 py-1.5">&nbsp;</td>
                </tr>
              </tbody>
            </table>
          ))}
          <div className="flex items-center justify-between text-[10px]" style={{ color: accent }}>
            <span>Total Par 72 &bull; 18 Holes</span>
            {options.showStartingHole && <span>Starting Hole: 4</span>}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Updates instantly as you change font, layout, or toggles.</p>
    </div>
  );
}

/** Live mini-preview of a cart sign (two players per cart, stacked names). */
function CartSignMiniPreview({ options, logoUrl }: { options: PrintableOptions; logoUrl?: string | null }) {
  const fontMap: Record<string, string> = {
    georgia: "'Georgia', serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    playfair: "'Playfair Display', Georgia, serif",
    roboto: "'Roboto', 'Helvetica Neue', sans-serif",
    courier: "'Courier New', Courier, monospace",
  };
  const font = fontMap[options.font] || fontMap.georgia;
  const layout = options.layout;
  const accent = "hsl(var(--primary))";
  const isBold = layout === "bold";
  const borderStyle = isBold ? `3px solid ${accent}` : layout === "modern" ? `1px solid hsl(var(--border))` : `2px solid ${accent}`;

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <Label className="text-xs font-medium text-muted-foreground">Live Preview</Label>
      <div
        className="rounded-md overflow-hidden max-w-md flex flex-col items-center justify-center text-center gap-1.5 px-4 py-5"
        style={{
          border: borderStyle,
          fontFamily: font,
          background: isBold ? accent : "hsl(var(--card))",
          color: isBold ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
        }}
      >
        {options.showLogo && (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 max-w-[100px] object-contain bg-white rounded p-0.5" />
          ) : (
            <div className="text-[9px] font-bold border px-1.5 py-0.5 rounded" style={{ borderColor: "currentColor" }}>LOGO</div>
          )
        )}
        {options.showTournamentTitle && (
          <div className="text-[9px] font-semibold tracking-widest uppercase opacity-70">Spring Charity Classic</div>
        )}
        <div className="text-lg font-bold leading-tight">John Smith</div>
        <div className="text-lg font-bold leading-tight">Mike Davis</div>
        {options.showStartingHole && (
          <div className="text-[11px] font-semibold" style={{ color: isBold ? "currentColor" : accent }}>Starting Hole: 4</div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">Updates instantly as you change font, layout, or toggles.</p>
    </div>
  );
}

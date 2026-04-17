import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { PRINTABLE_FONTS, PRINTABLE_LAYOUTS } from "./types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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

export default function PrintableSettings({ options, onChange, showCourseName = false }: Props) {
  const [open, setOpen] = useState(false);

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

          {/* Live Preview */}
          <ScorecardMiniPreview options={options} showCourseName={showCourseName} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Live mini-preview that updates as font/layout/toggles change. */
function ScorecardMiniPreview({ options, showCourseName }: { options: PrintableOptions; showCourseName: boolean }) {
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
        className="rounded-md overflow-hidden bg-card max-w-md"
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
            <div
              className="text-[9px] font-bold border px-1.5 py-0.5 rounded"
              style={{ borderColor: layout === "bold" ? "hsl(var(--primary-foreground))" : accent, color: layout === "bold" ? "hsl(var(--primary-foreground))" : accent }}
            >
              LOGO
            </div>
          )}
        </div>
        <div className="p-2">
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              <tr className="bg-muted/50">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => (
                  <td key={h} className="border border-border px-1 py-0.5 text-center font-semibold">{h}</td>
                ))}
                <td className="border border-border px-1 py-0.5 text-center font-bold bg-muted">OUT</td>
              </tr>
              <tr>
                {[4, 4, 3, 5, 4, 4, 3, 5, 4].map((p, i) => (
                  <td key={i} className="border border-border px-1 py-0.5 text-center text-muted-foreground">{p}</td>
                ))}
                <td className="border border-border px-1 py-0.5 text-center font-semibold">36</td>
              </tr>
              <tr>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => (
                  <td key={h} className="border border-border px-1 py-2">&nbsp;</td>
                ))}
                <td className="border border-border px-1 py-2">&nbsp;</td>
              </tr>
            </tbody>
          </table>
          {options.showStartingHole && (
            <div className="text-[10px] mt-1.5" style={{ color: accent }}>Starting Hole: 4</div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Updates instantly as you change font, layout, or toggles.</p>
    </div>
  );
}

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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings2, Save, Loader2, QrCode, Users } from "lucide-react";
import type { PrintableAddon } from "./QRCodesTab";
import type { PrintablesDataSource } from "./rosterSource";

export interface PrintableOptions {
  show_scoring_codes_alpha: boolean;
  show_scoring_codes_holes: boolean;
  qr_walkup: boolean;
  qr_donation: boolean;
  qr_addon_ids: string[];
  data_source: PrintablesDataSource;
}

export const DEFAULT_PRINTABLE_OPTIONS: PrintableOptions = {
  show_scoring_codes_alpha: true,
  show_scoring_codes_holes: true,
  qr_walkup: false,
  qr_donation: false,
  qr_addon_ids: [],
  data_source: "roster",
};


interface Props {
  options: PrintableOptions;
  addons: PrintableAddon[];
  saving: boolean;
  dirty: boolean;
  onChange: (next: PrintableOptions) => void;
  onSave: () => void;
}

export default function PrintablesOptionsCard({ options, addons, saving, dirty, onChange, onSave }: Props) {
  const set = <K extends keyof PrintableOptions>(key: K, value: PrintableOptions[K]) =>
    onChange({ ...options, [key]: value });

  const toggleAddon = (id: string, on: boolean) =>
    set("qr_addon_ids", on ? [...options.qr_addon_ids, id] : options.qr_addon_ids.filter((x) => x !== id));

  return (
    <div className="bg-card rounded-lg border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" /> Printables Options
        </h3>
        <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save Printables Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scoring Codes</p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="opt-alpha" className="text-sm cursor-pointer">Show scoring codes on Alpha List</Label>
            <Switch id="opt-alpha" checked={options.show_scoring_codes_alpha} onCheckedChange={(v) => set("show_scoring_codes_alpha", v)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="opt-holes" className="text-sm cursor-pointer">Show scoring codes on Hole Assignments</Label>
            <Switch id="opt-holes" checked={options.show_scoring_codes_holes} onCheckedChange={(v) => set("show_scoring_codes_holes", v)} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <QrCode className="h-3.5 w-3.5" /> QR Codes
          </p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="opt-walkup" className="text-sm cursor-pointer">Walk-up Registration QR</Label>
            <Switch id="opt-walkup" checked={options.qr_walkup} onCheckedChange={(v) => set("qr_walkup", v)} />
          </div>
          {addons.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No add-ons yet — create them in Registration Management → Add-Ons.
            </p>
          ) : (
            addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <Label htmlFor={`opt-addon-${a.id}`} className="text-sm cursor-pointer truncate">
                  {a.name} QR
                </Label>
                <Switch
                  id={`opt-addon-${a.id}`}
                  checked={options.qr_addon_ids.includes(a.id)}
                  onCheckedChange={(v) => toggleAddon(a.id, v)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

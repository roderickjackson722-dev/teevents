import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, RotateCcw, Undo2 } from "lucide-react";
import { STYLE_GROUPS, cleanOverrides, type StyleAreaKey, type StyleOverrides } from "@/lib/siteStyleOverrides";

interface Props {
  overrides: unknown;
  onChange: (next: StyleOverrides) => void;
  canUndo: boolean;
  undoLabel?: string;
  onUndo: () => void;
  canReset: boolean;
  onReset: () => void;
}

/** Color pickers for every visible area of the public page, plus Undo / Reset. */
export function PageColorControls({ overrides, onChange, canUndo, undoLabel, onUndo, canReset, onReset }: Props) {
  const values = cleanOverrides(overrides);
  const [open, setOpen] = useState<string | null>(STYLE_GROUPS[0].title);

  const set = (key: StyleAreaKey, value: string | null) => {
    const next = { ...values };
    if (value) next[key] = value; else delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">Undo and Reset</h3>
        <p className="text-xs text-muted-foreground mt-1">
          To change words, colors, fonts or images on a specific part of your page, use Edit Live Page at the top and click that spot.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!canUndo} onClick={onUndo}>
          <Undo2 className="h-3.5 w-3.5 mr-1.5" /> Undo Design
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!canReset} onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to Original Design
        </Button>
      </div>
      {undoLabel && <p className="text-[11px] text-muted-foreground">{undoLabel}</p>}

    </div>
  );
}

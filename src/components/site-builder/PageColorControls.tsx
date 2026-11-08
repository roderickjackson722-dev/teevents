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
        <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">Colors for Each Part of the Page</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Change the color of any area on your public page. Leave an area on "Theme" to keep your main colors. Save to apply.
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

      <div className="rounded-md border border-border divide-y divide-border">
        {STYLE_GROUPS.map((g) => {
          const isOpen = open === g.title;
          const count = g.areas.filter((a) => values[a.key]).length;
          return (
            <div key={g.title}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40"
              >
                <span className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {g.title}
                </span>
                {count > 0 && <span className="text-[11px] text-muted-foreground">{count} changed</span>}
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pb-3">
                  {g.areas.map((a) => {
                    const v = values[a.key];
                    return (
                      <div key={a.key}>
                        <Label className="text-xs">{a.label}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            aria-label={a.label}
                            value={v || "#ffffff"}
                            onChange={(e) => set(a.key, e.target.value)}
                            className="w-9 h-9 rounded border border-border cursor-pointer shrink-0"
                          />
                          <Input
                            value={v || ""}
                            placeholder="Theme"
                            onChange={(e) => {
                              const t = e.target.value.trim();
                              if (!t) set(a.key, null);
                              else if (/^#[0-9a-f]{6}$/i.test(t)) set(a.key, t);
                            }}
                            className="h-9 text-xs"
                          />
                          {v && (
                            <button type="button" onClick={() => set(a.key, null)} className="text-[11px] text-muted-foreground underline shrink-0">
                              Theme
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

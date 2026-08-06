import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface SelectableCard {
  key: string;
  label: string;
  hole: number | null;
}

interface Props {
  items: SelectableCard[];
  selected: string[];
  onChange: (keys: string[]) => void;
  title?: string;
}

/**
 * Checkbox list + hole shortcuts so organizers can print only specific
 * scorecards (e.g. late additions) instead of the whole field.
 */
export default function ScorecardSelector({ items, selected, onChange, title = "Print Scorecards" }: Props) {
  const allSelected = items.length > 0 && selected.length === items.length;
  const holes = Array.from(new Set(items.map((i) => i.hole).filter((h): h is number => h != null))).sort((a, b) => a - b);
  const selectedSet = new Set(selected);

  const toggle = (key: string) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(items.filter((i) => next.has(i.key)).map((i) => i.key));
  };

  const holeFullySelected = (hole: number) => {
    const keys = items.filter((i) => i.hole === hole).map((i) => i.key);
    return keys.length > 0 && keys.every((k) => selectedSet.has(k));
  };

  const toggleHole = (hole: number) => {
    const keys = items.filter((i) => i.hole === hole).map((i) => i.key);
    const next = new Set(selectedSet);
    if (holeFullySelected(hole)) keys.forEach((k) => next.delete(k));
    else keys.forEach((k) => next.add(k));
    onChange(items.filter((i) => next.has(i.key)).map((i) => i.key));
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span className="text-xs text-muted-foreground">{selected.length} of {items.length} selected</span>
      </div>

      <div className="p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => onChange(v ? items.map((i) => i.key) : [])}
          />
          Select All
        </label>

        <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {items.map((item) => (
            <label key={item.key} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted/40">
              <Checkbox checked={selectedSet.has(item.key)} onCheckedChange={() => toggle(item.key)} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        {holes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Or select by hole:</p>
            <div className="flex flex-wrap gap-1.5">
              {holes.map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant={holeFullySelected(h) ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => toggleHole(h)}
                >
                  Hole {h}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

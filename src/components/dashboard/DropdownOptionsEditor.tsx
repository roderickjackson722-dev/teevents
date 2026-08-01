import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface Props {
  options: string[];
  onChange: (options: string[]) => void;
}

export default function DropdownOptionsEditor({ options, onChange }: Props) {
  const list = options.length ? options : [""];

  const update = (index: number, value: string) => {
    const next = [...list];
    next[index] = value;
    onChange(next);
  };

  const remove = (index: number) => {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Dropdown options</p>
      {list.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            maxLength={100}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-destructive shrink-0"
            title="Remove option"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, ""])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add option
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Add as many options as you need — players pick one from this list.
      </p>
    </div>
  );
}

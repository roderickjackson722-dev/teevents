import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  tournamentId: string;
  field: "auction_tab_title" | "raffle_tab_title";
  defaultValue: string;
  label: string;
}

export function TabTitleInput({ tournamentId, field, defaultValue, label }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(field)
        .eq("id", tournamentId)
        .maybeSingle();
      if (mounted && data) setValue(((data as any)[field] ?? defaultValue) || defaultValue);
    })();
    return () => { mounted = false; };
  }, [tournamentId, field, defaultValue]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ [field]: value.trim() || defaultValue } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label className="text-xs">{label}</Label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-[260px]" />
      </div>
      <Button size="sm" variant="outline" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const FLAGS: { key: string; label: string; description: string }[] = [
  { key: "enable_group_trips", label: "Group Trips Module", description: "Show the Group Trips section in main navigation for authenticated users." },
];

export default function AdminFeatureFlags() {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("platform_settings").select("key, value").in("key", FLAGS.map((f) => f.key));
    const map: Record<string, boolean> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value === true; });
    setValues(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (key: string, on: boolean) => {
    setValues((v) => ({ ...v, [key]: on }));
    const { error } = await supabase.from("platform_settings").upsert({ key, value: on as any }, { onConflict: "key" });
    if (error) { toast.error(error.message); load(); return; }
    toast.success(`${on ? "Enabled" : "Disabled"}`);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Feature Flags</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : FLAGS.map((f) => (
          <div key={f.key} className="flex items-start justify-between gap-4 border-b last:border-0 pb-3 last:pb-0">
            <div>
              <Label className="text-sm font-medium">{f.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
            </div>
            <Switch checked={!!values[f.key]} onCheckedChange={(v) => toggle(f.key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

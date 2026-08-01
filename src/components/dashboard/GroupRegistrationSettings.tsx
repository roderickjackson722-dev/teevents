import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Users } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_GROUP_FIELD_RULES,
  GROUP_FIELD_KEYS,
  GROUP_FIELD_LABELS,
  parseGroupFieldRules,
  type FieldMode,
  type GroupFieldKey,
  type GroupFieldRules,
} from "@/lib/groupFieldRules";

const nextMode = (mode: FieldMode, locked: boolean): FieldMode => {
  if (locked) return "required";
  return mode === "hidden" ? "optional" : mode === "optional" ? "required" : "hidden";
};

const modeBadge = (mode: FieldMode) =>
  mode === "required" ? "Required" : mode === "optional" ? "Optional" : "Hidden";

function RoleFieldList({
  title,
  description,
  rules,
  onChange,
}: {
  title: string;
  description: string;
  rules: Record<GroupFieldKey, FieldMode>;
  onChange: (key: GroupFieldKey, mode: FieldMode) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-border divide-y divide-border">
        {GROUP_FIELD_KEYS.map((key) => {
          const locked = key === "full_name";
          const mode = rules[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox
                  checked={mode !== "hidden"}
                  disabled={locked}
                  onCheckedChange={(v) => onChange(key, v ? "optional" : "hidden")}
                />
                <span className={mode === "hidden" ? "text-muted-foreground" : "text-foreground"}>
                  {GROUP_FIELD_LABELS[key]}
                </span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={locked}
                onClick={() => onChange(key, nextMode(mode, locked))}
                title={locked ? "Names are always required" : "Click to change"}
              >
                <Badge
                  variant={mode === "required" ? "default" : mode === "optional" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {modeBadge(mode)}
                </Badge>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GroupRegistrationSettings({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<GroupFieldRules>(DEFAULT_GROUP_FIELD_RULES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("group_field_rules")
        .eq("id", tournamentId)
        .maybeSingle();
      if (!cancelled) {
        setRules(parseGroupFieldRules(data?.group_field_rules));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const setMode = (role: "captain" | "member", key: GroupFieldKey, mode: FieldMode) => {
    setRules((prev) => ({ ...prev, [role]: { ...prev[role], [key]: mode } }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("tournaments")
      .update({ group_field_rules: rules })
      .eq("id", tournamentId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Group registration settings saved");
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">Group Registration Settings</h3>
          <p className="text-xs text-muted-foreground">
            Collect full contact details from the team captain only — teammates just give their names.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <Switch
              checked={rules.enabled}
              onCheckedChange={(v) => setRules((prev) => ({ ...prev, enabled: v }))}
            />
            <div className="flex-1">
              <Label className="text-sm font-semibold cursor-pointer block">
                Enable captain-only contact details for group registrations
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Applies to foursomes, threesomes and twosomes on your public registration form.
              </p>
            </div>
          </div>

          {rules.enabled && (
            <div className="space-y-5 border-t border-border pt-5">
              <RoleFieldList
                title="Captain / Team Lead Fields"
                description="The primary contact for the team. Click a badge to switch between Required, Optional and Hidden."
                rules={rules.captain}
                onChange={(k, m) => setMode("captain", k, m)}
              />
              <RoleFieldList
                title="Other Players (Team Members)"
                description="Hidden fields are not shown at all for teammates."
                rules={rules.member}
                onChange={(k, m) => setMode("member", k, m)}
              />
            </div>
          )}

          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </>
      )}
    </div>
  );
}

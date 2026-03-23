import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ALL_FEATURES } from "@/hooks/usePlanFeatures";
import { Save, Loader2, ToggleLeft, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminFeatureTogglesProps {
  organizationId: string;
  orgName: string;
  currentPlan: string;
  currentOverrides: Record<string, boolean> | null;
  currentFeeOverride: number | null;
  callAdminApi: (action: string, body: Record<string, unknown>) => Promise<any>;
  onRefresh: () => Promise<void>;
}

// Plan default features for reference
const PLAN_FEATURES: Record<string, string[]> = {
  base: [
    "tournaments", "registration", "website", "players", "check-in",
    "leaderboard", "planning-guide", "email-messaging", "custom-domain",
    "sponsors", "budget", "gallery", "printables", "volunteers",
  ],
  starter: ["donations", "sms-messaging", "all-templates"],
  premium: ["store", "auction", "surveys", "priority-support", "hole-in-one-insurance"],
};

const PLAN_HIERARCHY = ["base", "starter", "premium"];

function planIncludesFeature(plan: string, feature: string): boolean {
  const idx = PLAN_HIERARCHY.indexOf(plan);
  for (let i = 0; i <= idx; i++) {
    if (PLAN_FEATURES[PLAN_HIERARCHY[i]]?.includes(feature)) return true;
  }
  return false;
}

export default function AdminFeatureToggles({
  organizationId,
  orgName,
  currentPlan,
  currentOverrides,
  currentFeeOverride,
  callAdminApi,
  onRefresh,
}: AdminFeatureTogglesProps) {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<Record<string, boolean>>(currentOverrides || {});
  const [feeOverride, setFeeOverride] = useState<string>(
    currentFeeOverride != null ? String(currentFeeOverride) : ""
  );
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [savingFee, setSavingFee] = useState(false);

  const handleToggle = (featureId: string, checked: boolean) => {
    const planDefault = planIncludesFeature(currentPlan, featureId);
    setOverrides(prev => {
      const next = { ...prev };
      // If toggling back to plan default, remove the override
      if (checked === planDefault) {
        delete next[featureId];
      } else {
        next[featureId] = checked;
      }
      return next;
    });
  };

  const isFeatureEnabled = (featureId: string): boolean => {
    if (featureId in overrides) return overrides[featureId];
    return planIncludesFeature(currentPlan, featureId);
  };

  const hasOverride = (featureId: string): boolean => {
    return featureId in overrides;
  };

  const saveFeatures = async () => {
    setSavingFeatures(true);
    try {
      await callAdminApi("update-org-feature-overrides", {
        organization_id: organizationId,
        feature_overrides: Object.keys(overrides).length > 0 ? overrides : null,
      });
      toast({ title: "Feature overrides saved!" });
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingFeatures(false);
  };

  const saveFee = async () => {
    setSavingFee(true);
    try {
      const val = feeOverride.trim() === "" ? null : parseFloat(feeOverride);
      if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
        toast({ title: "Invalid fee", description: "Enter 0-100 or leave blank for plan default", variant: "destructive" });
        setSavingFee(false);
        return;
      }
      await callAdminApi("update-org-fee-override", {
        organization_id: organizationId,
        fee_override: val,
      });
      toast({ title: "Fee override saved!" });
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingFee(false);
  };

  const planDefaultFee = 0;
  const hasFeatureChanges = JSON.stringify(overrides) !== JSON.stringify(currentOverrides || {});
  const hasFeeChanges = (feeOverride.trim() === "" ? null : parseFloat(feeOverride)) !== currentFeeOverride;

  return (
    <div className="space-y-6 mt-4 pt-4 border-t border-border">
      {/* Fee Override */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Percent className="h-4 w-4 text-secondary" />
          <h4 className="font-semibold text-sm">Platform Fee Override</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Plan default: <span className="font-semibold">{planDefaultFee}%</span>. 
          Set a custom fee or leave blank to use the plan default.
        </p>
        <div className="flex items-center gap-2 max-w-xs">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder={`${planDefaultFee}% (plan default)`}
            value={feeOverride}
            onChange={e => setFeeOverride(e.target.value)}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button size="sm" onClick={saveFee} disabled={savingFee || !hasFeeChanges}>
            {savingFee ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Feature Toggles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Feature Overrides</h4>
          </div>
          <Button size="sm" onClick={saveFeatures} disabled={savingFeatures || !hasFeatureChanges}>
            {savingFeatures ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save Features
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Toggle features on/off for <span className="font-semibold">{orgName}</span>. 
          Highlighted toggles override the <span className="capitalize font-semibold">{currentPlan}</span> plan defaults.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_FEATURES.map(f => {
            const enabled = isFeatureEnabled(f.id);
            const overridden = hasOverride(f.id);
            const planDefault = planIncludesFeature(currentPlan, f.id);
            return (
              <div
                key={f.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-md border text-sm transition-colors ${
                  overridden
                    ? "border-secondary/50 bg-secondary/5"
                    : "border-border"
                }`}
              >
                <Label className="text-xs cursor-pointer flex-1 min-w-0 truncate" htmlFor={`toggle-${f.id}`}>
                  {f.label}
                  {overridden && (
                    <span className="ml-1 text-[10px] text-secondary font-semibold">OVERRIDE</span>
                  )}
                </Label>
                <Switch
                  id={`toggle-${f.id}`}
                  checked={enabled}
                  onCheckedChange={checked => handleToggle(f.id, checked)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

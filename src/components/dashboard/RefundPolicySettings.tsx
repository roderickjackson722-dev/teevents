import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface RefundPolicySettingsProps {
  tournamentId: string;
  demoGuard: () => boolean;
}

const POLICY_TEMPLATES: Record<string, { label: string; text: string; deadlineDays: number | null; partialPercent: number | null }> = {
  full_before_deadline: {
    label: "Full refund before deadline",
    text: "Full refunds are available up to {days} days before the event. No refunds will be issued after this deadline.",
    deadlineDays: 14,
    partialPercent: null,
  },
  partial_after_deadline: {
    label: "Full before deadline, partial after",
    text: "Full refunds are available up to {days} days before the event. After the deadline, a {percent}% refund will be issued. No refunds on the day of the event.",
    deadlineDays: 14,
    partialPercent: 50,
  },
  no_refunds: {
    label: "No refunds",
    text: "All registration fees are non-refundable. By registering, you acknowledge and agree to this policy.",
    deadlineDays: null,
    partialPercent: null,
  },
  custom: {
    label: "Custom policy",
    text: "",
    deadlineDays: null,
    partialPercent: null,
  },
};

export default function RefundPolicySettings({ tournamentId, demoGuard }: RefundPolicySettingsProps) {
  const [policyType, setPolicyType] = useState("custom");
  const [policyText, setPolicyText] = useState("");
  const [deadlineDays, setDeadlineDays] = useState<string>("");
  const [partialPercent, setPartialPercent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    supabase
      .from("tournaments")
      .select("refund_policy_type, refund_policy_text, refund_deadline_days, refund_partial_percent")
      .eq("id", tournamentId)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setPolicyType(d.refund_policy_type || "custom");
          setPolicyText(d.refund_policy_text || "");
          setDeadlineDays(d.refund_deadline_days != null ? String(d.refund_deadline_days) : "");
          setPartialPercent(d.refund_partial_percent != null ? String(d.refund_partial_percent) : "");
        }
        setLoaded(true);
      });
  }, [tournamentId]);

  const handlePolicyTypeChange = (type: string) => {
    setPolicyType(type);
    const template = POLICY_TEMPLATES[type];
    if (template && type !== "custom") {
      let text = template.text;
      if (template.deadlineDays != null) {
        setDeadlineDays(String(template.deadlineDays));
        text = text.replace("{days}", String(template.deadlineDays));
      }
      if (template.partialPercent != null) {
        setPartialPercent(String(template.partialPercent));
        text = text.replace("{percent}", String(template.partialPercent));
      }
      setPolicyText(text);
    }
  };

  const save = async () => {
    if (demoGuard()) return;
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        refund_policy_type: policyType,
        refund_policy_text: policyText || null,
        refund_deadline_days: deadlineDays ? parseInt(deadlineDays) : null,
        refund_partial_percent: partialPercent ? parseInt(partialPercent) : null,
      } as any)
      .eq("id", tournamentId);
    if (error) toast.error(error.message);
    else toast.success("Refund policy saved!");
    setSaving(false);
  };

  if (!loaded) return null;

  const hasPolicy = policyText.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-bold text-foreground">Refund Policy</h2>
      </div>

      {!hasPolicy && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
          <AlertTriangle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">No refund policy set.</strong> We recommend adding a refund policy before opening registration. It will be displayed on your tournament registration page.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Policy Template</Label>
          <Select value={policyType} onValueChange={handlePolicyTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(POLICY_TEMPLATES).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(policyType === "full_before_deadline" || policyType === "partial_after_deadline") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Refund Deadline (days before event)</Label>
              <Input
                type="number"
                min="1"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
                placeholder="14"
              />
            </div>
            {policyType === "partial_after_deadline" && (
              <div>
                <Label>Partial Refund (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={partialPercent}
                  onChange={(e) => setPartialPercent(e.target.value)}
                  placeholder="50"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Policy Text (shown to registrants)</Label>
          <Textarea
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            placeholder="Enter your refund policy..."
            rows={4}
          />
        </div>

        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Refund Policy
        </Button>
      </div>
    </div>
  );
}

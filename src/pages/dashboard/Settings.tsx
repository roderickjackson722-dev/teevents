import { useState, useEffect } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  Building2,
  ArrowRight,
  Zap,
  Trophy,
  Save,
  Receipt,
  ShieldCheck,
  CloudRain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NonprofitSettings } from "@/components/settings/NonprofitSettings";

const REFUND_POLICY_PRESETS: { id: string; label: string; text: string }[] = [
  { id: "no_refunds", label: "No Refunds", text: "No refunds will be issued for this event, except in cases of full event cancellation." },
  { id: "full_30_days", label: "Full refund up to 30 days before event (recommended)", text: "Full refund requests accepted up to 30 days before the event start date. No refunds after that date, except in cases of full event cancellation or major postponement." },
  { id: "full_14_days", label: "Full refund up to 14 days before event", text: "Full refund requests accepted up to 14 days before the event start date. No refunds after that date." },
  { id: "full_7_days", label: "Full refund up to 7 days before event", text: "Full refund requests accepted up to 7 days before the event start date. No refunds after that date." },
  { id: "tiered_30", label: "Tiered: 100% (30+ days), 50% (15-30 days), none (<14 days)", text: "100% refund if cancelled 30+ days before the event. 50% refund between 15-30 days before the event. No refunds within 14 days of the event, except in cases of full cancellation." },
  { id: "tiered_14", label: "Tiered: 100% (14+ days), 50% (7-14 days), none (<7 days)", text: "100% refund if cancelled 14+ days before the event. 50% refund between 7-14 days before the event. No refunds within 7 days of the event." },
  { id: "custom", label: "Custom policy", text: "" },
];

const RAIN_POLICY_PRESETS: { id: string; label: string; text: string }[] = [
  { id: "auto_transfer", label: "Automatic transfer to rain date (no refund)", text: "In case of rain or weather postponement, registrations will automatically transfer to the new rain date. If no rain date is possible, full refunds will be issued." },
  { id: "full_refund", label: "Full refund if no suitable rain date offered", text: "If the event is postponed due to weather and no suitable rain date is offered within 30 days, full refunds will be issued to all registrants." },
  { id: "organizer_discretion", label: "Full refund or transfer at organizer discretion", text: "In case of weather postponement, the organizer will decide whether to transfer registrations to a new date or issue full refunds. Participants will be notified promptly." },
  { id: "no_policy", label: "No automatic rain date policy (custom handling)", text: "No automatic rain date policy. In case of weather postponement, the organizer will communicate next steps directly." },
  { id: "custom", label: "Custom rain date policy", text: "" },
];

interface TournamentSettings {
  id: string;
  title: string;
  scoring_format: string;
  pass_fees_to_participants: boolean;
  refund_policy_type: string;
  refund_policy: string;
  rain_date_policy_type: string;
  rain_date_policy: string;
}

const Settings = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<TournamentSettings[]>([]);
  const [formatEdits, setFormatEdits] = useState<Record<string, string>>({});
  const [savingFormat, setSavingFormat] = useState<string | null>(null);
  const [savingFeeToggle, setSavingFeeToggle] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [savingDashboardName, setSavingDashboardName] = useState(false);

  // Policy editing state
  const [policyEdits, setPolicyEdits] = useState<Record<string, { refund_policy_type?: string; refund_policy?: string; rain_date_policy_type?: string; rain_date_policy?: string }>>({});
  const [savingPolicy, setSavingPolicy] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setDashboardName(org.dashboardName || "");
      supabase
        .from("tournaments")
        .select("id, title, scoring_format, pass_fees_to_participants, refund_policy_type, refund_policy, rain_date_policy_type, rain_date_policy")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTournaments((data as any) || []));
    }
  }, [org]);

  const handleSaveDashboardName = async () => {
    if (demoGuard() || !org) return;
    setSavingDashboardName(true);
    const { error } = await supabase
      .from("organizations")
      .update({ dashboard_name: dashboardName.trim() || null } as any)
      .eq("id", org.orgId);
    if (error) toast.error(error.message);
    else toast.success("Dashboard name updated!");
    setSavingDashboardName(false);
  };

  const handleSaveFormat = async (tournamentId: string) => {
    if (demoGuard()) return;
    const newFormat = formatEdits[tournamentId];
    if (!newFormat) return;
    setSavingFormat(tournamentId);
    const { error } = await supabase
      .from("tournaments")
      .update({ scoring_format: newFormat } as any)
      .eq("id", tournamentId);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Scoring format updated!");
      setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, scoring_format: newFormat } : t));
      setFormatEdits((prev) => { const n = { ...prev }; delete n[tournamentId]; return n; });
    }
    setSavingFormat(null);
  };

  const handleToggleFees = async (tournamentId: string, currentValue: boolean) => {
    if (demoGuard()) return;
    setSavingFeeToggle(tournamentId);
    const newValue = !currentValue;
    const { error } = await supabase
      .from("tournaments")
      .update({ pass_fees_to_participants: newValue } as any)
      .eq("id", tournamentId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newValue ? "Fees will be passed to participants" : "Fees will be absorbed by your organization");
      setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, pass_fees_to_participants: newValue } : t));
    }
    setSavingFeeToggle(null);
  };

  const getPolicyEdit = (tournamentId: string) => policyEdits[tournamentId] || {};

  const handleRefundPolicyTypeChange = (tournamentId: string, typeId: string) => {
    const preset = REFUND_POLICY_PRESETS.find((p) => p.id === typeId);
    setPolicyEdits((prev) => ({
      ...prev,
      [tournamentId]: {
        ...prev[tournamentId],
        refund_policy_type: typeId,
        refund_policy: typeId === "custom" ? (prev[tournamentId]?.refund_policy || "") : (preset?.text || ""),
      },
    }));
  };

  const handleRainPolicyTypeChange = (tournamentId: string, typeId: string) => {
    const preset = RAIN_POLICY_PRESETS.find((p) => p.id === typeId);
    setPolicyEdits((prev) => ({
      ...prev,
      [tournamentId]: {
        ...prev[tournamentId],
        rain_date_policy_type: typeId,
        rain_date_policy: typeId === "custom" ? (prev[tournamentId]?.rain_date_policy || "") : (preset?.text || ""),
      },
    }));
  };

  const handleSavePolicy = async (tournamentId: string) => {
    if (demoGuard()) return;
    const edits = policyEdits[tournamentId];
    if (!edits) return;
    setSavingPolicy(tournamentId);
    const updates: any = {};
    if (edits.refund_policy_type !== undefined) updates.refund_policy_type = edits.refund_policy_type;
    if (edits.refund_policy !== undefined) updates.refund_policy = edits.refund_policy;
    if (edits.rain_date_policy_type !== undefined) updates.rain_date_policy_type = edits.rain_date_policy_type;
    if (edits.rain_date_policy !== undefined) updates.rain_date_policy = edits.rain_date_policy;

    const { error } = await supabase
      .from("tournaments")
      .update(updates)
      .eq("id", tournamentId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Policies updated!");
      setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, ...updates } : t));
      setPolicyEdits((prev) => { const n = { ...prev }; delete n[tournamentId]; return n; });
    }
    setSavingPolicy(null);
  };

  const hasPolicyChanges = (tournamentId: string) => {
    const edits = policyEdits[tournamentId];
    if (!edits) return false;
    const t = tournaments.find((t) => t.id === tournamentId);
    if (!t) return false;
    return (
      (edits.refund_policy_type !== undefined && edits.refund_policy_type !== t.refund_policy_type) ||
      (edits.refund_policy !== undefined && edits.refund_policy !== t.refund_policy) ||
      (edits.rain_date_policy_type !== undefined && edits.rain_date_policy_type !== t.rain_date_policy_type) ||
      (edits.rain_date_policy !== undefined && edits.rain_date_policy !== t.rain_date_policy)
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization, payment, refund, and rain date settings.
        </p>
      </div>

      {/* Payout Settings Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-display font-bold text-foreground">
            Payout Settings
          </h2>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-foreground font-medium">How payouts work</p>
          <p className="text-xs text-muted-foreground mt-1">
            All customer payments are collected and held securely by TeeVents. A transparent 4% platform fee is applied to each transaction.
            Net payouts (after fees, refunds, and 15% reserve) are processed automatically every two weeks on the 1st and 15th of each month.
            The 15% reserve is released 15 days after your event ends.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Payment collection is active</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your tournament registration fees, donations, and store purchases are automatically collected by TeeVents.
            View your held funds, reserve balance, and payout history in the <strong>Finances</strong> tab.
          </p>
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-foreground mb-2">Need to update your payout details?</p>
            <p className="text-xs text-muted-foreground">
              Contact <a href="mailto:info@teevents.golf" className="text-primary underline">info@teevents.golf</a> to set up or change your organization's bank account for payouts.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Payment & Fee Settings */}
      {tournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="h-6 w-6 text-secondary" />
            <h2 className="text-lg font-display font-bold text-foreground">Payment & Fee Settings</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Control how the 4% platform fee and Stripe processing fees are handled for each tournament.
          </p>
          <div className="space-y-4">
            {tournaments.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.pass_fees_to_participants
                      ? "Fees passed to participants (4% platform + ~2.9%+$0.30 Stripe) — your organization receives the full advertised price."
                      : "Fees absorbed by organization — participants pay exactly the advertised price. Fees deducted from bi-weekly payout."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`fee-toggle-${t.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                    Pass fees to participants
                  </Label>
                  <Switch
                    id={`fee-toggle-${t.id}`}
                    checked={t.pass_fees_to_participants}
                    onCheckedChange={() => handleToggleFees(t.id, t.pass_fees_to_participants)}
                    disabled={savingFeeToggle === t.id}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground">
              <strong>When ON (recommended):</strong> Registrants pay the base price + 4% TeeVents fee + ~2.9%+$0.30 Stripe fee. Total ~6.9% + $0.30.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>When OFF:</strong> Participants pay exactly the advertised price. All fees are deducted from your bi-weekly payout.
            </p>
          </div>
        </motion.div>
      )}

      {/* Refund & Rain Date Policy */}
      {tournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Refund & Rain Date Policies</h2>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
            <p className="text-xs text-muted-foreground">
              You fully control both the refund policy and rain date policy. TeeVents will process approved refunds (full or partial) from held funds.
              A <strong>15% reserve</strong> is held until 60 days post-event to cover refunds and chargebacks. You are never personally liable.
            </p>
          </div>

          <div className="space-y-6">
            {tournaments.map((t) => {
              const edit = getPolicyEdit(t.id);
              const currentRefundType = edit.refund_policy_type ?? t.refund_policy_type ?? "full_30_days";
              const currentRefundText = edit.refund_policy ?? t.refund_policy ?? "";
              const currentRainType = edit.rain_date_policy_type ?? t.rain_date_policy_type ?? "auto_transfer";
              const currentRainText = edit.rain_date_policy ?? t.rain_date_policy ?? "";
              const hasChanges = hasPolicyChanges(t.id);

              return (
                <div key={t.id} className="p-4 rounded-lg border border-border space-y-4">
                  <p className="font-semibold text-foreground text-sm">{t.title}</p>

                  {/* Refund Policy */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">Refund Policy</Label>
                    </div>
                    <Select value={currentRefundType} onValueChange={(v) => handleRefundPolicyTypeChange(t.id, v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REFUND_POLICY_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentRefundType === "custom" ? (
                      <Textarea
                        value={currentRefundText}
                        onChange={(e) => setPolicyEdits((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], refund_policy: e.target.value },
                        }))}
                        placeholder="Enter your custom refund policy..."
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{currentRefundText}</p>
                    )}
                  </div>

                  {/* Rain Date Policy */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CloudRain className="h-4 w-4 text-blue-500" />
                      <Label className="text-sm font-medium text-foreground">Rain Date Policy</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Clearly communicate your rain date policy to participants.</p>
                    <Select value={currentRainType} onValueChange={(v) => handleRainPolicyTypeChange(t.id, v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RAIN_POLICY_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentRainType === "custom" ? (
                      <Textarea
                        value={currentRainText}
                        onChange={(e) => setPolicyEdits((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], rain_date_policy: e.target.value },
                        }))}
                        placeholder="Enter your custom rain date policy..."
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{currentRainText}</p>
                    )}
                  </div>

                  {hasChanges && (
                    <Button
                      size="sm"
                      onClick={() => handleSavePolicy(t.id)}
                      disabled={savingPolicy === t.id}
                    >
                      {savingPolicy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Save Policies
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-lg border border-border p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-6 w-6 text-secondary" />
          <h2 className="text-lg font-display font-bold text-foreground">Organization</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-sm text-muted-foreground">Name</span>
            <p className="font-medium text-foreground">{org?.orgName || "—"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Plan</span>
            <div className="flex items-center gap-3">
              <p className="font-medium text-foreground capitalize">{org?.plan || "—"}</p>
              {org?.plan && org.plan !== "enterprise" && (
                <Link
                  to="/dashboard/upgrade"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-secondary/80 transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <Label htmlFor="dashboard-name" className="text-sm text-muted-foreground">
            Dashboard Display Name
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Customize the name shown in "Welcome back, ..." on your dashboard. Leave blank to use your organization name.
          </p>
          <div className="flex items-center gap-2 max-w-md">
            <Input
              id="dashboard-name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder={org?.orgName || "Organization name"}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSaveDashboardName}
              disabled={savingDashboardName}
            >
              {savingDashboardName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Team Management */}
      {org && <TeamManagement orgId={org.orgId} userId={org.userId} />}

      {/* Nonprofit Settings */}
      {org && <NonprofitSettings orgId={org.orgId} />}

      {/* Email Notifications */}
      {org && <NotificationSettings orgId={org.orgId} />}

      {/* Tournament Scoring Formats */}
      {tournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Scoring Formats</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Change the scoring format for any tournament. This affects how the leaderboard calculates and displays results.
          </p>
          <div className="space-y-4">
            {tournaments.map((t) => {
              const currentFormat = formatEdits[t.id] ?? t.scoring_format;
              const hasChange = formatEdits[t.id] != null && formatEdits[t.id] !== t.scoring_format;
              const fmt = SCORING_FORMATS.find((f) => f.id === currentFormat);
              return (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{t.title}</p>
                    {fmt && <p className="text-xs text-muted-foreground mt-0.5">{fmt.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={currentFormat}
                      onValueChange={(val) => setFormatEdits((prev) => ({ ...prev, [t.id]: val }))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCORING_FORMATS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <div className="flex items-center gap-1.5">
                              {f.name}
                              {f.teamSize > 1 && (
                                <span className="text-[10px] text-muted-foreground">({f.teamSize}p)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChange && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveFormat(t.id)}
                        disabled={savingFormat === t.id}
                      >
                        {savingFormat === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings;

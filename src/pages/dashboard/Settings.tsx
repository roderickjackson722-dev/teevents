import { useState, useEffect } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { markChecklistTaskComplete } from "@/hooks/useSetupChecklist";
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

import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NonprofitSettings } from "@/components/settings/NonprofitSettings";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { AccountEmailCard } from "@/components/settings/AccountEmailCard";

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
  show_branding_badge: boolean;
  show_branding_footer: boolean;
}

const Settings = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<TournamentSettings[]>([]);
  const [formatEdits, setFormatEdits] = useState<Record<string, string>>({});
  const [savingFormat, setSavingFormat] = useState<string | null>(null);
  const [savingFeeToggle, setSavingFeeToggle] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [savingDashboardName, setSavingDashboardName] = useState(false);

  // Policy editing state
  const [policyEdits, setPolicyEdits] = useState<Record<string, { refund_policy_type?: string; refund_policy?: string; rain_date_policy_type?: string; rain_date_policy?: string }>>({});
  const [savingPolicy, setSavingPolicy] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setDashboardName(org.dashboardName || "");
      setDisplayName(org.orgName || null);
      supabase
        .from("tournaments")
        .select("id, title, scoring_format, pass_fees_to_participants, refund_policy_type, refund_policy, rain_date_policy_type, rain_date_policy, show_branding_badge, show_branding_footer")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTournaments((data as any) || []));
    }
  }, [org]);

  const handleSaveDashboardName = async () => {
    if (demoGuard() || !org) return;
    setSavingDashboardName(true);
    const trimmed = dashboardName.trim();
    const update: Record<string, unknown> = { dashboard_name: trimmed || null };
    // Keep the organization Name in sync with the Dashboard Display Name
    if (trimmed) update.name = trimmed;
    const { error } = await supabase
      .from("organizations")
      .update(update as any)
      .eq("id", org.orgId);
    if (error) toast.error(error.message);
    else {
      toast.success("Organization name updated!");
      if (trimmed) setDisplayName(trimmed);
    }
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
      markChecklistTaskComplete(tournamentId, "choose_scoring_format");
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

  const [savingBadgeToggle, setSavingBadgeToggle] = useState<string | null>(null);
  const isProPlan = org?.plan === "pro" || org?.plan === "starter" || org?.plan === "premium" || org?.plan === "enterprise";

  const handleToggleBadge = async (tournamentId: string, currentValue: boolean) => {
    if (demoGuard()) return;
    if (currentValue && !isProPlan) {
      toast.error("Hiding the TeeVents badge is a Pro feature. Upgrade to remove it.");
      return;
    }
    setSavingBadgeToggle(tournamentId);
    const newValue = !currentValue;
    const { error } = await supabase
      .from("tournaments")
      .update({ show_branding_badge: newValue } as any)
      .eq("id", tournamentId);
    if (error) toast.error(error.message);
    else {
      toast.success(newValue ? "Badge will appear on public pages" : "Badge hidden on public pages");
      setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, show_branding_badge: newValue } : t));
    }
    setSavingBadgeToggle(null);
  };

  const [savingFooterToggle, setSavingFooterToggle] = useState<string | null>(null);
  const handleToggleFooter = async (tournamentId: string, currentValue: boolean) => {
    if (demoGuard()) return;
    if (currentValue && !isProPlan) {
      toast.error("Hiding the TeeVents footer is a Pro feature. Upgrade to remove it.");
      return;
    }
    setSavingFooterToggle(tournamentId);
    const newValue = !currentValue;
    const { error } = await supabase
      .from("tournaments")
      .update({ show_branding_footer: newValue } as any)
      .eq("id", tournamentId);
    if (error) toast.error(error.message);
    else {
      toast.success(newValue ? "Footer will appear on public pages" : "Footer hidden on public pages");
      setTournaments((prev) => prev.map((t) => t.id === tournamentId ? { ...t, show_branding_footer: newValue } : t));
    }
    setSavingFooterToggle(null);
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

      {/* Payout Settings Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border p-6 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">Payout Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set up Stripe Connect or PayPal to receive tournament funds.
              </p>
            </div>
          </div>
          <Link to="/dashboard/payout-settings">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4 mr-1.5" />
              Manage Payouts
            </Button>
          </Link>
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
            Control how the 5% platform fee and Stripe processing fees are handled for each tournament.
          </p>
          <div className="space-y-6">
            {tournaments.map((t) => {
              // Example on a $100 registration:
              // Pass fees: golfer pays 100 + 5 (platform) + grossed-up Stripe fee = ~$108.20
              // Absorb: golfer pays $100; organizer keeps 100 - 5 - (2.9% of 100 + 0.30) = ~$91.80
              const base = 100;
              const passTotal = 108.20;
              const absorbNet = 91.80;
              return (
                <div key={t.id} className="rounded-lg border border-border p-4">
                  <p className="font-semibold text-foreground text-sm mb-3">{t.title}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => !t.pass_fees_to_participants || handleToggleFees(t.id, false)}
                      disabled={savingFeeToggle === t.id}
                      className={`text-left rounded-lg border-2 p-4 transition ${
                        t.pass_fees_to_participants
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <p className="font-semibold text-sm text-foreground">
                        Pass fees to golfers <span className="text-xs text-primary">(Recommended)</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Golfers cover the 5% TeeVents fee and Stripe processing. You receive the full ${base.toFixed(2)} of every ${base.toFixed(2)} ticket.
                      </p>
                      <p className="text-xs font-mono mt-2 text-foreground">
                        ${base.toFixed(2)} ticket → golfer pays ${passTotal.toFixed(2)} → you keep ${base.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Best for: charity events, registrations where the published price is the “net to the cause”.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => t.pass_fees_to_participants && handleToggleFees(t.id, true)}
                      disabled={savingFeeToggle === t.id}
                      className={`text-left rounded-lg border-2 p-4 transition ${
                        !t.pass_fees_to_participants
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <p className="font-semibold text-sm text-foreground">Absorb fees</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Golfers pay exactly the advertised price. The 5% platform fee and Stripe processing come out of your payout.
                      </p>
                      <p className="text-xs font-mono mt-2 text-foreground">
                        ${base.toFixed(2)} ticket → golfer pays ${base.toFixed(2)} → you keep ~${absorbNet.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Best for: corporate outings, member events, anywhere a clean round-number price matters.
                      </p>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground">
              Payments now settle directly into your Stripe account. TeeVents automatically deducts its 5% platform fee at the time of each charge — no waiting on transfers, and Stripe processing fees are handled the way you choose above.
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
              You fully control both the refund policy and rain date policy. Because payments use Stripe Connect <strong>Direct Charges</strong>, you are the merchant of record — refunds are one-click from your dashboard and pull from your own Stripe balance. <strong>TeeVents never holds your funds.</strong>
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
            <p className="font-medium text-foreground">{displayName || org?.orgName || "—"}</p>
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

      {/* Team Management moved to its own page at /dashboard/team */}

      {/* Nonprofit Settings */}
      {org && <NonprofitSettings orgId={org.orgId} />}

      {/* Email Notifications */}
      {org && <NotificationSettings orgId={org.orgId} />}

      {/* Email on File */}
      <AccountEmailCard />

      {/* Change Password */}
      <ChangePasswordCard />

      {/* TeeVents Branding */}
      {tournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">TeeVents Branding</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A small "Powered by TeeVents" badge appears in the corner, and a "Powered by TeeVents" footer sits at the bottom of every public page (tournament site, live leaderboard, day-of page). {isProPlan ? "Toggle them off per tournament." : "Upgrade to Pro to hide them."}
          </p>
          <div className="space-y-3">
            {tournaments.map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-3 space-y-3">
                <p className="font-semibold text-sm text-foreground truncate">{t.title}</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t.show_branding_badge ? "Corner badge visible" : "Corner badge hidden"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`badge-${t.id}`} className="text-xs text-muted-foreground">Show badge</Label>
                    <Switch
                      id={`badge-${t.id}`}
                      checked={t.show_branding_badge !== false}
                      disabled={savingBadgeToggle === t.id || (!isProPlan && t.show_branding_badge !== false)}
                      onCheckedChange={() => handleToggleBadge(t.id, t.show_branding_badge !== false)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t.show_branding_footer !== false ? "Branding footer visible on public pages" : "Branding footer hidden"}
                    </p>
                    {!isProPlan && (
                      <p className="text-[11px] text-muted-foreground/80 italic">Free plan must show the footer.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`footer-${t.id}`} className="text-xs text-muted-foreground">Show footer</Label>
                    <Switch
                      id={`footer-${t.id}`}
                      checked={t.show_branding_footer !== false}
                      disabled={savingFooterToggle === t.id || (!isProPlan && t.show_branding_footer !== false)}
                      onCheckedChange={() => handleToggleFooter(t.id, t.show_branding_footer !== false)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Scoring formats, skins, flights, and payouts now live in the
          "Scoring & Payouts" tab under Tournament Setup. */}

    </div>
  );
};

export default Settings;

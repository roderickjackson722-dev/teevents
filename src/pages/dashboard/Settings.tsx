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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NonprofitSettings } from "@/components/settings/NonprofitSettings";

const Settings = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<{ id: string; title: string; scoring_format: string }[]>([]);
  const [formatEdits, setFormatEdits] = useState<Record<string, string>>({});
  const [savingFormat, setSavingFormat] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [savingDashboardName, setSavingDashboardName] = useState(false);
  useEffect(() => {
    if (org) {
      setDashboardName(org.dashboardName || "");
      supabase
        .from("tournaments")
        .select("id, title, scoring_format")
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

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization and payment settings.
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
            All customer payments (registration fees, donations, store purchases, and auction bids) are collected and held securely by TeeVents.
            Net payouts to your organization are processed automatically every two weeks on the 1st and 15th of each month.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Payment collection is active</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your tournament registration fees, donations, and store purchases are automatically collected by TeeVents.
            View your held funds and payout history in the <strong>Finances</strong> tab.
          </p>
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-foreground mb-2">Need to update your payout details?</p>
            <p className="text-xs text-muted-foreground">
              Contact <a href="mailto:info@teevents.golf" className="text-primary underline">info@teevents.golf</a> to set up or change your organization's bank account for payouts.
            </p>
          </div>
        </div>
      </motion.div>


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
      {org && (
        <TeamManagement orgId={org.orgId} userId={org.userId} />
      )}

      {/* Nonprofit Settings */}
      {org && (
        <NonprofitSettings orgId={org.orgId} />
      )}

      {/* Email Notifications */}
      {org && (
        <NotificationSettings orgId={org.orgId} />
      )}

      {/* Tournament Scoring Formats */}
      {tournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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

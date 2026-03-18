import { useState, useEffect } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Building2,
  Palette,
  ArrowRight,
  Zap,
  Trophy,
  Users,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NonprofitSettings } from "@/components/settings/NonprofitSettings";

interface ConnectStatus {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted?: boolean;
  account_id?: string;
}

const Settings = () => {
  const { org } = useOrgContext();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [tournaments, setTournaments] = useState<{ id: string; title: string; scoring_format: string }[]>([]);
  const [formatEdits, setFormatEdits] = useState<Record<string, string>>({});
  const [savingFormat, setSavingFormat] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectStatus();
    if (org) {
      supabase
        .from("tournaments")
        .select("id, title, scoring_format")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTournaments((data as any) || []));
    }
  }, [org]);

  const getFunctionErrorMessage = (err: any, fallback: string) => {
    const apiError = err?.context?.json?.error;
    if (typeof apiError === "string" && apiError.length > 0) return apiError;

    if (typeof err?.message === "string" && !err.message.includes("non-2xx")) {
      return err.message;
    }

    return fallback;
  };

  const handleSaveFormat = async (tournamentId: string) => {
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

  const fetchConnectStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setConnectStatus(data);
    } catch (err) {
      console.error("Failed to fetch connect status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setOnboarding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(getFunctionErrorMessage(err, "Failed to start Stripe onboarding"));
      setOnboarding(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("stripe-connect-dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(getFunctionErrorMessage(err, "Failed to open Stripe dashboard"));
    }
  };

  const isFullyConnected =
    connectStatus?.connected &&
    connectStatus?.charges_enabled &&
    connectStatus?.payouts_enabled;

  const isPending =
    connectStatus?.connected &&
    (!connectStatus?.charges_enabled || !connectStatus?.payouts_enabled);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization and payment settings.
        </p>
      </div>

      {/* Stripe Connect Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-display font-bold text-foreground">
            Payment Processing
          </h2>
        </div>

        <p className="text-muted-foreground mb-6">
          Connect your Stripe account to receive payments directly from player registrations,
          donations, store purchases, and auction bids. The platform takes a 5% service fee on
          each transaction.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking payment status...
          </div>
        ) : isFullyConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Stripe account connected — payments active</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleOpenDashboard}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </Button>
            </div>
          </div>
        ) : isPending ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Stripe account linked but onboarding incomplete
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please complete your Stripe onboarding to start accepting payments.
            </p>
            <Button onClick={handleConnectStripe} disabled={onboarding}>
              {onboarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Stripe Onboarding
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>No Stripe account connected</span>
            </div>
            <Button onClick={handleConnectStripe} disabled={onboarding}>
              {onboarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CreditCard className="h-4 w-4 mr-2" />
              Connect Stripe Account
            </Button>
          </div>
        )}
      </motion.div>

      {/* Organization Info Section */}
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
        <div className="grid sm:grid-cols-2 gap-4">
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

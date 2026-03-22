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
  ArrowRight,
  Zap,
  Trophy,
  Save,
  Unlink,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NonprofitSettings } from "@/components/settings/NonprofitSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConnectStatus {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted?: boolean;
  account_id?: string;
}

interface PayPalStatus {
  connected: boolean;
  merchant_id: string | null;
}

const Settings = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [tournaments, setTournaments] = useState<{ id: string; title: string; scoring_format: string }[]>([]);
  const [formatEdits, setFormatEdits] = useState<Record<string, string>>({});
  const [savingFormat, setSavingFormat] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState("");
  const [savingDashboardName, setSavingDashboardName] = useState(false);
  const [disconnectEmail, setDisconnectEmail] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAccountId, setManualAccountId] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  useEffect(() => {
    fetchConnectStatus();
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

  const getFunctionErrorMessage = (err: any, fallback: string) => {
    const apiError = err?.context?.json?.error;
    if (typeof apiError === "string" && apiError.length > 0) return apiError;
    if (typeof err?.message === "string" && !err.message.includes("non-2xx")) {
      return err.message;
    }
    return fallback;
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
    if (demoGuard()) return;
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

  const handleDisconnectStripe = async () => {
    if (demoGuard()) return;
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("stripe-disconnect", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { confirm_email: disconnectEmail },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Stripe account disconnected successfully");
      setConnectStatus({ connected: false, charges_enabled: false, payouts_enabled: false });
      setDisconnectEmail("");
      setDisconnectDialogOpen(false);
    } catch (err: any) {
      toast.error(getFunctionErrorMessage(err, "Failed to disconnect Stripe account"));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (demoGuard() || !org) return;
    const trimmed = manualAccountId.trim();
    if (!trimmed.startsWith("acct_")) {
      toast.error("Please enter a valid Stripe account ID (starts with acct_)");
      return;
    }
    setSavingManual(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ stripe_account_id: trimmed } as any)
        .eq("id", org.orgId);
      if (error) throw error;
      toast.success("Stripe account ID saved! Verifying status...");
      setManualAccountId("");
      setShowManualEntry(false);
      await fetchConnectStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Stripe account ID");
    } finally {
      setSavingManual(false);
    }
  };

  const isFullyConnected =
    connectStatus?.connected &&
    connectStatus?.charges_enabled &&
    connectStatus?.payouts_enabled;

  const isPending =
    connectStatus?.connected &&
    (!connectStatus?.charges_enabled || !connectStatus?.payouts_enabled);

  const isInvalidAccount = !!(connectStatus as any)?.invalid_account;

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
        ) : isInvalidAccount ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Stripe account could not be verified
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              The saved account ID could not be accessed by our platform. This usually means the account
              was entered manually but was never connected through Stripe's onboarding flow. Please click
              <strong> Connect Stripe Account</strong> below to properly link your account, or disconnect the
              invalid entry first.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConnectStripe} disabled={onboarding}>
                {onboarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                Connect Stripe Account
              </Button>
              <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Unlink className="h-4 w-4 mr-2" />
                    Remove Invalid Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Invalid Stripe Account?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This will clear the invalid Stripe account ID so you can connect a new account
                        through the proper onboarding flow.
                      </p>
                      <p>To confirm, type your account email address below:</p>
                      <Input
                        placeholder="Enter your email to confirm"
                        value={disconnectEmail}
                        onChange={(e) => setDisconnectEmail(e.target.value)}
                        className="mt-2"
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDisconnectEmail("")}>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectStripe}
                      disabled={disconnecting || !disconnectEmail.trim()}
                    >
                      {disconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Remove & Reset
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : isFullyConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Stripe account connected — payments active</span>
            </div>
            {connectStatus?.account_id && (
              <p className="text-xs text-muted-foreground">
                Account ID: {connectStatus.account_id}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleOpenDashboard}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </Button>

              <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect Stripe
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Stripe Account?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This will remove the connected Stripe account from your organization. 
                        You will <strong>no longer be able to accept payments</strong> for registrations, 
                        donations, store purchases, or auction bids until you connect a new account.
                      </p>
                      <p>
                        This action can only be performed by the organization owner. 
                        To confirm, please type your account email address below:
                      </p>
                      <Input
                        placeholder="Enter your email to confirm"
                        value={disconnectEmail}
                        onChange={(e) => setDisconnectEmail(e.target.value)}
                        className="mt-2"
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDisconnectEmail("")}>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectStripe}
                      disabled={disconnecting || !disconnectEmail.trim()}
                    >
                      {disconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Disconnect Account
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground">
              To switch accounts, disconnect your current Stripe account then connect a new one.
            </p>
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
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConnectStripe} disabled={onboarding}>
                {onboarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete Stripe Onboarding
              </Button>
              <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect & Retry
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Stripe Account?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This will remove the linked Stripe account so you can start fresh 
                        or connect a different account.
                      </p>
                      <p>To confirm, type your account email address below:</p>
                      <Input
                        placeholder="Enter your email to confirm"
                        value={disconnectEmail}
                        onChange={(e) => setDisconnectEmail(e.target.value)}
                        className="mt-2"
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDisconnectEmail("")}>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectStripe}
                      disabled={disconnecting || !disconnectEmail.trim()}
                    >
                      {disconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Disconnect Account
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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

            {/* Manual entry fallback */}
            <div className="border-t border-border pt-4 mt-4">
              <button
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Having trouble? Enter your Stripe Account ID manually
              </button>
              {showManualEntry && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Find your Account ID in your{" "}
                    <a href="https://dashboard.stripe.com/settings/account" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      Stripe Dashboard → Settings
                    </a>
                    . It starts with <code className="bg-muted px-1 rounded text-xs">acct_</code>.
                  </p>
                  <div className="flex items-center gap-2 max-w-md">
                    <Input
                      value={manualAccountId}
                      onChange={(e) => setManualAccountId(e.target.value)}
                      placeholder="acct_1234567890"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleManualConnect}
                      disabled={savingManual || !manualAccountId.trim()}
                    >
                      {savingManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

import { useState, useEffect } from "react";
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
  }, []);

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
      toast.error(err.message || "Failed to start Stripe onboarding");
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
      toast.error(err.message || "Failed to open Stripe dashboard");
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
    <div>
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
    </div>
  );
};

export default Settings;

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  CreditCard, CheckCircle2, Loader2, AlertCircle, Mail, Shield,
  Banknote, ExternalLink, History, RefreshCw, Building2, FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PayoutMethod {
  id: string;
  organization_id: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_account_status: string;
  stripe_account_last4: string | null;
  stripe_account_brand: string | null;
  paypal_email: string | null;
  preferred_method: string;
  is_verified: boolean;
  verification_notes: string | null;
  change_request_status: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  description: string | null;
  metadata: any;
  created_at: string;
  email: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  details: { summary?: string } | null;
  created_at: string;
}

export default function PayoutSettings() {
  const { org, loading: orgLoading } = useOrgContext();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [savingPaypal, setSavingPaypal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"stripe" | "paypal" | "check">("check");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChangeBankModal, setShowChangeBankModal] = useState(false);
  const [changingBank, setChangingBank] = useState(false);
  const [savingCheck, setSavingCheck] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<"stripe" | "paypal" | "check" | null>(null);

  // Legal acknowledgment state
  const [ackFee, setAckFee] = useState(false);
  const [ackEscrow, setAckEscrow] = useState(false);

  useEffect(() => {
    if (org?.orgId) {
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
      fetchOrgSettings();
      fetchActivityLogs();
    }
  }, [org?.orgId]);

  const fetchOrgSettings = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("payout_method, mailing_address")
      .eq("id", org!.orgId)
      .single();
    if (data) {
      setSelectedMethod(((data as any).payout_method || "stripe") as "stripe" | "paypal" | "check");
      setMailingAddress((data as any).mailing_address || "");
    }
  };

  const beginMethodSelection = (method: "stripe" | "paypal" | "check") => {
    setPendingMethod(method);
    setAckFee(false);
    setAckEscrow(false);
  };

  const clearPendingMethod = () => {
    setPendingMethod(null);
    setAckFee(false);
    setAckEscrow(false);
  };

  const fetchPayoutMethodAndSync = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_payout_methods")
      .select("*")
      .eq("organization_id", org!.orgId)
      .single();

    if (data) {
      setPayoutMethod(data as unknown as PayoutMethod);
      if ((data as any).paypal_email) setPaypalEmail((data as any).paypal_email);

      if ((data as any).stripe_account_id && !(data as any).stripe_account_last4) {
        try {
          const { data: syncData } = await supabase.functions.invoke("stripe-connect-status", { body: {} });
          if (syncData?.last4) {
            setPayoutMethod((current) =>
              current
                ? {
                    ...current,
                    stripe_account_last4: syncData.last4,
                    stripe_account_brand: syncData.brand ?? current.stripe_account_brand,
                    stripe_onboarding_complete: Boolean(syncData.details_submitted),
                    stripe_account_status: syncData.charges_enabled ? "active" : current.stripe_account_status,
                  }
                : current
            );
          }
          const { data: refreshed } = await supabase
            .from("organization_payout_methods")
            .select("*")
            .eq("organization_id", org!.orgId)
            .single();
          if (refreshed) setPayoutMethod(refreshed as unknown as PayoutMethod);
        } catch { /* silent */ }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (searchParams.get("stripe_connected") === "true") {
      toast.success("Stripe account connected! Checking status...");
      checkStripeStatus();
    }
    if (searchParams.get("updated") === "true") {
      toast.success("Stripe account updated successfully!");
      checkStripeStatus();
    }
    if (searchParams.get("refresh") === "true") {
      toast.info("Stripe onboarding was interrupted. Please try again.");
    }
  }, [searchParams]);

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from("payout_audit_log")
      .select("id, action, details, created_at")
      .eq("organization_id", org!.orgId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setAuditLogs(data as unknown as AuditLog[]);
  };

  const fetchActivityLogs = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id, action_type, description, metadata, created_at, email")
      .eq("organization_id", org!.orgId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setActivityLogs(data as unknown as ActivityLog[]);
  };

  const logAudit = async (action: string, details: Record<string, string>) => {
    if (!org?.orgId) return;
    await supabase.from("payout_audit_log").insert({
      organization_id: org.orgId,
      user_id: org.userId,
      action,
      details,
      user_agent: navigator.userAgent,
    } as any);
  };

  const logActivity = async (actionType: string, description: string, metadata?: Record<string, any>) => {
    if (!org?.orgId) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      organization_id: org.orgId,
      user_id: org.userId,
      email: user?.email ?? null,
      action_type: actionType,
      description,
      metadata: { ...metadata, user_agent: navigator.userAgent },
    } as any);
  };

  const notifyAdmin = async (type: string, message: string) => {
    await supabase.from("admin_notifications").insert({
      type,
      organization_id: org?.orgId,
      message,
    } as any);
  };

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status", { body: {} });
      if (!error && data?.charges_enabled) {
        toast.success("Your Stripe account is fully verified and ready for payouts!");
        await logAudit("stripe_verified", { summary: "Stripe account verified and active" });
        await logActivity("stripe_verified", "Stripe account verified and active");
      }
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
      fetchActivityLogs();
    } catch {
      fetchPayoutMethodAndSync();
    }
  };

  const handleStripeConnect = async () => {
    if (!ackFee) {
      toast.error("Please acknowledge the 5% platform fee before continuing.");
      return;
    }
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error || !data?.url) {
        toast.error("Failed to start Stripe onboarding. Please try again.");
        return;
      }
      await logAudit("stripe_onboarding_started", { summary: "Started Stripe Connect onboarding" });
      await logActivity("payout_method_selected", `Selected Stripe Connect as payout method`, { new_method: "stripe" });
      await notifyAdmin("payout_method_selected", `${org?.orgName} selected Stripe Connect as their payout method.`);
      clearPendingMethod();
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleChangeBankAccount = async () => {
    setChangingBank(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error || !data?.url) {
        toast.error("Failed to open Stripe portal. Please try again.");
        return;
      }
      await logAudit("stripe_bank_update_started", { summary: "Opened Stripe portal to update bank account" });
      await logActivity("payout_settings_changed", "Opened Stripe portal to update bank account");
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setChangingBank(false);
      setShowChangeBankModal(false);
    }
  };

  const [confirmEmailSentTo, setConfirmEmailSentTo] = useState<string | null>(null);

  const handleDisconnectStripe = async () => {
    if (!org?.orgId) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-payout-change", {
        body: {
          organization_id: org.orgId,
          change_type: "remove_stripe",
          requested_method: "check", // fallback after removal
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to send confirmation email.");
        return;
      }
      setConfirmEmailSentTo(data?.sent_to || null);
      toast.success("Confirmation email sent. Check your inbox to finish removing Stripe.");
      await logAudit("stripe_disconnect_requested", {
        summary: "Email confirmation requested to disconnect Stripe",
      });
      setShowDisconnectModal(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };


  const handleSavePaypal = async () => {
    if (!paypalEmail || !paypalEmail.includes("@")) {
      toast.error("Please enter a valid PayPal email address.");
      return;
    }
    if (!ackFee || !ackEscrow) {
      toast.error("Please acknowledge both checkboxes before saving.");
      return;
    }
    if (!org?.orgId) return;
    setSavingPaypal(true);
    const oldMethod = selectedMethod;
    const oldEmail = payoutMethod?.paypal_email || null;
    const { error } = await supabase
      .from("organization_payout_methods")
      .upsert(
        {
          organization_id: org.orgId,
          paypal_email: paypalEmail,
          preferred_method: "paypal",
          is_verified: false,
        } as any,
        { onConflict: "organization_id" }
      );
    if (error) {
      toast.error("Failed to save PayPal email.");
    } else {
      await supabase.from("organizations").update({ payout_method: "paypal" } as any).eq("id", org.orgId);
      setSelectedMethod("paypal");
      toast.success("PayPal email saved. Payouts will be processed manually every two weeks.");
      await logAudit(oldEmail ? "paypal_updated" : "paypal_added", {
        summary: oldEmail ? `PayPal email updated to ${paypalEmail}` : `PayPal email added: ${paypalEmail}`,
      });
      await logActivity("payout_method_selected", `Changed payout method from ${oldMethod} to PayPal`, {
        old_method: oldMethod,
        new_method: "paypal",
        paypal_email: paypalEmail,
      });
      await notifyAdmin("payout_method_selected", `${org?.orgName} selected PayPal as their payout method (${paypalEmail}).`);
      clearPendingMethod();
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
      fetchActivityLogs();
    }
    setSavingPaypal(false);
  };

  const handleSaveCheck = async () => {
    if (!mailingAddress.trim()) {
      toast.error("Please enter a mailing address.");
      return;
    }
    if (!ackFee || !ackEscrow) {
      toast.error("Please acknowledge both checkboxes before saving.");
      return;
    }
    if (!org?.orgId) return;
    setSavingCheck(true);
    const oldMethod = selectedMethod;
    const { error } = await supabase
      .from("organizations")
      .update({ payout_method: "check", mailing_address: mailingAddress.trim() } as any)
      .eq("id", org.orgId);
    if (error) {
      toast.error("Failed to save check payout settings.");
    } else {
      setSelectedMethod("check");
      toast.success("Check payout method saved. Request payouts from the Finances page.");
      await logAudit("check_method_set", { summary: `Check payout method set. Address: ${mailingAddress.trim()}` });
      await logActivity("payout_method_selected", `Changed payout method from ${oldMethod} to Check`, {
        old_method: oldMethod,
        new_method: "check",
        mailing_address: mailingAddress.trim(),
      });
      await notifyAdmin("payout_method_selected", `${org?.orgName} selected Check as their payout method.`);
      clearPendingMethod();
      fetchAuditLogs();
      fetchActivityLogs();
    }
    setSavingCheck(false);
  };

  const handleSelectStripe = async () => {
    if (!ackFee) {
      toast.error("Please acknowledge the 5% platform fee before continuing.");
      return;
    }
    if (!org?.orgId) return;
    const oldMethod = selectedMethod;
    await supabase.from("organizations").update({ payout_method: "stripe" } as any).eq("id", org.orgId);
    await supabase.from("organization_payout_methods").update({ preferred_method: "stripe" } as any).eq("organization_id", org.orgId);
    setSelectedMethod("stripe");
    toast.success("Payout method set to Stripe Connect (automatic).");
    await logAudit("preferred_method_changed", { summary: "Payout method changed to Stripe Connect" });
    await logActivity("payout_method_selected", `Changed payout method from ${oldMethod} to Stripe Connect`, {
      old_method: oldMethod,
      new_method: "stripe",
    });
    await notifyAdmin("payout_method_selected", `${org?.orgName} switched to Stripe Connect.`);
    clearPendingMethod();
    fetchAuditLogs();
    fetchActivityLogs();
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stripeConnected = payoutMethod?.stripe_onboarding_complete === true;
  const stripeStarted = !!payoutMethod?.stripe_account_id;
  const combinedLogs = [
    ...activityLogs.map(l => ({ id: l.id, action: l.action_type, description: l.description, details: l.metadata, created_at: l.created_at, email: l.email, source: "activity" as const })),
    ...auditLogs.map(l => ({ id: l.id, action: l.action, description: l.details?.summary || null, details: l.details, created_at: l.created_at, email: null as string | null, source: "audit" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Payout Settings</h1>
        <p className="text-muted-foreground mt-1">Choose how you receive payments from your tournaments.</p>
      </div>

      {/* How Payouts Work */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">How payouts work</p>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
          <li><strong>Stripe Connect (Recommended):</strong> Payments split automatically at checkout — net proceeds go directly to your Stripe account</li>
          <li><strong>PayPal:</strong> TeeVents collects payments and sends you a PayPal payout every two weeks</li>
          <li><strong>Check:</strong> TeeVents holds funds and mails a check upon your request</li>
          <li>All methods: 5% platform fee + Stripe processing fee per transaction</li>
        </ul>
      </div>

      {/* ──── Stripe Connect ──── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={`border-2 ${selectedMethod === "stripe" || pendingMethod === "stripe" ? "border-emerald-500/50" : "border-border"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Stripe Connect</CardTitle>
                  <CardDescription>Recommended — automatic payouts to your bank</CardDescription>
                </div>
              </div>
              {stripeConnected && selectedMethod === "stripe" && (
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeConnected ? (
              <>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Stripe connected and verified</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {payoutMethod?.stripe_account_brand && (
                      <p><span className="font-medium text-foreground">Bank:</span> {payoutMethod.stripe_account_brand}</p>
                    )}
                    {payoutMethod?.stripe_account_last4 && (
                      <p><span className="font-medium text-foreground">Account:</span> •••• {payoutMethod.stripe_account_last4}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedMethod !== "stripe" && (
                    <Button size="sm" onClick={pendingMethod === "stripe" ? handleSelectStripe : () => beginMethodSelection("stripe")}>
                      {pendingMethod === "stripe" ? "Confirm Stripe Connect" : "Use Stripe Connect"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowChangeBankModal(true)} disabled={changingBank}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Update Bank Account
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/20" onClick={() => setShowDisconnectModal(true)}>
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-4">
                  <li>Automatic split at checkout — net proceeds go directly to your Stripe account</li>
                  <li>Fastest option: no manual work needed</li>
                  <li>Withdraw from Stripe to your bank on your schedule</li>
                </ul>
                {pendingMethod === "stripe" && (
                  <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="ack-fee-stripe"
                        checked={ackFee}
                        onCheckedChange={(checked) => setAckFee(checked === true)}
                      />
                      <label htmlFor="ack-fee-stripe" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                        I acknowledge and agree that TeeVents charges a <strong className="text-foreground">5% platform fee</strong> on every transaction processed through the platform.
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleStripeConnect} disabled={connectingStripe}>
                        {connectingStripe ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                        {stripeStarted ? "Complete Stripe Setup" : "Connect Stripe Account"}
                      </Button>
                      <Button variant="ghost" onClick={clearPendingMethod}>Cancel</Button>
                    </div>
                  </div>
                )}
                <Button onClick={pendingMethod === "stripe" ? handleStripeConnect : () => beginMethodSelection("stripe")} disabled={connectingStripe && pendingMethod === "stripe"}>
                  {connectingStripe ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  {pendingMethod === "stripe" ? (stripeStarted ? "Complete Stripe Setup" : "Connect Stripe Account") : "Select Stripe Connect"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ──── PayPal ──── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className={`border-2 ${selectedMethod === "paypal" || pendingMethod === "paypal" ? "border-blue-500/50" : "border-border"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">PayPal</CardTitle>
                  <CardDescription>Manual — TeeVents pays you every two weeks via PayPal</CardDescription>
                </div>
              </div>
              {selectedMethod === "paypal" && paypalEmail && (
                <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-4">
              <li>TeeVents collects full payment, then pays you via PayPal every two weeks</li>
              <li>TeeVents holds funds temporarily between batch payouts</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="paypal-email" className="text-sm">PayPal Email Address</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="your-email@example.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
            {pendingMethod === "paypal" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-fee-paypal"
                    checked={ackFee}
                    onCheckedChange={(checked) => setAckFee(checked === true)}
                  />
                  <label htmlFor="ack-fee-paypal" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I acknowledge and agree that TeeVents charges a <strong className="text-foreground">5% platform fee</strong> on every transaction processed through the platform.
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-escrow-paypal"
                    checked={ackEscrow}
                    onCheckedChange={(checked) => setAckEscrow(checked === true)}
                  />
                  <label htmlFor="ack-escrow-paypal" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I understand that if I select PayPal, my funds will be held in TeeVents' Stripe escrow account until I request a payout or until the next manual batch.
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSavePaypal} disabled={savingPaypal || !paypalEmail.trim()}>
                    {savingPaypal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Save PayPal & Set as Active
                  </Button>
                  <Button variant="ghost" onClick={clearPendingMethod}>Cancel</Button>
                </div>
              </div>
            )}
            <Button onClick={pendingMethod === "paypal" ? handleSavePaypal : () => beginMethodSelection("paypal")} disabled={savingPaypal || !paypalEmail.trim()}>
              {savingPaypal && pendingMethod === "paypal" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              {pendingMethod === "paypal" ? "Save PayPal & Set as Active" : "Select PayPal"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──── Check ──── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className={`border-2 ${selectedMethod === "check" || pendingMethod === "check" ? "border-amber-500/50" : "border-border"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Check</CardTitle>
                  <CardDescription>Manual — TeeVents holds funds and mails a check on request</CardDescription>
                </div>
              </div>
              {selectedMethod === "check" && mailingAddress && (
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-4">
              <li>TeeVents holds your funds until you request a check</li>
              <li>Checks mailed within 5–7 business days of request</li>
              <li>No additional fee beyond the standard 5% platform fee</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="mailing-address" className="text-sm">Mailing Address</Label>
              <Textarea
                id="mailing-address"
                placeholder={"123 Main St\nSuite 100\nPhoenix, AZ 85001"}
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                rows={3}
              />
            </div>
            {pendingMethod === "check" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-fee-check"
                    checked={ackFee}
                    onCheckedChange={(checked) => setAckFee(checked === true)}
                  />
                  <label htmlFor="ack-fee-check" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I acknowledge and agree that TeeVents charges a <strong className="text-foreground">5% platform fee</strong> on every transaction processed through the platform.
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ack-escrow-check"
                    checked={ackEscrow}
                    onCheckedChange={(checked) => setAckEscrow(checked === true)}
                  />
                  <label htmlFor="ack-escrow-check" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I understand that if I select Check, my funds will be held in TeeVents' Stripe escrow account until I request a payout or until the next manual batch.
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveCheck} disabled={savingCheck || !mailingAddress.trim()}>
                    {savingCheck ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
                    Save Address & Set as Active
                  </Button>
                  <Button variant="ghost" onClick={clearPendingMethod}>Cancel</Button>
                </div>
              </div>
            )}
            <Button onClick={pendingMethod === "check" ? handleSaveCheck : () => beginMethodSelection("check")} disabled={savingCheck || !mailingAddress.trim()}>
              {savingCheck && pendingMethod === "check" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
              {pendingMethod === "check" ? "Save Address & Set as Active" : "Select Check"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──── Activity Log ──── */}
      {combinedLogs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Activity Log</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedLogs.map((log) => (
                    <TableRow key={`${log.source}-${log.id}`}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-foreground whitespace-nowrap">
                        {log.email || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.action.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disconnect Stripe Modal — uses email confirmation */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Stripe Connect account</DialogTitle>
            <DialogDescription>
              For security, we'll send a confirmation link to your email. The change only takes effect after you click that link.
              The link expires in 15 minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDisconnectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisconnectStripe} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send confirmation email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email confirmation sent acknowledgment */}
      <Dialog open={!!confirmEmailSentTo} onOpenChange={(o) => !o && setConfirmEmailSentTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check your email</DialogTitle>
            <DialogDescription>
              A confirmation email has been sent to <strong>{confirmEmailSentTo}</strong>. Click the link in
              the email to confirm this change. The link expires in 15 minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setConfirmEmailSentTo(null)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Bank Modal */}
      <Dialog open={showChangeBankModal} onOpenChange={setShowChangeBankModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Bank Account</DialogTitle>
            <DialogDescription>
              You'll be redirected to Stripe to update your bank account details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowChangeBankModal(false)}>Cancel</Button>
            <Button onClick={handleChangeBankAccount} disabled={changingBank}>
              {changingBank ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Open Stripe Portal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

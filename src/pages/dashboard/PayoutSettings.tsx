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
  const [selectedMethod, setSelectedMethod] = useState<"stripe" | "paypal" | "check">("stripe");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChangeBankModal, setShowChangeBankModal] = useState(false);
  const [changingBank, setChangingBank] = useState(false);
  const [savingCheck, setSavingCheck] = useState(false);

  useEffect(() => {
    if (org?.orgId) {
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
      fetchOrgSettings();
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

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status", { body: {} });
      if (!error && data?.charges_enabled) {
        toast.success("Your Stripe account is fully verified and ready for payouts!");
        await logAudit("stripe_verified", { summary: "Stripe account verified and active" });
      }
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
    } catch {
      fetchPayoutMethodAndSync();
    }
  };

  const handleStripeConnect = async () => {
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error || !data?.url) {
        toast.error("Failed to start Stripe onboarding. Please try again.");
        return;
      }
      await logAudit("stripe_onboarding_started", { summary: "Started Stripe Connect onboarding" });
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
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setChangingBank(false);
      setShowChangeBankModal(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!org?.orgId) return;
    setDisconnecting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("stripe-disconnect", {
        body: { confirm_email: userData.user?.email },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to disconnect Stripe account.");
        return;
      }
      toast.success("Stripe account disconnected. You can reconnect a new account anytime.");
      await logAudit("stripe_disconnected", { summary: "Stripe account disconnected by organizer" });
      setShowDisconnectModal(false);
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
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
    if (!org?.orgId) return;
    setSavingPaypal(true);
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
      // Also update org payout_method
      await supabase.from("organizations").update({ payout_method: "paypal" } as any).eq("id", org.orgId);
      setSelectedMethod("paypal");
      toast.success("PayPal email saved. Payouts will be processed manually every two weeks.");
      await logAudit(oldEmail ? "paypal_updated" : "paypal_added", {
        summary: oldEmail ? `PayPal email updated to ${paypalEmail}` : `PayPal email added: ${paypalEmail}`,
      });
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
    }
    setSavingPaypal(false);
  };

  const handleSaveCheck = async () => {
    if (!mailingAddress.trim()) {
      toast.error("Please enter a mailing address.");
      return;
    }
    if (!org?.orgId) return;
    setSavingCheck(true);
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
      fetchAuditLogs();
    }
    setSavingCheck(false);
  };

  const handleSelectStripe = async () => {
    if (!org?.orgId) return;
    await supabase.from("organizations").update({ payout_method: "stripe" } as any).eq("id", org.orgId);
    await supabase.from("organization_payout_methods").update({ preferred_method: "stripe" } as any).eq("organization_id", org.orgId);
    setSelectedMethod("stripe");
    toast.success("Payout method set to Stripe Connect (automatic).");
    await logAudit("preferred_method_changed", { summary: "Payout method changed to Stripe Connect" });
    fetchAuditLogs();
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
        <Card className={`border-2 ${selectedMethod === "stripe" ? "border-emerald-500/50" : "border-border"}`}>
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
                    <Button size="sm" onClick={handleSelectStripe}>Use Stripe Connect</Button>
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
                <Button onClick={handleStripeConnect} disabled={connectingStripe}>
                  {connectingStripe ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  {stripeStarted ? "Complete Stripe Setup" : "Connect Stripe Account"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ──── PayPal ──── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className={`border-2 ${selectedMethod === "paypal" ? "border-blue-500/50" : "border-border"}`}>
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
            <Button onClick={handleSavePaypal} disabled={savingPaypal || !paypalEmail.trim()}>
              {savingPaypal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Save PayPal & Set as Active
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──── Check ──── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className={`border-2 ${selectedMethod === "check" ? "border-amber-500/50" : "border-border"}`}>
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
                placeholder="123 Main St&#10;Suite 100&#10;Phoenix, AZ 85001"
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleSaveCheck} disabled={savingCheck || !mailingAddress.trim()}>
              {savingCheck ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
              Save Address & Set as Active
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Details</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm font-medium">{log.action.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.details?.summary || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disconnect Stripe Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Stripe Account</DialogTitle>
            <DialogDescription>
              This will disconnect your Stripe account. You won't receive automatic payouts until you reconnect or choose another method.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDisconnectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisconnectStripe} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Disconnect
            </Button>
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

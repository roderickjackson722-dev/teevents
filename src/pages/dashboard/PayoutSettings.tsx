import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Mail,
  Shield,
  Banknote,
  ExternalLink,
  History,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChangeBankModal, setShowChangeBankModal] = useState(false);
  const [changingBank, setChangingBank] = useState(false);

  useEffect(() => {
    if (org?.orgId) {
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
    }
  }, [org?.orgId]);

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

      // If Stripe is connected but last4 is missing, sync from Stripe
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

          // Re-fetch to get the updated last4
          const { data: refreshed } = await supabase
            .from("organization_payout_methods")
            .select("*")
            .eq("organization_id", org!.orgId)
            .single();
          if (refreshed) {
            setPayoutMethod(refreshed as unknown as PayoutMethod);
          }
        } catch {
          // Silent — status will show without last4
        }
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
      const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
        body: {},
      });
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
      // Use the Stripe account link with type 'account_onboarding' to let them update
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
          preferred_method: payoutMethod?.stripe_onboarding_complete ? payoutMethod.preferred_method : "paypal",
          is_verified: false,
        } as any,
        { onConflict: "organization_id" }
      );

    if (error) {
      toast.error("Failed to save PayPal email.");
    } else {
      toast.success("PayPal email saved successfully.");
      await logAudit(oldEmail ? "paypal_updated" : "paypal_added", {
        summary: oldEmail ? `PayPal email updated to ${paypalEmail}` : `PayPal email added: ${paypalEmail}`,
      });
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
    }
    setSavingPaypal(false);
  };

  const handleSetPreferred = async (method: "stripe" | "paypal") => {
    if (!org?.orgId) return;
    const { error } = await supabase
      .from("organization_payout_methods")
      .update({ preferred_method: method } as any)
      .eq("organization_id", org.orgId);
    if (!error) {
      toast.success(`Preferred method set to ${method === "stripe" ? "Stripe Connect" : "PayPal"}`);
      await logAudit("preferred_method_changed", {
        summary: `Preferred payout method changed to ${method}`,
      });
      fetchPayoutMethodAndSync();
      fetchAuditLogs();
    }
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
  const hasPaypal = !!payoutMethod?.paypal_email;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Payout Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure how you receive payments from your tournaments.
        </p>
      </div>

      {/* Status Banner */}
      {!stripeConnected && !hasPaypal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">No payout method configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              You need to connect a payout method before you can receive funds from registrations,
              donations, and other tournament payments.
            </p>
          </div>
        </motion.div>
      )}

      {/* How Payouts Work */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">How payouts work</p>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
          <li>Golfer payments are processed through Stripe at checkout</li>
          <li>A 5% platform fee is automatically deducted by Stripe</li>
          <li>Stripe deducts their processing fee (2.9% + $0.30)</li>
          <li>The remaining balance goes directly to your connected Stripe account</li>
          <li>TeeVents never holds your money — it goes straight to you</li>
          <li>You withdraw funds from your Stripe account to your bank on your schedule</li>
        </ul>
      </div>

      {/* Current Setup — always visible */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Current Setup</CardTitle>
            </div>
            <CardDescription>Your active payout account details</CardDescription>
          </CardHeader>
          <CardContent>
            {stripeConnected && payoutMethod?.preferred_method === "stripe" ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-foreground">Stripe Connect</p>
                      <p className="text-sm text-muted-foreground">
                        {payoutMethod.stripe_account_brand && payoutMethod.stripe_account_last4
                          ? `${payoutMethod.stripe_account_brand} •••• ${payoutMethod.stripe_account_last4}`
                          : payoutMethod.stripe_account_last4
                          ? `Bank account ending in •••• ${payoutMethod.stripe_account_last4}`
                          : "Connected — bank details syncing..."}
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">✅ Verified & Active</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : hasPaypal && payoutMethod?.preferred_method === "paypal" ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-semibold text-foreground">PayPal</p>
                    <p className="text-sm text-muted-foreground">{payoutMethod?.paypal_email}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Active</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg">
                <AlertCircle className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">No payout account connected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please add a Stripe or PayPal account below to receive funds from your tournaments.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stripe Connect Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className={`border-2 ${
            stripeConnected
              ? "border-emerald-500/50"
              : payoutMethod?.preferred_method === "stripe"
              ? "border-primary/30"
              : "border-border"
          }`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Stripe Connect</CardTitle>
                  <CardDescription>Recommended – automatic payouts to your bank</CardDescription>
                </div>
              </div>
              {stripeConnected && (
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              )}
              {stripeStarted && !stripeConnected && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                  Incomplete
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
                    <p><span className="font-medium text-foreground">Status:</span> Active & Verified</p>
                    {payoutMethod?.created_at && (
                      <p><span className="font-medium text-foreground">Connected since:</span> {new Date(payoutMethod.created_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowChangeBankModal(true)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Change Bank Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDisconnectModal(true)}
                  >
                    Disconnect Stripe
                  </Button>
                  {payoutMethod?.preferred_method !== "stripe" && (
                    <Button variant="outline" size="sm" onClick={() => handleSetPreferred("stripe")}>
                      Set as Primary
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  To change your bank account, you'll be redirected to Stripe's secure portal. TeeVents never sees or stores your banking details.
                </p>
              </>
            ) : (
              <>
                {stripeStarted && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Stripe setup incomplete</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please complete onboarding to start receiving payouts.
                    </p>
                  </div>
                )}
                <Button onClick={handleStripeConnect} disabled={connectingStripe} className="w-full sm:w-auto">
                  {connectingStripe && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {stripeStarted ? "Complete Stripe Setup" : "Connect with Stripe"}
                </Button>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to Stripe's secure portal to provide your legal name, date of birth,
                    address, and bank account information. Setup takes 2-3 minutes. TeeVents never sees your banking details.
                  </p>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { label: "No extra fees", desc: "No additional payout fees" },
                { label: "Direct deposits", desc: "Funds go straight to you" },
                { label: "Automatic", desc: "Splits happen at checkout" },
              ].map((b) => (
                <div key={b.label} className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-foreground">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* PayPal Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className={`border ${payoutMethod?.preferred_method === "paypal" ? "border-primary/30" : "border-border"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">PayPal</CardTitle>
                  <CardDescription>Backup option – manual payouts to your PayPal</CardDescription>
                </div>
              </div>
              {hasPaypal && (
                <Badge variant="outline" className="text-blue-600 border-blue-500/30">
                  Saved
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="paypal-email" className="text-xs text-muted-foreground mb-1.5 block">
                  PayPal Email Address
                </Label>
                <Input
                  id="paypal-email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSavePaypal} disabled={savingPaypal} variant="outline">
                  {savingPaypal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
                {hasPaypal && payoutMethod?.preferred_method !== "paypal" && (
                  <Button variant="outline" size="sm" onClick={() => handleSetPreferred("paypal")}>
                    Set as Primary
                  </Button>
                )}
              </div>
            </div>

            {hasPaypal && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Saved:</strong> {payoutMethod?.paypal_email}
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                PayPal payouts are processed manually within 5-7 business days. A 1% fee (min $0.50) applies per
                payout. Stripe Connect is recommended for faster, automatic payouts.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Feature</th>
                    <th className="text-left py-2 px-4 text-foreground font-medium">Stripe Connect</th>
                    <th className="text-left py-2 pl-4 text-foreground font-medium">PayPal</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Setup time", "2-3 minutes", "Enter email"],
                    ["Additional fees", "None", "1% or $0.50 min"],
                    ["Payout speed", "Direct at checkout", "3-5 business days"],
                    ["Bank details", "Handled by Stripe", "PayPal manages"],
                    ["Dashboard", "Built into TeeVents", "PayPal website"],
                  ].map(([feature, stripe, paypal]) => (
                    <tr key={feature} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium text-foreground">{feature}</td>
                      <td className="py-2 px-4">{stripe}</td>
                      <td className="py-2 pl-4">{paypal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
              <CardDescription>Track changes to your payout settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {log.action.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.details?.summary || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Support Contact */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Need help with payout settings?{" "}
          <a href="mailto:info@teevents.golf" className="text-primary underline">
            Contact us at info@teevents.golf
          </a>
        </p>
      </div>

      {/* Change Bank Account Modal */}
      <Dialog open={showChangeBankModal} onOpenChange={setShowChangeBankModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Bank Account</DialogTitle>
            <DialogDescription>
              To change your connected bank account, you will be redirected to Stripe's secure portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Current account</p>
              <p className="text-sm text-muted-foreground">
                {payoutMethod?.stripe_account_brand && `${payoutMethod.stripe_account_brand} `}
                {payoutMethod?.stripe_account_last4 ? `•••• ${payoutMethod.stripe_account_last4}` : "Connected"}
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-foreground font-medium mb-1">After updating:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                <li>Your new bank account will be verified by Stripe</li>
                <li>Payouts will automatically go to the new account</li>
                <li>No interruption to your tournament operations</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleChangeBankAccount} disabled={changingBank} className="flex-1">
                {changingBank && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Continue to Stripe
              </Button>
              <Button variant="outline" onClick={() => setShowChangeBankModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Stripe Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect Stripe Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Stripe account?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {payoutMethod?.stripe_account_last4 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Current account: {payoutMethod.stripe_account_brand && `${payoutMethod.stripe_account_brand} `}
                  •••• {payoutMethod.stripe_account_last4}
                </p>
              </div>
            )}

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-xs text-foreground font-medium mb-1">After disconnecting:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                <li>You will need to reconnect a Stripe account to receive payouts</li>
                <li>Any pending payments will be held until a new account is connected</li>
                <li>You can reconnect a different Stripe account at any time</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDisconnectStripe}
                disabled={disconnecting}
                className="flex-1"
              >
                {disconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Yes, Disconnect
              </Button>
              <Button variant="outline" onClick={() => setShowDisconnectModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

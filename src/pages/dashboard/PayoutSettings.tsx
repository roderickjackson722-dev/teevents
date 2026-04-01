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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PayoutMethod {
  id: string;
  organization_id: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_account_status: string;
  paypal_email: string | null;
  preferred_method: string;
  is_verified: boolean;
  verification_notes: string | null;
}

export default function PayoutSettings() {
  const { org, loading: orgLoading } = useOrgContext();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [savingPaypal, setSavingPaypal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");

  useEffect(() => {
    if (org?.orgId) fetchPayoutMethod();
  }, [org?.orgId]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get("stripe_connected") === "true") {
      toast.success("Stripe account connected! Checking status...");
      checkStripeStatus();
    }
    if (searchParams.get("refresh") === "true") {
      toast.info("Stripe onboarding was interrupted. Please try again.");
    }
  }, [searchParams]);

  const fetchPayoutMethod = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_payout_methods")
      .select("*")
      .eq("organization_id", org!.orgId)
      .single();

    if (data) {
      setPayoutMethod(data as unknown as PayoutMethod);
      if ((data as any).paypal_email) setPaypalEmail((data as any).paypal_email);
    }
    setLoading(false);
  };

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
        body: {},
      });
      if (!error && data?.charges_enabled) {
        toast.success("Your Stripe account is fully verified and ready for payouts!");
      }
      fetchPayoutMethod();
    } catch {
      fetchPayoutMethod();
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
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleSavePaypal = async () => {
    if (!paypalEmail || !paypalEmail.includes("@")) {
      toast.error("Please enter a valid PayPal email address.");
      return;
    }
    if (!org?.orgId) return;

    setSavingPaypal(true);
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
      fetchPayoutMethod();
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
      fetchPayoutMethod();
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
          <li>All golfer payments are collected securely by TeeVents</li>
          <li>A 4% platform fee is deducted from each transaction</li>
          <li>15% reserve is held and released 15 days after your event ends</li>
          <li>Payouts are processed automatically every other Monday</li>
          <li>You can also request manual withdrawals anytime ($25 minimum)</li>
        </ul>
      </div>

      {/* Stripe Connect Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={`border-2 ${stripeConnected ? "border-emerald-500/50" : payoutMethod?.preferred_method === "stripe" ? "border-primary/30" : "border-border"}`}>
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
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Stripe connected and verified</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payouts will be sent to your connected bank account automatically.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStripeConnect}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Update Account
                  </Button>
                  {payoutMethod?.preferred_method !== "stripe" && (
                    <Button variant="outline" size="sm" onClick={() => handleSetPreferred("stripe")}>
                      Set as Primary
                    </Button>
                  )}
                </div>
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
                    You'll be redirected to Stripe to securely provide your legal name, date of birth,
                    address, and bank account information. Setup takes 2-3 minutes.
                  </p>
                </div>
              </>
            )}

            {/* Stripe Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { label: "No extra fees", desc: "No additional payout fees" },
                { label: "1-3 business days", desc: "Fast payout delivery" },
                { label: "Automatic", desc: "Bi-weekly auto payouts" },
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
                PayPal payouts are processed manually within 5-7 business days.
                A 1% fee (min $0.50) applies per payout. Stripe Connect is recommended for faster, automatic payouts.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Active Method Summary */}
      {(stripeConnected || hasPaypal) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Active Payout Method</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {payoutMethod?.preferred_method === "stripe" && stripeConnected
                      ? "Stripe Connect (Express)"
                      : payoutMethod?.preferred_method === "paypal" && hasPaypal
                      ? "PayPal"
                      : stripeConnected
                      ? "Stripe Connect (Express)"
                      : "PayPal"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {payoutMethod?.preferred_method === "stripe" && stripeConnected
                      ? "Automatic bi-weekly payouts to your bank account"
                      : `PayPal: ${payoutMethod?.paypal_email}`}
                  </p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                  Primary
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Comparison Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
                    ["Payout speed", "1-3 business days", "3-5 business days"],
                    ["Auto payouts", "✅ Bi-weekly", "❌ Manual only"],
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
    </div>
  );
}

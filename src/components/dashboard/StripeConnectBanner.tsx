import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { withDashboardContext } from "@/lib/dashboardContext";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { takeStripeLoginReminder, shouldShowStripeLoginReminder } from "@/lib/stripeLoginReminder";

export default function StripeConnectBanner({ organizationId, loginReminder = false }: { organizationId: string; loginReminder?: boolean }) {
  const [params] = useSearchParams();
  const [needsConnection, setNeedsConnection] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("organization_payout_methods").select("stripe_account_id, stripe_onboarding_complete").eq("organization_id", organizationId).maybeSingle();
    if (!error) {
      const disconnected = !data?.stripe_account_id || !data.stripe_onboarding_complete;
      setNeedsConnection(disconnected);
      if (!disconnected || data?.stripe_account_id) setReminderOpen(false);
      // Consume only after a successful read. Never re-prompt any linked account.
      if (loginReminder && takeStripeLoginReminder()) setReminderOpen(shouldShowStripeLoginReminder(true, data?.stripe_account_id, false));
    }
  }, [organizationId, loginReminder]);
  useEffect(() => {
    setNeedsConnection(false);
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 30000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [refresh]);
  if (!needsConnection) return null;
  return <><div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-secondary bg-secondary/10 p-4">
    <CreditCard className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-sm leading-relaxed">Your Stripe account is not connected yet. Connect it to receive registration payments.</p>
    <Button asChild variant="outline" size="sm"><Link to={withDashboardContext("/dashboard/payout-settings", params)}>Money, Payouts</Link></Button>
  </div>
    <Dialog open={loginReminder && reminderOpen} onOpenChange={setReminderOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-2xl leading-tight">One step left: connect Stripe to receive payments.</DialogTitle>
          <DialogDescription className="pt-3 text-base leading-relaxed">Registration money goes straight into your Stripe account. TeeVents never holds it. Connect once and you are done.</DialogDescription>
        </DialogHeader>
        <Button asChild variant="secondary" className="text-primary" onClick={() => setReminderOpen(false)}><Link to={withDashboardContext("/dashboard/payout-settings", params)}>Connect Stripe</Link></Button>
        <Button variant="link" className="text-muted-foreground" onClick={() => setReminderOpen(false)}>I'll do this later.</Button>
      </DialogContent>
    </Dialog>
  </>;
}
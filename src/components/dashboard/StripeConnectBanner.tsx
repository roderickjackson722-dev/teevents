import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { withDashboardContext } from "@/lib/dashboardContext";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export default function StripeConnectBanner({ organizationId }: { organizationId: string }) {
  const [params] = useSearchParams();
  const [needsConnection, setNeedsConnection] = useState(false);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("organization_payout_methods").select("stripe_account_id, stripe_onboarding_complete").eq("organization_id", organizationId).maybeSingle();
    if (!error) setNeedsConnection(!data?.stripe_account_id || !data.stripe_onboarding_complete);
  }, [organizationId]);
  useEffect(() => {
    setNeedsConnection(false);
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 30000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [refresh]);
  if (!needsConnection) return null;
  return <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-secondary bg-secondary/10 p-4">
    <CreditCard className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-sm leading-relaxed">Your Stripe account is not connected yet. Connect it to receive registration payments.</p>
    <Button asChild variant="outline" size="sm"><Link to={withDashboardContext("/dashboard/payout-settings", params)}>Money, Payouts</Link></Button>
  </div>;
}
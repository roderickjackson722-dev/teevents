import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrgContext } from "@/hooks/useOrgContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FEE_RATES: Record<string, string> = {
  free: "5%",
  starter: "0%",
  premium: "0%",
};

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "$299",
    period: "per tournament",
    subtitle: "We build it for you",
    fee: "4% TeeVents fee + Stripe fees",
    highlighted: true,
    features: [
      "Everything in Base (unlimited players)",
      "We build your website for you",
      "All 6 templates + custom colors",
      "All 8 scoring formats",
      "Live leaderboard (Stroke Play & Best Ball)",
      "Sponsor management & recognition",
      "Photo gallery",
      "Custom domain support",
      "Budget tracking",
      "Volunteer coordination",
      "Printable signs & name badges",
      "Donations page",
      "SMS texting (500 messages)",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$999",
    period: "per tournament",
    fee: "$5 flat fee per transaction + Stripe fees",
    features: [
      "Everything in Starter",
      "White-glove consulting & setup",
      "Priority Stripe payout support",
      "$25,000 hole-in-one insurance (up to 72 golfers)",
      "Auction item included",
      "Merchandise store",
      "Auction & raffle management",
      "Surveys & analytics",
      "Priority support",
    ],
  },
];

const UpgradePlan = () => {
  const { org } = useOrgContext();
  const currentPlan = org?.plan || "base";
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const planIndex = (plan: string) => ["free", "starter", "premium"].indexOf(plan);

  const handleUpgrade = async (plan: string) => {

    setLoadingPlan(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first");

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan,
          email: session.user.email,
          promo_code: promoCode.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Upgrade Your Plan</h1>
        <p className="text-muted-foreground mt-1">
          Unlock more features and eliminate transaction fees.
        </p>
      </div>

      {/* Current plan badge */}
      <div className="mb-6 bg-card rounded-lg border border-border p-4 flex items-center gap-3">
        <Zap className="h-5 w-5 text-secondary" />
        <span className="text-sm text-muted-foreground">Current plan:</span>
        <span className="text-sm font-bold capitalize text-foreground">{currentPlan}</span>
        <span className="text-xs text-muted-foreground">
          ({FEE_RATES[currentPlan] || "5%"} transaction fee)
        </span>
      </div>

      {/* Promo code */}
      <div className="mb-8 flex items-center gap-3 max-w-md">
        <Input
          placeholder="Promo code (optional)"
          value={promoCode}
          onChange={e => setPromoCode(e.target.value)}
          className="uppercase"
        />
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan, i) => {
          const isCurrent = plan.key === currentPlan;
          const isUpgrade = planIndex(plan.key) > planIndex(currentPlan);

          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-xl p-6 border ${
                plan.highlighted && !isCurrent
                  ? "bg-primary text-primary-foreground border-secondary shadow-xl"
                  : isCurrent
                  ? "bg-secondary/5 border-secondary"
                  : "bg-card text-card-foreground border-border"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-4 bg-secondary text-secondary-foreground text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                  Current Plan
                </div>
              )}
              {plan.highlighted && !isCurrent && (
                <div className="absolute -top-3 right-4 bg-secondary text-secondary-foreground text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Popular
                </div>
              )}

              <h3 className="text-xl font-display font-bold mb-1 mt-1">{plan.name}</h3>
              {"subtitle" in plan && (plan as any).subtitle && (
                <p className={`text-xs font-semibold mb-1 ${plan.highlighted && !isCurrent ? "text-secondary" : "text-primary"}`}>
                  {(plan as any).subtitle}
                </p>
              )}
              <div className="mb-1">
                <span className="text-3xl font-display font-bold">{plan.price}</span>
                <span className={`text-xs ml-1.5 ${plan.highlighted && !isCurrent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`text-xs font-semibold mb-5 ${
                plan.highlighted && !isCurrent ? "text-secondary" : "text-primary"
              }`}>
                + {plan.fee}
              </p>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                      plan.highlighted && !isCurrent ? "text-secondary" : "text-primary"
                    }`} />
                    <span className={`text-xs ${
                      plan.highlighted && !isCurrent ? "text-primary-foreground/90" : "text-muted-foreground"
                    }`}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full text-xs">
                  Current Plan
                </Button>
              ) : isUpgrade ? (
                <Button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={!!loadingPlan}
                  className={`w-full text-xs ${
                    plan.highlighted
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      : ""
                  }`}
                >
                  {loadingPlan === plan.key ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upgrade to {plan.name}
                </Button>
              ) : (
                <Button variant="ghost" disabled className="w-full text-xs text-muted-foreground">
                  Included in your plan
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default UpgradePlan;

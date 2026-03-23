import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2, Crown, Shield, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    key: "base",
    name: "Base",
    price: "$249",
    period: "one-time",
    description: "Everything you need to run a professional tournament.",
    fee: "0% transaction fee",
    features: [
      "1 tournament",
      "Online registration & payments",
      "Tournament website (1 template)",
      "Player pairings tool",
      "Check-in & QR codes",
      "Live leaderboard (Stroke Play)",
      "Planning guide & checklist",
      "Email messaging",
      "Printable scorecards",
    ],
    cta: "Buy Base",
  },
  {
    key: "starter",
    name: "Starter",
    price: "$499",
    period: "per tournament",
    description: "We build your tournament platform for you.",
    fee: "0% transaction fee",
    highlighted: true,
    features: [
      "Everything in Base",
      "We build your website for you",
      "All 6 templates + custom colors",
      "All 8 scoring formats",
      "Custom domain support",
      "Sponsor management & recognition",
      "Budget tracking",
      "Photo gallery",
      "Volunteer coordination",
      "Printable signs & name badges",
      "Donations page",
      "SMS texting (500 messages)",
    ],
    cta: "Buy Starter",
  },
  {
    key: "premium",
    name: "Premium",
    price: "$1,999",
    period: "per tournament",
    description: "The ultimate tournament package with insurance & auction.",
    fee: "0% transaction fee",
    features: [
      "Everything in Base & Starter",
      "$25,000 hole-in-one insurance (up to 72 golfers)",
      "Auction item included",
      "Merchandise store",
      "Auction & raffle management",
      "Surveys & analytics",
      "Custom printable fonts & layouts",
      "Priority support",
      "No platform transaction fees",
    ],
    cta: "Buy Premium",
  },
];

const Pricing = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const { toast } = useToast();

  const handleCheckout = async (plan: string) => {
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, promo_code: promoCode.trim() || undefined },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not start checkout.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Layout>
      <SEO
        title="Pricing | TeeVents — Choose Your Tournament Package"
        description="Pick the perfect TeeVents plan for your golf tournament. Start with a full-featured free tier or unlock premium features. Simple, transparent pricing with no monthly subscriptions."
        path="/pricing"
      />

      {/* Hero */}
      <section className="bg-primary pt-24 pb-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              Choose Your Package
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed">
              No monthly subscriptions. No hidden fees. Pay per tournament and keep your revenue.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Promo Code */}
      <section className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-5 flex items-center justify-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Have a promo code?</label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="w-40 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono tracking-wider uppercase placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </section>

      {/* Plans */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-xl p-8 border flex flex-col ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground border-secondary shadow-2xl lg:scale-105"
                    : "bg-card text-card-foreground border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Most Popular
                  </div>
                )}

                <h3 className="text-2xl font-display font-bold mb-1">{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>

                <div className="mb-2">
                  <span className="text-4xl font-display font-bold">{plan.price}</span>
                  <span className={`text-sm ml-2 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-xs font-semibold mb-6 ${plan.highlighted ? "text-secondary" : "text-primary"}`}>
                  + {plan.fee}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-secondary" : "text-primary"}`} />
                      <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/90" : "text-foreground/80"}`}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={!!loadingPlan}
                  className={`w-full text-center px-6 py-3.5 rounded-md font-semibold text-sm tracking-wider uppercase transition-colors disabled:opacity-50 ${
                    plan.highlighted
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {loadingPlan === plan.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {plan.cta} <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="text-xs text-muted-foreground mb-6">
              Stripe's standard processing fee of 2.9% + $0.30 per transaction applies to all plans.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Secure Stripe Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm">Instant Account Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="text-sm">No Monthly Fees</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ-style CTA */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Not Sure Which Plan Is Right?
            </h2>
            <p className="text-primary-foreground/70 mb-8">
              Start with the Base plan and upgrade anytime. Or book a quick call and we'll help you decide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://calendly.com/teevents/teevents-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Book a Demo
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Pricing;

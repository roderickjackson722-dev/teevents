import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  MessageSquare,
  BarChart3,
  Users,
  Award,
  Globe,
  Check,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import HeroSection from "@/components/HeroSection";
import heroGolf from "@/assets/hero-golf.jpg";
import logoWhite from "@/assets/logo-white.png";

const features = [
  {
    icon: CreditCard,
    title: "Online Registration & Payments",
    description:
      "Accept all major US credit cards, Apple Pay, and Google Pay. Seamless checkout for golfers with automated confirmation emails.",
  },
  {
    icon: MessageSquare,
    title: "SMS Texting",
    description:
      "Send real-time or scheduled SMS updates to golfers, sponsors, and volunteers. Keep everyone informed on tournament day.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Budget Tracking",
    description:
      "Track revenue and expenses in a live budget sheet. Know exactly where your tournament financials stand at any moment.",
  },
  {
    icon: Users,
    title: "Player Pairings & 8 Scoring Formats",
    description:
      "Drag-and-drop pairings with support for Scramble, Best Ball, Stableford, Alternate Shot, Shamble, and Stroke Play. Generate scorecards and cart signs in seconds.",
  },
  {
    icon: Award,
    title: "Sponsor Recognition Tools",
    description:
      "Showcase sponsors with branded pages, logo placement, and digital signage. Maximize sponsor value and retention.",
  },
  {
    icon: Globe,
    title: "Custom Tournament Website",
    description:
      "Choose from 6 professional templates with custom colors, logos, countdown timers, and optional custom domain support — no design skills needed.",
  },
];

const additionalFeatures = [
  "Automated email confirmations",
  "QR code check-in for golfers",
  "Live leaderboard & scoring",
  "8 scoring formats (Scramble, Best Ball, Stableford & more)",
  "Auction & raffle management",
  "Photo gallery integration",
  "Volunteer coordination tools",
  "Custom branded merchandise store",
  "Post-event survey & analytics",
  "Printable scorecards, cart signs & badges",
  "Event countdown timer (4 styles)",
  "Hole-by-hole par customization",
];

const plans = [
  {
    name: "Base",
    price: "Free",
    period: "per tournament",
    description: "Everything you need to run a professional tournament.",
    fee: "5% transaction fee",
    features: [
      "1 tournament",
      "Online registration & payments",
      "Tournament website (1 template)",
      "Player pairings tool",
      "Check-in & QR codes",
      "Live leaderboard (Stroke Play & Best Ball)",
      "Planning guide & checklist",
      "Email messaging",
      "Custom domain support",
      "Sponsor management & recognition",
      "Budget tracking",
      "Photo gallery",
      "Printable scorecards, signs & badges",
      "Event countdown timer",
    ],
    cta: "Get Started",
    plan: "base",
  },
  {
    name: "Starter",
    price: "$499",
    period: "per tournament",
    description: "We build your tournament platform for you.",
    fee: "0% transaction fee",
    features: [
      "Everything in Base",
      "We build your website for you",
      "All 6 templates + custom colors",
      "All 8 scoring formats",
      "Donations page",
      "SMS texting (500 messages)",
      "No platform transaction fees",
    ],
    cta: "Get Started",
    plan: "starter",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$1,999",
    period: "per tournament",
    description: "The ultimate package with insurance & auction.",
    fee: "0% transaction fee",
    features: [
      "Everything in Base & Starter",
      "$25,000 hole-in-one insurance (up to 72 golfers)",
      "Auction item included",
      "Merchandise store",
      "Auction & raffle management",
      "Surveys & analytics",
      "Volunteer coordination",
      "Custom printable fonts & layouts",
      "Priority support",
      "No platform transaction fees",
    ],
    cta: "Get Started",
    plan: "premium",
  },
];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Platform = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const { toast } = useToast();

  const handleCheckout = async (plan: string) => {
    if (plan === "base") {
      // Free plan — go directly to signup
      window.location.href = "/get-started";
      return;
    }
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
      toast({ title: "Error", description: err.message || "Could not start checkout.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Layout>
      <SEO title="Platform" description="Discover the all-in-one golf tournament management platform — websites, registration, payments, pairings, scoring, and more." path="/platform" />
      {/* Hero */}
      <HeroSection backgroundImage={heroGolf} title="" height="h-screen">
        <img
          src={logoWhite}
          alt="TeeVents Golf"
          className="h-32 w-32 mx-auto mb-4 object-contain"
        />
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground text-shadow-hero leading-tight">
          The All-In-One Golf
          <br />
          Tournament Platform
        </h2>
        <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
          Everything nonprofits and corporations need to plan, manage, and
          execute world-class golf tournaments — all in one place.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="#pricing"
            onClick={(e) => { e.preventDefault(); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}
            className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
          >
            View Pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => handleCheckout("base")}
            className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </HeroSection>

      {/* Trust Bar */}
      <section className="bg-primary py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-primary-foreground/70">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">PCI Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">Mobile Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">Custom Domain Support</span>
            </div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">No Tech Skills Needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-golf-cream py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              Platform Features
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Everything You Need to Run
              <br />a Winning Tournament
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              From registration to the awards ceremony, our platform handles
              every detail so you can focus on your cause.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="bg-primary py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
              And So Much More
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {additionalFeatures.map((feat) => (
              <motion.div
                key={feat}
                variants={fadeUp}
                className="flex items-center gap-3 bg-primary-foreground/5 border border-primary-foreground/10 px-4 py-3 rounded-lg"
              >
                <Check className="h-4 w-4 text-secondary flex-shrink-0" />
                <span className="text-sm font-medium text-primary-foreground">
                  {feat}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-golf-cream py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              How It Works
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Up and Running in 3 Steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Sign Up Free",
                description:
                  "Create your free account in seconds. No credit card required. Upgrade anytime for more features and lower fees.",
              },
              {
                step: "02",
                title: "Build Your Site",
                description:
                  "Use our plug-and-play templates to create your branded tournament website. Add your logo, colors, and event details.",
              },
              {
                step: "03",
                title: "Launch & Manage",
                description:
                  "Open registration, collect payments, send updates via SMS, manage pairings, and track your budget — all from one dashboard.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="text-center"
              >
                <div className="text-6xl font-display font-bold text-secondary/30 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-background py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              Pricing
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free with a 5% transaction fee, or upgrade to eliminate fees entirely.
            </p>
            <p className="mt-3 text-sm text-muted-foreground/70">
              Stripe's standard processing fee of 2.9% + $0.30 per transaction applies to all plans.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`relative rounded-xl p-8 border ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground border-secondary shadow-2xl scale-105"
                    : "bg-card text-card-foreground border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-display font-bold mb-1">
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    plan.highlighted
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mb-2">
                  <span className="text-4xl font-display font-bold">
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ml-2 ${
                      plan.highlighted
                        ? "text-primary-foreground/60"
                        : "text-muted-foreground"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p className={`text-xs font-semibold mb-6 ${
                  plan.highlighted ? "text-secondary" : "text-primary"
                }`}>
                  + {plan.fee}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          plan.highlighted ? "text-secondary" : "text-primary"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          plan.highlighted
                            ? "text-primary-foreground/90"
                            : "text-foreground/80"
                        }`}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan.plan)}
                  disabled={loadingPlan === plan.plan}
                  className={`block w-full text-center px-6 py-3 rounded-md font-semibold text-sm tracking-wider uppercase transition-colors disabled:opacity-50 ${
                    plan.highlighted
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {loadingPlan === plan.plan ? "Loading..." : plan.cta}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Promo Code Input */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 flex items-center justify-center gap-3"
          >
            <label className="text-sm font-medium text-muted-foreground">Have a promo code?</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="w-40 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono tracking-wider uppercase placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-6">
              Ready to Elevate Your
              <br />
              Golf Tournament?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Join the growing number of nonprofits and corporations using
              TeeVents to run unforgettable golf events. Get started today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                View Plans
                <ArrowRight className="h-4 w-4" />
              </button>
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

export default Platform;

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Crown, Shield, Lock, CreditCard, Smartphone, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

const baseFeatures = [
  "Branded tournament website (tournament/your-slug)",
  "Online registration — individuals & teams",
  "Stripe payments (cards, Apple Pay, Google Pay)",
  "QR check-in from any phone or tablet",
  "Player roster, CSV import/export, handicap entry",
  "Manual drag-and-drop tee sheet",
  "Printables Studio — scorecards, cart signs, name badges",
  "Email registration confirmations & receipts",
  "Public listing on teevents.golf",
  "Invite 1 additional team member",
  "30-step interactive planning checklist",
  "Refund management with organizer approval",
  "Basic finances dashboard + CSV export",
  "Manual payouts by check on request",
];

const proFeatures = [
  "Unlimited players",
  "Live leaderboard — embed on your website",
  "Live scoring from player phones (no app)",
  "Sponsor portal with tiered packages & sign-up page",
  "Silent auction & 50/50 raffle with mobile bidding",
  "Donation page with progress bar & tax receipts",
  "Add-on store — mulligans, merch, dinner tickets",
  "Volunteer sign-up, scheduling & QR check-in",
  "Email + SMS broadcasts with templates",
  "Custom domain (golf.myclub.com)",
  "Flyer Studio — Canva-integrated templates",
  "Post-event surveys with aggregated results",
  "Photo gallery for players & sponsors",
  "Advanced auto-pairings (handicap, team, sponsor)",
  "Budget tracking — planned vs. actual",
  "Featured placement in public search",
  "Up to 5 team members",
  "Automatic Stripe Connect payouts (1–3 days)",
  "Priority email + chat support (2-hr response)",
];

const enterpriseFeatures = [
  "Everything in Pro",
  "Unlimited tournaments — no per-event fee",
  "White-label option (remove TeeVents branding)",
  "Dedicated account manager",
  "Custom integrations — API, webhooks, CRM sync",
  "SLA guarantee — 99.9% uptime, 1-hour response",
  "Volume pricing for high-volume operators",
];

const Pricing = () => {
  return (
    <Layout>
      <SEO
        title="Pricing | TeeVents — Start Free, Upgrade When You Need More"
        description="Start for free. No credit card required. Upgrade to Pro for $399 per tournament to unlock live leaderboard, sponsor portal, auction, and automatic payouts."
        path="/pricing"
      />

      {/* Hero */}
      <section className="bg-primary pt-24 pb-14">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              Start for free. Upgrade when you need more.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed">
              No credit card required. No time limit on the free tier.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* BASE */}
            <PlanCard
              name="Base"
              tagline="First-time organizers & small events"
              price="$0"
              period="forever"
              fee="5% platform fee per transaction"
              features={baseFeatures}
              ctaLabel="Get Started"
              ctaTo="/get-started?plan=free"
              variant="default"
              footnote="1 active tournament • Up to 72 players"
            />

            {/* PRO */}
            <PlanCard
              name="Pro"
              tagline="Fundraisers, clubs & recurring events"
              price="$399"
              period="per tournament"
              fee="5% platform fee per transaction"
              features={proFeatures}
              ctaLabel="Upgrade to Pro"
              ctaTo="/get-started?plan=pro"
              variant="highlighted"
              badge="Most Popular"
              footnote="Unlimited players • Pay per tournament you upgrade"
            />

            {/* ENTERPRISE */}
            <PlanCard
              name="Enterprise"
              tagline="5+ tournaments per year • White-label"
              price="Custom"
              period="quote"
              fee="5% platform fee per transaction"
              features={enterpriseFeatures}
              ctaLabel="Contact Sales"
              ctaTo="/enterprise-pricing"
              variant="enterprise"
              footnote="Volume discounts available"
            />
          </div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-xl border-2 border-secondary bg-secondary/5 p-6 md:p-8 max-w-3xl mx-auto"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary/20 text-secondary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">
                  How Pro works
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Pro is a one-time <span className="font-semibold">$399 unlock per tournament</span> — not a subscription. Create your tournament for free, then upgrade only the events where you need live leaderboard, sponsor portal, auction, and the rest. The 5% platform fee is the same on every plan; Stripe automatically splits payments at checkout so TeeVents never holds your money.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Secure Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 rounded-xl border border-border bg-card p-8 md:p-10"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
                <Lock className="h-3.5 w-3.5" /> Secure Payment Processing
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
                Your golfers pay securely — every time
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Every TeeVents tournament uses Stripe — the same payment platform trusted by Amazon, Google, and millions of businesses worldwide. Your registrants' payment data is never stored on our servers.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Shield, title: "PCI Level 1 Certified", desc: "The highest level of payment security compliance" },
                { icon: Lock, title: "256-bit SSL Encryption", desc: "Bank-level encryption on every transaction" },
                { icon: Smartphone, title: "Apple Pay & Google Pay", desc: "One-tap checkout your golfers already trust" },
                { icon: CreditCard, title: "Fraud Protection", desc: "Built-in Stripe Radar fraud detection on all payments" },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mb-3">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-center text-xs text-muted-foreground mt-8 max-w-3xl mx-auto">
            All plans charge a 5% TeeVents platform fee per transaction + Stripe's standard processing fee. Payments split automatically at checkout — TeeVents never holds your money. Stripe sends net proceeds directly to your connected account.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary py-14">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Not sure which plan is right?
            </h2>
            <p className="text-primary-foreground/70 mb-8">
              Start with Base and upgrade individual tournaments to Pro any time. Or book a quick call and we'll help you decide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Book a Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

interface PlanCardProps {
  name: string;
  tagline: string;
  price: string;
  period: string;
  fee: string;
  features: string[];
  ctaLabel: string;
  ctaTo: string;
  variant: "default" | "highlighted" | "enterprise";
  badge?: string;
  footnote?: string;
}

function PlanCard({
  name, tagline, price, period, fee, features, ctaLabel, ctaTo, variant, badge, footnote,
}: PlanCardProps) {
  const isHighlighted = variant === "highlighted";
  const isEnterprise = variant === "enterprise";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-xl p-8 border flex flex-col ${
        isHighlighted
          ? "bg-primary text-primary-foreground border-secondary shadow-2xl lg:scale-105"
          : isEnterprise
          ? "bg-card text-card-foreground border-border"
          : "bg-card text-card-foreground border-border"
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full flex items-center gap-1 whitespace-nowrap">
          <Crown className="h-3 w-3" /> {badge}
        </div>
      )}

      <h3 className="text-2xl font-display font-bold mb-1">{name}</h3>
      <p className={`text-sm mb-4 ${isHighlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {tagline}
      </p>

      <div className="mb-2">
        <span className="text-4xl font-display font-bold">{price}</span>
        <span className={`text-sm ml-2 ${isHighlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {period}
        </span>
      </div>
      <p className={`text-xs font-semibold mb-6 ${isHighlighted ? "text-secondary" : "text-primary"}`}>
        {fee}
      </p>

      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-3">
            <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isHighlighted ? "text-secondary" : "text-primary"}`} />
            <span className={`text-sm ${isHighlighted ? "text-primary-foreground/90" : "text-foreground/80"}`}>
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {footnote && (
        <p className={`text-xs mb-4 ${isHighlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {footnote}
        </p>
      )}

      <Link
        to={ctaTo}
        className={`w-full text-center px-6 py-3.5 rounded-md font-semibold text-sm tracking-wider uppercase transition-colors ${
          isHighlighted
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {ctaLabel} <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </motion.div>
  );
}

export default Pricing;

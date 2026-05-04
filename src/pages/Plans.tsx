import { motion } from "framer-motion";
import {
  Check, ArrowRight, Crown, Shield, Lock, CreditCard, Smartphone, Sparkles,
  Globe, Users, BarChart3, Award, MessageSquare, QrCode, Printer, Trophy,
  DollarSign, Tag, Palette, Building2,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

/* ─── Core Modules ─── */
const coreModules = [
  { icon: Globe, title: "Custom Tournament Website", desc: "Branded site with built-in tabs, mobile-responsive, custom domain support — no coding required." },
  { icon: CreditCard, title: "Online Registration", desc: "Stripe-powered checkout with Apple Pay & Google Pay, add-ons, promo codes, and automated confirmations." },
  { icon: Users, title: "Player Management & Pairings", desc: "Drag-and-drop pairings, CSV import, hole assignments, and handicap tracking." },
  { icon: BarChart3, title: "Real-Time Budget Tracker", desc: "Revenue and expense line items by category with live profit/loss summary." },
  { icon: Award, title: "Sponsor Management", desc: "Tiered sponsor levels, logo uploads, payment tracking, and leaderboard logo rotation." },
  { icon: MessageSquare, title: "SMS & Email Messaging", desc: "Bulk email and SMS to golfers, sponsors, and volunteers with scheduling and delivery tracking." },
];

/* ─── Scoring Steps ─── */
const scoringSteps = [
  { step: "1", icon: Printer, title: "Print Scorecards", desc: "Generate professional scorecards with embedded QR codes — one click from the Printables dashboard." },
  { step: "2", icon: QrCode, title: "Player Scans QR", desc: "Each QR is unique to the player and links directly to their group's scoring page." },
  { step: "3", icon: Smartphone, title: "Score on Any Device", desc: "Players enter scores hole-by-hole on their phone. Supports 8 formats including Scramble and Best Ball." },
  { step: "4", icon: Trophy, title: "Live Leaderboard", desc: "Scores update in real-time on the tournament leaderboard with sponsor logo rotations." },
];

/* ─── Why Choose Us ─── */
const whyChooseUs = [
  { icon: DollarSign, title: "No monthly subscriptions", desc: "Start free. Pay $399 only when you upgrade a tournament." },
  { icon: Palette, title: "White-label branding", desc: "Your tournament, your colors, your custom domain — never our logo." },
  { icon: Shield, title: "PCI Level 1 payments", desc: "Bank-level Stripe security on every transaction. We never hold your money." },
  { icon: Tag, title: "Built for golf", desc: "8 scoring formats, sponsor portals, auctions, and donations — purpose-built." },
  { icon: Building2, title: "Three payout methods", desc: "Stripe Connect (auto), PayPal (bi-weekly), or check on request." },
  { icon: Users, title: "Real human support", desc: "Talk to golf-industry pros, not chatbots. Priority response on Pro and Enterprise." },
];

/* ─── Pricing Features ─── */
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
  "Automatic Stripe Connect payouts (T+2 days standard; new accounts may have a 2–7 day Stripe review on first payouts)",
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

/* ─── Component ─── */
const Plans = () => {
  return (
    <Layout>
      <SEO
        title="Plans & Pricing | TeeVents — Start Free, Upgrade When You Need More"
        description="Six powerful tools, one dashboard. Start free with no credit card. Upgrade to Pro for $399 per tournament to unlock live leaderboard, sponsor portal, auction, and automatic payouts."
        path="/plans"
      />

      {/* 1. HERO */}
      <section className="bg-primary pt-24 pb-14">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              Start for free. Upgrade when you need more.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed">
              No credit card required. No time limit on the free tier.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                See Pricing
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. CORE MODULES */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Six Powerful Tools, One Dashboard
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to plan, promote, and run your tournament — without juggling spreadsheets and separate tools.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreModules.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 text-primary mb-4">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PLAYER EXPERIENCE — Scan. Score. Done. */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-3">Player Experience</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Scan. Score. Done.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Live scoring straight from a player's phone — no apps to download, no logins, no friction.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {scoringSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-xl bg-card border border-border p-6"
              >
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center">
                  {s.step}
                </div>
                <s.icon className="h-7 w-7 text-primary mb-3" />
                <h3 className="text-base font-display font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. WHY CHOOSE US */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Why Organizers Choose TeeVents
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for golf, priced for organizers, trusted by clubs and nonprofits across the country.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChooseUs.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary/15 text-secondary">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRICING */}
      <section id="pricing" className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden fees. No long-term contracts. Choose the plan that fits your event.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
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

          {/* How Pro Works */}
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
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
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
            All plans charge a 5% TeeVents platform fee per transaction + Stripe's standard processing fee. Payments split automatically at checkout — TeeVents never holds your money. Net proceeds are sent to your Stripe account immediately. For brand-new Stripe Connect accounts, Stripe applies a standard 2–7 business day review before funds become available to withdraw. <a href="/help/understanding-payout-timing" className="text-primary underline">Learn more</a>.
          </p>
        </div>
      </section>

      {/* 6. FINAL CTA */}
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-xl p-8 border flex flex-col ${
        isHighlighted
          ? "bg-primary text-primary-foreground border-secondary shadow-2xl lg:scale-105"
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

export default Plans;

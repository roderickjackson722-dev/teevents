import { motion } from "framer-motion";
import {
  Check, ArrowRight, Shield, Lock, CreditCard, Smartphone, Sparkles,
  Globe, Users, BarChart3, Award, MessageSquare, Trophy,
  Package, Gavel, LayoutTemplate, BadgeDollarSign, Megaphone, GraduationCap, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

/* ─── Core pricing options ─── */
const planCards = [
  {
    icon: Sparkles,
    title: "No Cost To Start",
    price: "$0",
    unit: "to start",
    badge: "Most popular",
    highlight: false,
    desc: "5% platform fee per paid transaction. No upfront cost — you only pay when you get paid.",
    features: [
      "Full tournament management platform",
      "Branded tournament website",
      "Online registration & Stripe payments",
      "QR check-in from any phone",
      "Pairings, tee sheets & drag-and-drop scheduling",
      "Player management, waitlist & CSV import",
      "Volunteer coordination & shift scheduling",
      "Printables — scorecards, cart signs, name badges",
      "Email confirmations & basic reporting",
      "Financial dashboard & Stripe payouts",
      "Public search listing on teevents.golf",
      "10 manual entries included",
      "No monthly subscription",
    ],
    exclusions: [
      "Live leaderboard (add-on — $199/event)",
      "Mobile scoring (add-on — $199/event)",
    ],
    cta: "Select No Cost To Start",
    ctaTo: "/checkout/no-cost-to-start",
    note: "Stripe processing fees apply.",
  },
  {
    icon: BadgeDollarSign,
    title: "Flat-Rate Pro",
    price: "$399",
    unit: "per event",
    badge: "Best value",
    highlight: true,
    desc: "Pay once per tournament and we drop the 5% platform fee on every transaction.",
    features: [
      "No 5% platform fee",
      "Unlimited manual entries",
      "Unlimited transactions",
      "One-time, per event",
    ],
    exclusions: [],
    cta: "Select Flat-Rate Pro",
    ctaTo: "/checkout/flat-rate-pro",
    note: "Purchased per tournament.",
  },
  {
    icon: GraduationCap,
    title: "College Golf Scoring & Leaderboard",
    price: "from $199",
    unit: "per event",
    badge: "New",
    highlight: false,
    desc: "Live mobile scoring with no app download, QR scoring codes, monitor leaderboard display, custom printables and pairings templates for collegiate events.",
    features: [
      "Live mobile scoring — no app download",
      "QR scoring codes & leaderboard URL",
      "Team rosters & flexible counting scores",
      "Custom printables & pairings templates",
    ],
    exclusions: [],
    cta: "Learn More",
    ctaTo: "/college-golf-scoring",
    note: "Full details and pricing on the next page.",
  },
];

/* ─── Paid add-ons (per event, one-time) ─── */
const addons = [
  {
    icon: BarChart3,
    title: "Live Leaderboard & Mobile Scoring",
    price: 199,
    to: "/checkout/live-leaderboard",
    desc: "Real-time public leaderboard plus scoring from any phone for every group.",
  },
  {
    icon: Users,
    title: "Unlimited Manual Entries",
    price: 199,
    to: "/checkout/unlimited-manual-entries",
    desc: "Remove the 10-entry cap. Add unlimited manual player registrations, sponsors, and side-event entries.",
  },
  {
    icon: Gavel,
    title: "Auction & Raffle",
    price: 199,
    to: "/checkout/auction-raffle",
    desc: "Silent auction and 50/50 raffle with mobile bidding and auto-draw at close.",
  },
  {
    icon: LayoutTemplate,
    title: "Custom Event Page Build Out",
    price: 199,
    to: "/checkout/custom-event-page",
    desc: "Our team builds out a fully customized event page tailored to your tournament — layout, colors, content placement, and branding.",
  },
  {
    icon: Megaphone,
    title: "Branding Removal + Digital Sponsor",
    price: 499,
    to: "/checkout/branding-removal",
    desc: "TeeVents branding hidden, custom \"Presented by\" logo and a turnkey digital sponsor package you can resell for $5k–$10k.",
  },
  {
    icon: Globe,
    title: "Custom Domain",
    price: 99,
    to: "/checkout/custom-domain",
    desc: "Brand your tournament URL (e.g. golf.yourclub.com) instead of a teevents.golf link.",
  },
];



/* ─── Fee reference table ─── */
const feeRows = [
  { amount: 50, platform: 2.5, stripe: 1.75 },
  { amount: 100, platform: 5.0, stripe: 3.2 },
  { amount: 150, platform: 7.5, stripe: 4.65 },
  { amount: 200, platform: 10.0, stripe: 6.1 },
  { amount: 250, platform: 12.5, stripe: 7.55 },
];

/* ─── Why Choose Us ─── */
const whyChooseUs = [
  { icon: Package, title: "One platform, end-to-end", desc: "Plan, promote, register, score, pay out, and follow up — all from one dashboard." },
  { icon: Trophy, title: "Built for golf", desc: "8 scoring formats, sponsor portals, pairings, and printables — nothing generic." },
  { icon: Shield, title: "PCI Level 1 payments", desc: "Bank-level Stripe security. We never hold your money." },
  { icon: BarChart3, title: "No monthly subscriptions", desc: "Start free. Buy add-ons only for the tournaments that need them." },
  { icon: MessageSquare, title: "Real human support", desc: "Talk to golf-industry pros, not chatbots — before, during, and after your event." },
  { icon: Award, title: "Fundraising friendly", desc: "Nonprofit-ready receipts, donation totals, and organizer-controlled refunds." },
];

const Plans = () => {
  return (
    <Layout>
      <SEO
        title="Simple, Transparent Pricing | TeeVents"
        description="The complete golf tournament management platform is free. Add paid add-ons per event only when you need them. No monthly fees, no hidden charges."
        path="/plans"
      />

      {/* 1. HERO */}
      <section className="bg-primary pt-24 pb-14">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
              Start for free. Pay only when you get paid. No monthly fees, no hidden charges, no setup costs.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                See What's Included
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Why organizers choose TeeVents</h2>
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

      {/* 2. PRICING */}
      <section id="pricing" className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Core options */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {planCards.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card rounded-2xl p-6 flex flex-col ${
                  p.highlight ? "border-2 border-secondary shadow-lg" : "border border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-secondary/15 text-secondary">
                    <p.icon className="h-4 w-4" />
                  </div>
                  {p.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                      {p.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-display font-bold text-foreground">{p.title}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-4xl font-display font-bold text-foreground">{p.price}</span>
                  <span className="text-xs ml-1.5 text-muted-foreground">{p.unit}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                <ul className="space-y-2 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {p.exclusions.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {p.exclusions.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto">
                  <Link
                    to={p.ctaTo}
                    className={`block w-full text-center px-5 py-3 rounded-md font-semibold text-xs tracking-wider uppercase transition-colors ${
                      p.highlight
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {p.cta}
                  </Link>
                  <p className="text-[11px] text-muted-foreground mt-2 text-center">{p.note}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add-on features */}
          <div className="mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-8 max-w-4xl mx-auto"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-display font-bold text-foreground">Add-on Features</h3>
                <p className="text-sm text-muted-foreground">
                  One-time, per event. Select an add-on to go straight to checkout.
                </p>
              </div>

              <ul className="divide-y divide-border">
                {addons.map((a) => (
                  <li key={a.title} className="py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-secondary/15 text-secondary">
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-semibold text-foreground text-sm">{a.title}</p>
                        <p className="font-display font-bold text-foreground whitespace-nowrap">${a.price}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{a.desc}</p>
                      <Link
                        to={a.to}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-1 hover:underline"
                      >
                        Select &amp; check out <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-lg border-2 border-secondary bg-secondary/10 p-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="font-display font-bold text-foreground">College Golf Scoring &amp; Leaderboard</p>
                  <p className="font-display font-bold text-secondary text-xl">from $199</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Live mobile scoring, QR codes, monitor leaderboard display, custom printables and pairings
                  templates.
                </p>
                <Link
                  to="/college-golf-scoring"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-2 hover:underline"
                >
                  Learn More <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          </div>


          {/* Fee reference table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-6 md:p-8 max-w-3xl mx-auto"
          >
            <h3 className="text-xl md:text-2xl font-display font-bold text-foreground text-center mb-2">
              What fees will my golfers actually pay?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Combined 5% platform fee + Stripe's 2.9% + $0.30 per transaction.
              Total fees on a $100 registration: <span className="font-semibold text-foreground">$8.20 (8.2%)</span>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Registration</th>
                    <th className="py-2 pr-3">Platform (5%)</th>
                    <th className="py-2 pr-3">Stripe</th>
                    <th className="py-2 pr-3">Total fees</th>
                    <th className="py-2">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {feeRows.map((r) => {
                    const total = r.platform + r.stripe;
                    const eff = ((total / r.amount) * 100).toFixed(2);
                    return (
                      <tr key={r.amount} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3 font-semibold text-foreground">${r.amount}</td>
                        <td className="py-2.5 pr-3 text-foreground/80">${r.platform.toFixed(2)}</td>
                        <td className="py-2.5 pr-3 text-foreground/80">${r.stripe.toFixed(2)}</td>
                        <td className="py-2.5 pr-3 font-semibold text-foreground">${total.toFixed(2)}</td>
                        <td className="py-2.5 text-muted-foreground">{eff}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Fees can be absorbed by the organizer or passed to the golfer at checkout — your choice, per tournament.
            </p>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 rounded-xl border border-border bg-card p-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h4 className="font-display font-bold text-foreground">Running 5+ tournaments per year?</h4>
              <p className="text-sm text-muted-foreground">
                Enterprise plans include unlimited events, white-label branding, dedicated account manager, and volume pricing.
              </p>
            </div>
            <Link
              to="/enterprise-pricing"
              className="inline-flex items-center gap-2 border border-primary text-primary px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
            >
              Contact Enterprise <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Golf Leagues */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 rounded-xl border-2 border-primary/40 bg-card p-6 max-w-3xl mx-auto"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">
                  <Trophy className="h-3.5 w-3.5" /> Golf Leagues
                </div>
                <h4 className="font-display font-bold text-foreground text-lg">Run a season-long golf league</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time scoring, live leaderboards, skins, handicaps, and season stats.
                </p>
                <p className="text-sm mt-2">
                  <strong>$399/year</strong> flat fee for up to 24 events (unlimited golfers). Your year starts on the date of your first league event, and renews one year later.
                </p>
              </div>
              <Link
                to="/golf-leagues"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold text-sm hover:opacity-90 transition whitespace-nowrap"
              >
                Learn More <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* Secure Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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
                Every TeeVents tournament uses Stripe — the same payment platform trusted by Amazon, Google, and millions of businesses worldwide.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Shield, title: "PCI Level 1 Certified", desc: "The highest level of payment security compliance" },
                { icon: Lock, title: "256-bit SSL Encryption", desc: "Bank-level encryption on every transaction" },
                { icon: Smartphone, title: "Apple Pay & Google Pay", desc: "One-tap checkout your golfers already trust" },
                { icon: CreditCard, title: "Fraud Protection", desc: "Built-in Stripe Radar on every payment" },
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary py-14">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Ready to run a professional tournament?
            </h2>
            <p className="text-primary-foreground/70 mb-8">
              Get started free. Add live leaderboard, mobile scoring, auction, or SMS blasts only if and when you need them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Start a Tournament for Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/request-sample"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Request a Sample
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Plans;

import { motion } from "framer-motion";
import {
  Check, ArrowRight, Shield, Lock, CreditCard, Smartphone, Sparkles,
  Globe, Users, BarChart3, Award, MessageSquare, Trophy,
  Package, Phone, Gavel, LayoutTemplate,

} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

/* ─── Free tier features ─── */
const freeFeatures = [
  "Full tournament management platform",
  "Branded tournament website",
  "Online registration & Stripe payments",
  "Live leaderboard (included)",
  "QR check-in & scoring from any phone",
  "Pairings, tee sheets & drag-and-drop scheduling",
  "Player management, waitlist & CSV import",
  "Volunteer coordination & shift scheduling",
  "Printables — scorecards, cart signs, name badges",
  "Email confirmations & basic reporting",
  "Financial dashboard & Stripe payouts",
  "Public search listing on teevents.golf",
  "10 free manual entries per tournament",
];

/* ─── Paid add-ons (per event, one-time) ─── */
const addons = [
  {
    icon: Globe,
    title: "Custom Domain",
    price: 99,
    desc: "Brand your tournament URL (e.g. golf.yourclub.com) instead of a teevents.golf link.",
  },
  {
    icon: Users,
    title: "Unlimited Manual Entries",
    price: 149,
    desc: "Remove the 10-entry cap. Add unlimited manual player registrations, sponsors, and side-event entries.",
  },
  {
    icon: Gavel,
    title: "Auction & Raffle",
    price: 149,
    desc: "Silent auction and 50/50 raffle with mobile bidding and auto-draw at close.",
  },
  {
    icon: LayoutTemplate,
    title: "Custom Event Page Build Out",
    price: 99,
    desc: "Our team will work with you to build out a fully customized event page tailored to your tournament. This includes custom layout adjustments, color coordination, content placement, and branding to make your event page stand out. We'll handle the setup so you don't have to.",
  },

  {
    icon: Phone,
    title: "Priority Support",
    price: 99,
    desc: "Phone support, dedicated account manager, and a 2-hour response SLA on tournament week.",
  },
];

const BUNDLE_TOTAL = addons.reduce((s, a) => s + a.price, 0); // 595
const BUNDLE_PRICE = 399;
const BUNDLE_SAVINGS = BUNDLE_TOTAL - BUNDLE_PRICE;

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
  { icon: MessageSquare, title: "Real human support", desc: "Talk to golf-industry pros, not chatbots. Priority support add-on available." },
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
          {/* Free tier card */}
          <div className="grid md:grid-cols-2 gap-8 items-start mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border-2 border-primary p-8 shadow-lg"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="h-3.5 w-3.5" /> Free forever
              </div>
              <h3 className="text-3xl font-display font-bold text-foreground mb-1">Free</h3>
              <div className="mb-4">
                <span className="text-5xl font-display font-bold text-foreground">$0</span>
                <span className="text-sm ml-2 text-muted-foreground">/ tournament</span>
              </div>
              <p className="text-xs font-semibold text-primary mb-6">
                5% platform fee per paid transaction + Stripe processing
              </p>

              <ul className="space-y-2.5 mb-8">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground/80">
                    <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/get-started"
                className="block w-full text-center bg-primary text-primary-foreground px-6 py-3.5 rounded-md font-semibold text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </motion.div>

            {/* Add-ons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-8"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-display font-bold text-foreground">Add-on Features</h3>
                <p className="text-sm text-muted-foreground">One-time, per event. Unlock only what you need.</p>
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
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-lg border-2 border-secondary bg-secondary/10 p-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="font-display font-bold text-foreground">Bundle — all add-ons</p>
                  <p className="font-display font-bold text-secondary text-xl">${BUNDLE_PRICE}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Save ${BUNDLE_SAVINGS} vs. buying individually (${BUNDLE_TOTAL} total).
                </p>
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                Purchase add-ons from your dashboard once you've created a tournament.
              </p>
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
                  <strong>$199/year</strong> flat fee (unlimited golfers) or <strong>$10/golfer/year</strong>.
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
              Get started free. Add on custom domain, auction, SMS blasts, or priority support only if and when you need them.
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

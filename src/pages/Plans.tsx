import { motion } from "framer-motion";
import {
  Check, ArrowRight, Shield, Lock, CreditCard, Smartphone, Sparkles,
  Globe, Users, BarChart3, Award, MessageSquare, Trophy,
  Package, Gavel, LayoutTemplate, Megaphone, BadgeDollarSign, Building2, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import EnterpriseDemo from "@/components/pricing/EnterpriseDemo";
import EnterpriseInquiryDialog from "@/components/pricing/EnterpriseInquiryDialog";

/* ─── Core pricing options ─── */
const planCards = [
  {
    icon: Sparkles,
    title: "No Cost to Start",
    price: "$0",
    unit: "to start",
    badge: null,
    highlight: false,
    desc: "Free for you. A 5% service fee is included in each player's registration total, so you keep 100% of your event revenue.",
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
    exclusions: [],
    cta: "Select No Cost to Start",
    ctaTo: "/signup?plan=no-cost",
    note: "No monthly subscription.",
  },
  {
    icon: BadgeDollarSign,
    title: "Per-Event",
    price: "$150",
    unit: "per tournament",
    badge: "Predictable pricing",
    highlight: true,
    desc: "Pay once per event and keep 100% of your registration revenue. No transaction fees.",
    features: [
      'Everything in "No Cost to Start"',
      "No 5% platform fee",
      "Unlimited manual entries",
      "Unlimited transactions",
      "One-time, per event",
    ],
    exclusions: [],
    cta: "Select Per-Event",
    ctaTo: "/signup?plan=per-event",
    note: "Standard card processing fees still apply.",
  },
  {
    icon: Trophy,
    title: "Per-League",
    price: "$399",
    unit: "per league",
    badge: "Season-long",
    highlight: false,
    desc: "Perfect for season-long leagues with multiple events.",
    features: [
      'Everything in "Per-Event"',
      "Covers the entire league season",
      "League standings & leaderboards",
      "Season-long reporting",
    ],
    exclusions: [],
    cta: "Select Per-League",
    ctaTo: "/signup?plan=per-league",
    note: "One league, one season-long price.",
  },
];

/* ─── Paid add-ons (per event, one-time) ─── */
const addons = [
  {
    icon: BarChart3,
    title: "Live Leaderboard + Mobile Scoring",
    price: 99,
    to: "/checkout/live-leaderboard",
    desc: "Combined package: real-time public leaderboard with mobile scoring from any phone — no app download required.",
  },
  {
    icon: Users,
    title: "Unlimited Manual Entries",
    price: 99,
    to: "/checkout/unlimited-manual-entries",
    desc: "Remove the 10-entry cap; add unlimited manual player registrations, sponsors, and side-event entries.",
  },
  {
    icon: Gavel,
    title: "Auction Dashboard",
    price: 99,
    to: "/checkout/auction-raffle",
    desc: "Mobile bidding dashboard with auto-draw at close and real-time bid tracking.",
  },
  {
    icon: LayoutTemplate,
    title: "Full-Service Page Build Out",
    price: 99,
    to: "/checkout/custom-event-page",
    desc: "We design a custom event page for you — layout, colors, content, and branding so everything is ready to go.",
  },
  {
    icon: Megaphone,
    title: "Branding Removal + Digital Sponsor",
    price: 99,
    to: "/checkout/branding-removal",
    desc: "TeeVents branding hidden; custom \"Presented by\" logo and a turnkey digital sponsor package you can resell for $10k.",
  },
  {
    icon: Globe,
    title: "Custom Domain",
    price: 99,
    to: "/checkout/custom-domain",
    desc: "Brand your tournament URL (e.g., golfyourclub.com) instead of a teevents.golf link.",
  },
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
              Choose the pricing that fits your event — start at $0, pay once per event, or run unlimited events with Enterprise.
            </p>
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
           <div className="grid gap-6 mb-16 lg:grid-cols-3">
            {planCards.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                 className={`bg-card rounded-lg p-6 flex flex-col ${
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
                   All $99 each, one-time per event. Select an add-on to go straight to checkout.
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
            </motion.div>
          </div>


           {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
             className="rounded-lg border-2 border-secondary bg-primary p-6 md:p-10 max-w-5xl mx-auto"
          >
             <div className="mx-auto max-w-3xl text-center">
             <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase text-secondary-foreground">
               <Building2 className="h-4 w-4" /> Enterprise
             </div>
             <h3 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-2">
               Running 10 tournaments or more per year?
            </h3>
             <p className="text-primary-foreground/80 mb-6">
               Our Enterprise plan is built for golf courses, clubs, and organizations running leagues and tournaments all year long.
            </p>
             <div className="mb-6">
               <span className="text-4xl md:text-5xl font-display font-bold text-secondary">$2,500</span>
               <span className="text-primary-foreground/80">/year — Unlimited Events</span>
            </div>
             <ul className="mx-auto mb-6 grid max-w-2xl gap-2 text-left sm:grid-cols-2">
               {["Unlimited tournaments and leagues", "Live Leaderboard + Mobile Scoring included ($99 value per event)", "0% transaction fees", "Custom branding", "Priority support"].map((feature) => (
                 <li key={feature} className="flex items-start gap-2 text-sm text-primary-foreground">
                   <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> {feature}
                 </li>
               ))}
             </ul>
             <p className="font-semibold text-primary-foreground mb-6">
               Run 10 events, and it pays for itself. Run more? You save more.
            </p>
             <EnterpriseInquiryDialog><button type="button" className="inline-flex items-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90">
               Contact us at info@teevents.golf <ArrowRight className="h-4 w-4" />
             </button></EnterpriseInquiryDialog>
             </div>
          </motion.div>

           <EnterpriseDemo />
           <p className="text-center mt-4"><a href="/enterprise-demo" className="text-sm font-semibold text-primary underline">Open the full Enterprise demo</a></p>
           {/* Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
             className="mt-10 rounded-lg border border-border bg-card p-6 max-w-5xl mx-auto overflow-hidden"
          >
             <h3 className="mb-5 text-center text-2xl font-display font-bold text-foreground">Compare your options</h3>
             <div className="overflow-x-auto">
               <table className="w-full min-w-[720px] text-sm">
                 <thead><tr className="border-b border-border text-left"><th className="p-3"> </th><th className="p-3">No Cost to Start</th><th className="p-3 text-primary">Per-Event</th><th className="p-3 text-primary">Enterprise</th></tr></thead>
                 <tbody>{[
                   ["Upfront Cost", "$0", "$150 per tournament", "$2,500/year"],
                   ["Transaction Fee", "5% (covered by players)", "0%", "0%"],
                   ["Events Included", "Pay as you go", "Pay as you go", "Unlimited"],
                   ["Live Leaderboard + Mobile Scoring", "Add-on: $99", "Add-on: $99", "Included"],
                   ["Best For", "Non-profits, first-time organizers", "Organizers who want predictable costs", "Courses & clubs running 10+ events"],
                 ].map((row) => <tr key={row[0]} className="border-b border-border/60 last:border-0">{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`p-3 ${index === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{cell}</td>)}</tr>)}</tbody>
               </table>
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
               Running 10 tournaments or more per year?
            </h2>
            <p className="text-primary-foreground/70 mb-8">
               Our Enterprise plan gives you unlimited events for $2,500/year — and includes Live Leaderboard + Mobile Scoring, normally a $99 add-on per event. Run 10 events, and it pays for itself. Run more? You save more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <EnterpriseInquiryDialog><button type="button"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                 Contact us at info@teevents.golf <ArrowRight className="h-4 w-4" />
               </button></EnterpriseInquiryDialog>
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

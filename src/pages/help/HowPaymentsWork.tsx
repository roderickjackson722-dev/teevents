import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, ArrowRight, Building, Wallet, CheckCircle, Shield, DollarSign, Zap } from "lucide-react";

const HowPaymentsWork = () => (
  <Layout>
    <SEO
      title="How Payments Work | TeeVents"
      description="Learn how TeeVents processes payments using Stripe Connect. Automatic 5% platform fee, instant splits, and direct deposits to your Stripe account."
      path="/help/how-payments-work"
    />
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">How Payments Work</h1>
      <p className="text-lg text-muted-foreground mb-10">
        TeeVents uses Stripe Connect to split every payment automatically at checkout. You never have to chase funds or wait for payouts from us — <strong>we never hold your money</strong>.
      </p>

      {/* Visual Flow */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Payment Flow — Step by Step
        </h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { step: "1", icon: CreditCard, title: "Golfer Pays", desc: "Golfer registers and pays the full amount at checkout (credit card, Apple Pay, Google Pay, Cash App)." },
            { step: "2", icon: DollarSign, title: "Stripe Splits", desc: "Stripe automatically deducts the 5% TeeVents platform fee and the ~2.9% + $0.30 Stripe processing fee." },
            { step: "3", icon: Building, title: "Organizer Receives", desc: "Net proceeds are routed to your connected Stripe account immediately. Funds become available to withdraw on your standard schedule (typically T+2 business days; new accounts may have a 2–7 day Stripe review)." },
            { step: "4", icon: Wallet, title: "You Withdraw", desc: "Transfer funds from your Stripe account to your bank whenever you want. Set up automatic daily or weekly transfers." },
          ].map((s) => (
            <div key={s.step} className="relative bg-card border border-border rounded-xl p-5 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-3">
                {s.step}
              </div>
              <s.icon className="h-6 w-6 mx-auto text-primary mb-2" />
              <h3 className="font-semibold text-foreground mb-1 text-sm">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The 5% Platform Fee */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" /> The 5% Platform Fee
        </h2>
        <p className="text-muted-foreground mb-6">
          TeeVents charges a <strong>5% platform fee</strong> on every transaction. This covers the full tournament management platform — your custom website, live scoring, leaderboards, pairings, budget tools, sponsor management, and white-glove support. There are no monthly subscription fees beyond your chosen plan.
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-card border-2 border-primary/30 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-2">Option A: Pass Fees to Golfers (Default)</h3>
            <p className="text-sm text-muted-foreground mb-3">The 5% fee and Stripe processing fee are added at checkout. Your organization receives 100% of the registration price.</p>
            <div className="text-sm bg-muted/50 rounded p-3 space-y-1">
              <div className="flex justify-between"><span>Registration</span><span>$150.00</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Platform Fee (5%)</span><span>$7.50</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Stripe Processing</span><span>~$4.88</span></div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>~$162.38</span></div>
              <div className="flex justify-between text-primary font-medium"><span>You Receive</span><span>$150.00</span></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-2">Option B: Absorb Fees</h3>
            <p className="text-sm text-muted-foreground mb-3">The golfer pays only the listed price. Fees are deducted from your proceeds.</p>
            <div className="text-sm bg-muted/50 rounded p-3 space-y-1">
              <div className="flex justify-between"><span>Registration</span><span>$150.00</span></div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>$150.00</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Platform Fee (5%)</span><span>−$7.50</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Stripe Processing</span><span>~−$4.49</span></div>
              <div className="flex justify-between text-primary font-medium"><span>You Receive</span><span>~$138.01</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stripe Connect */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> How Stripe Connect Works
        </h2>
        <p className="text-muted-foreground mb-4">
          TeeVents uses <strong>Stripe Connect destination charges</strong> to process payments. This means:
        </p>
        <ul className="space-y-3 ml-1">
          {[
            "Every payment is split automatically at the moment of checkout — no manual transfers.",
            "Your tournament organization is the merchant of record. Your name appears on golfer bank statements.",
            "TeeVents never holds, touches, or controls your funds.",
            "Net proceeds go directly to your connected Stripe account within 2 business days.",
            "You control your own Stripe account — set up automatic transfers to your bank or withdraw manually anytime.",
            "Stripe handles PCI compliance, fraud detection, and dispute management.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What TeeVents Charges Apply To */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">What Transactions Include the 5% Fee?</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Player Registrations", included: true },
            { label: "Sponsor Payments", included: true },
            { label: "Donations", included: true },
            { label: "Auction / Raffle Purchases", included: true },
            { label: "Tournament Store Purchases", included: true },
            { label: "Free Registrations ($0)", included: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
              {item.included ? (
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
              )}
              <span className="text-sm text-foreground">{item.label}</span>
              {!item.included && <span className="text-xs text-muted-foreground ml-auto">No fee</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Comparison callout */}
      <section className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-12">
        <h3 className="font-semibold text-foreground mb-2">💡 Why This Is Better Than Other Platforms</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Most event platforms (like Eventbrite) collect all funds into <em>their</em> account and pay you out days or weeks later. TeeVents is different:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="font-semibold text-foreground mb-1">❌ Other Platforms</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Hold all funds until after event</li>
              <li>• Payout delays of 5–10+ business days</li>
              <li>• You rely on them to release your money</li>
            </ul>
          </div>
          <div className="bg-card rounded-lg border border-primary/30 p-4">
            <p className="font-semibold text-primary mb-1">✅ TeeVents</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Funds split instantly at checkout</li>
              <li>• Net proceeds routed to your Stripe immediately</li>
              <li>• Available to withdraw in ~2 days (2–7 days for new Stripe accounts during their standard review)</li>
              <li>• You control your own Stripe account</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">Common Questions</h2>
        <div className="space-y-4">
          {[
            { q: "Do I need a Stripe account?", a: "Yes — during onboarding, TeeVents walks you through connecting (or creating) a free Stripe account. This is where your funds are deposited." },
            { q: "Can I use PayPal instead?", a: "PayPal is available as a backup payout method, but Stripe is required for automatic payment splitting at checkout." },
            { q: "Is there a monthly fee?", a: "No monthly fees for the platform fee itself. You only pay the 5% when transactions occur. Your chosen plan (Starter or Premium) is a one-time per-tournament fee." },
            { q: "What if a golfer requests a refund?", a: "You set your own refund policy. Approved refunds are processed through Stripe and deducted from your connected account balance." },
            { q: "Are there any hidden fees?", a: "No. The only fees are the transparent 5% platform fee and Stripe's standard processing fee (~2.9% + $0.30). Both are visible at checkout and in your dashboard." },
          ].map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground text-sm mb-1">{item.q}</h4>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Links */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Related Articles</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Connect Your Bank Account", path: "/help/connect-stripe" },
            { label: "Fees & Payment Flow", path: "/help/fees-and-hold" },
            { label: "Payment Settings (Fee Toggle)", path: "/help/payment-settings" },
            { label: "Refunds & Chargebacks", path: "/help/refunds-chargebacks" },
          ].map((link) => (
            <Link key={link.path} to={link.path} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary/40 transition-colors group">
              <span className="text-sm font-medium text-foreground group-hover:text-primary">{link.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  </Layout>
);

export default HowPaymentsWork;

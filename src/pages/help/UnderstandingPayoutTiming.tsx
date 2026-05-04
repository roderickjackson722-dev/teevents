import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Shield, CheckCircle, Building, Image as ImageIcon } from "lucide-react";

const UnderstandingPayoutTiming = () => (
  <Layout>
    <SEO
      title="Understanding Payout Timing | TeeVents Help"
      description="How TeeVents transactions are recorded immediately, why Stripe holds funds for 2–7 days on new Connect accounts, and where to track everything."
      path="/help/understanding-payout-timing"
    />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
        Understanding Payout Timing
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        Every payment is recorded in your TeeVents dashboard the moment a golfer
        registers. For brand-new Stripe Connect accounts, Stripe holds the funds
        for 2–7 days before they become available to withdraw. Here's why — and
        what you'll see during that window.
      </p>

      {/* What you see immediately */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" /> What You See Immediately
        </h2>
        <p className="text-muted-foreground mb-4">
          As soon as a golfer completes checkout, the transaction appears in your
          TeeVents <Link to="/dashboard/finances" className="text-primary underline">Finances dashboard</Link> with:
        </p>
        <ul className="space-y-2 ml-6 list-disc text-sm text-muted-foreground">
          <li>Gross amount the golfer paid</li>
          <li>5% TeeVents platform fee</li>
          <li>Stripe processing fee (~2.9% + $0.30)</li>
          <li>Net amount routed to your Stripe account</li>
          <li>Golfer name, email, payment method, and Stripe IDs</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          You don't have to wait for Stripe — TeeVents shows the full record in
          real time.
        </p>
      </section>

      {/* Why Stripe holds new accounts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Why Stripe Holds Funds on New Accounts
        </h2>
        <p className="text-muted-foreground mb-4">
          Stripe applies a standard <strong>2–7 business day review</strong> on the
          first charges to a brand-new Connect account. This is industry-standard
          fraud and risk prevention used by every payment processor — it is{" "}
          <em>not</em> a TeeVents hold and TeeVents has no ability to release it
          early.
        </p>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">The good news</p>
          <p>
            This review only applies to the first few payouts. After Stripe sees
            normal activity, your account moves to its standard schedule (typically
            T+2 business days), and the hold is removed automatically.
          </p>
        </div>
      </section>

      {/* Where to check */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" /> Where to Check Your Payout Status in Stripe
        </h2>
        <p className="text-muted-foreground mb-4">
          New organizers often check Stripe's <strong>Payments</strong> tab and see
          $0 — that tab only shows charges processed by their own account, not
          destination charges from a platform like TeeVents. Look in these places
          instead:
        </p>
        <ol className="space-y-3 ml-6 list-decimal text-sm text-muted-foreground">
          <li>
            <strong>Balances → Overview</strong> — shows your <em>Available</em>{" "}
            and <em>Pending</em> balance. New-account funds appear here as Pending.
          </li>
          <li>
            <strong>Balances → Transfers</strong> — shows every destination charge
            TeeVents has routed to you (one row per registration).
          </li>
          <li>
            <strong>Payouts</strong> — shows scheduled and completed bank deposits.
          </li>
        </ol>
      </section>

      {/* When the hold lifts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> When the Hold Is Lifted
        </h2>
        <p className="text-muted-foreground mb-4">
          Stripe automatically releases the hold once one of the following is true:
        </p>
        <ul className="space-y-2 ml-6 list-disc text-sm text-muted-foreground">
          <li>2–7 business days have passed since your first charge</li>
          <li>You've processed several successful charges with no disputes</li>
          <li>Stripe's automated risk review completes</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          You don't need to take any action. After this point, future
          registrations follow your normal payout schedule (typically T+2 business
          days).
        </p>
      </section>

      {/* Logo / branding */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" /> Showing Your Logo at Checkout
        </h2>
        <p className="text-muted-foreground mb-4">
          The Stripe checkout page uses your organization's name as the merchant
          (via Stripe's <em>on_behalf_of</em>), but it can only show your logo if
          you've uploaded one inside Stripe.
        </p>
        <ol className="space-y-2 ml-6 list-decimal text-sm text-muted-foreground">
          <li>Open your Stripe Dashboard</li>
          <li>Go to <strong>Settings → Branding</strong></li>
          <li>Upload your logo, icon, and brand color</li>
        </ol>
        <p className="text-sm text-muted-foreground mt-4">
          Once saved, every TeeVents checkout will display your branding instead
          of the platform default.
        </p>
      </section>

      {/* Quick summary */}
      <section className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-3">Quick Summary</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✅ Transactions appear in your TeeVents dashboard <strong>instantly</strong>.</li>
          <li>✅ Net proceeds are routed to your Stripe account <strong>at the moment of checkout</strong>.</li>
          <li>⏳ Funds become <strong>available to withdraw in 2–7 business days</strong> on a brand-new Stripe account (Stripe's standard review).</li>
          <li>🔁 After the first few payouts, your account moves to a standard T+2 schedule automatically.</li>
        </ul>
      </section>
    </div>
  </Layout>
);

export default UnderstandingPayoutTiming;

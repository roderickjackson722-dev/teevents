import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Image as ImageIcon, ListOrdered, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
      {n}
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  </div>
);

const ScreenshotPlaceholder = ({ label }: { label: string }) => (
  <div className="my-3 border-2 border-dashed border-border rounded-lg bg-muted/30 p-8 flex flex-col items-center justify-center text-muted-foreground text-sm">
    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
    <span className="italic">Screenshot: {label}</span>
  </div>
);

const FindingStripePayouts = () => (
  <Layout>
    <SEO
      title="Where to Find Your Payouts in Stripe | TeeVents Help"
      description="Step-by-step guide to locating your TeeVents payouts inside the Stripe Dashboard — Balances → Overview → Payments."
      path="/help/finding-stripe-payouts"
    />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
        Where to Find Your Payouts in Stripe
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        TeeVents uses <strong>Stripe Direct Charges</strong>. Every registration is paid
        straight into your Stripe account — TeeVents never holds the money. Only the 5%
        platform fee is taken off the top as an application fee. Here's exactly where to
        look in your Stripe Dashboard to see those payments.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" /> Step-by-Step
        </h2>

        <Step n={1} title="Log into your Stripe Dashboard">
          <p>
            Go to{" "}
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              dashboard.stripe.com <ExternalLink className="h-3 w-3" />
            </a>{" "}
            and sign in with the Stripe account you connected to TeeVents.
          </p>
        </Step>

        <Step n={2} title="Click 'Balances' in the left sidebar">
          <p>You'll find this under the main navigation, near the top.</p>
          <ScreenshotPlaceholder label="Stripe sidebar with 'Balances' highlighted" />
        </Step>

        <Step n={3} title="Open the 'Overview' tab and find 'Payments'">
          <p>
            On the Balances page, the <strong>Overview</strong> tab lists every charge.
            Because TeeVents now uses Direct Charges, registration payments appear as
            standard <strong>Payments</strong> on your account — not as Transfers.
          </p>
          <ScreenshotPlaceholder label="Balances → Overview with Payments list" />
        </Step>

        <Step n={4} title="Review your payments">
          <p>
            Each row is a registration, sponsorship, side event ticket, store order, or
            donation paid through TeeVents. The 5% TeeVents platform fee on each row is
            recorded as the <em>application fee</em>.
          </p>
        </Step>

        <Step n={5} title="Click any transfer for full details">
          <p>
            Click into a transfer to see which registration it came from, the
            golfer name, and the exact net amount deposited.
          </p>
          <ScreenshotPlaceholder label="Individual transfer detail page" />
        </Step>
      </section>

      <section className="mb-10 bg-muted/40 border border-border rounded-lg p-5">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Important: New Stripe Accounts
        </h2>
        <p className="text-sm text-muted-foreground">
          Brand-new Stripe Connect accounts may show <strong>$0 in Balances for
          2–7 days</strong> after the first charge. This is Stripe's standard risk
          review — funds are safe and will become available automatically. See{" "}
          <Link to="/help/understanding-payout-timing" className="text-primary underline">
            Understanding Payout Timing
          </Link>{" "}
          for the full explanation.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a href="https://dashboard.stripe.com/balance" target="_blank" rel="noopener noreferrer">
            Open Stripe Balances <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard/finances">Back to Finances</Link>
        </Button>
      </div>
    </div>
  </Layout>
);

export default FindingStripePayouts;

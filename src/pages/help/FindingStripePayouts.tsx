import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, ListOrdered, Wallet, Clock, Landmark } from "lucide-react";
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

const FindingStripePayouts = () => (
  <Layout>
    <SEO
      title="Where to Find Your Payouts in Stripe | TeeVents Help"
      description="Step-by-step guide to locating your TeeVents tournament funds inside the Stripe Dashboard, and why a balance can show as pending."
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
        straight into your own Stripe account — TeeVents never holds the money. Only the 5%
        platform fee is taken off the top as an application fee. Here's exactly where to
        look, and what to do if your balance looks like $0.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" /> Step-by-Step
        </h2>

        <Step n={1} title="Log into your own Stripe Dashboard">
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
            and sign in with the Stripe account you connected to TeeVents. Make sure the
            top-left toggle says <strong>live mode</strong>, not test mode.
          </p>
        </Step>

        <Step n={2} title="Open Payments to confirm the money arrived">
          <p>
            Click <strong>Payments</strong> in the left sidebar. Every registration,
            sponsorship, side-event ticket, store order and donation paid through TeeVents
            shows up here as a normal payment on your account — not as a transfer from
            TeeVents. If you see rows here, the money is yours and is already in your account.
          </p>
        </Step>

        <Step n={3} title="Open Balances → Overview to see available vs. pending">
          <p>
            Click <strong>Balances</strong>. You'll see two numbers:
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              <strong>Available (soon)</strong> / <strong>Pending</strong> — money collected
              but still settling. It is yours, it just hasn't been released for payout yet.
            </li>
            <li>
              <strong>Available</strong> — money ready to be paid out to your bank.
            </li>
          </ul>
          <p>
            A $0 available balance with a large pending balance is completely normal and is
            the single most common reason organizers think they haven't been paid.
          </p>
        </Step>

        <Step n={4} title="Open the Payouts tab to see bank deposits">
          <p>
            On the Balances page, click the <strong>Payouts</strong> tab. This lists each
            deposit sent to your bank account, its status (in transit / paid) and the exact
            arrival date. Match these against your bank statement — Stripe deposits often
            appear on the statement as your own business name, so they can be easy to miss.
          </p>
        </Step>

        <Step n={5} title="Click any payout to see what's inside it">
          <p>
            Open a payout and you'll see every individual charge that made it up, the 5%
            TeeVents application fee, and Stripe's processing fee, so you can reconcile
            against your TeeVents Finances page down to the dollar.
          </p>
        </Step>
      </section>

      <section className="mb-10 bg-muted/40 border border-border rounded-lg p-5">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Why your balance can look like $0
        </h2>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-5">
          <li>
            <strong>Bank (ACH) payments take about 5 business days to settle.</strong> If
            golfers paid by bank account instead of card, the money sits in
            <em> pending</em> far longer than a card payment. Card payments settle in about
            2 business days.
          </li>
          <li>
            <strong>Brand-new Stripe accounts</strong> have a 2–7 day hold on the first
            payouts while Stripe completes its standard review. This lifts automatically.
          </li>
          <li>
            <strong>Payout schedule.</strong> Your account pays out on a rolling schedule
            (commonly daily with a 2-day delay). Check Settings → Payouts in Stripe.
          </li>
          <li>
            <strong>Registrations taken before you connected Stripe.</strong> Anything paid
            before your Stripe account was connected was collected on the TeeVents platform
            account and is paid to you manually. Contact{" "}
            <a href="mailto:info@teevents.golf" className="text-primary underline">
              info@teevents.golf
            </a>{" "}
            and we'll release those funds.
          </li>
        </ul>
      </section>

      <section className="mb-10 bg-primary/5 border border-primary/20 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" /> Confirm your bank account is verified
        </h2>
        <p className="text-sm text-muted-foreground">
          In Stripe go to <strong>Settings → Bank accounts and scheduling</strong>. Your bank
          should be listed as <strong>verified</strong> and set as the default for USD. If it
          shows as unverified or an error, payouts pause until it's fixed — even though the
          payments themselves keep succeeding. Also see{" "}
          <Link to="/help/understanding-payout-timing" className="text-primary underline">
            Understanding Payout Timing
          </Link>
          .
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a href="https://dashboard.stripe.com/balance" target="_blank" rel="noopener noreferrer">
            Open Stripe Balances <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://dashboard.stripe.com/payouts" target="_blank" rel="noopener noreferrer">
            Open Stripe Payouts <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard/finances">Back to Finances</Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-8 flex items-center gap-2">
        <Wallet className="h-3.5 w-3.5" /> Still can't find your money? Email
        info@teevents.golf with your tournament name and we'll trace every charge for you.
      </p>
    </div>
  </Layout>
);

export default FindingStripePayouts;

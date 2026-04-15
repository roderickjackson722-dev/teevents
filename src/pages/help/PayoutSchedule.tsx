import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, Zap, Banknote, ArrowUpRight } from "lucide-react";

const PayoutSchedule = () => (
  <Layout>
    <SEO title="Payout Schedule | TeeVents Help" description="Learn how TeeVents' automatic payment splitting works. Funds go directly to your Stripe account — withdraw on your schedule." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Payout Schedule</h1>
      <p className="text-muted-foreground mb-8">How and when you receive your tournament funds.</p>

      <div className="space-y-8">
        <section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Automatic Payment Splitting</h2>
          <p className="text-muted-foreground mb-4">
            TeeVents uses Stripe Connect destination charges to split every payment <strong>automatically at checkout</strong>. When a golfer registers:
          </p>
          <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
            <li>Stripe charges the golfer the full amount</li>
            <li>TeeVents' $5 flat platform fee is automatically deducted</li>
            <li>Stripe's processing fee (2.9% + $0.30) is deducted</li>
            <li>Net proceeds are deposited directly into <strong>your connected Stripe account</strong></li>
          </ol>
          <p className="text-sm font-semibold text-primary mt-4">
            💡 TeeVents never holds, touches, or controls your money. You manage your funds through your own Stripe account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> Accessing Your Funds</h2>
          <p className="text-muted-foreground mb-4">
            Funds land in your Stripe account after each transaction. Stripe's standard payout schedule transfers funds to your bank account automatically:
          </p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p><strong>Standard payout:</strong> 2 business days to your bank account (automatic)</p>
            <p><strong>Custom schedule:</strong> Configure daily, weekly, or monthly payouts in Stripe</p>
            <p><strong>Instant payouts:</strong> Available if enabled in your Stripe account</p>
            <p><strong>Manual transfers:</strong> Withdraw anytime from your Stripe dashboard</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><ArrowUpRight className="h-5 w-5 text-primary" /> How to Set Up Payouts</h2>
          <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
            <li>Go to <strong>Payout Settings</strong> in your dashboard</li>
            <li>Connect your Stripe account (one-time setup)</li>
            <li>Configure your preferred payout schedule in Stripe</li>
            <li>Funds automatically flow to your bank after each transaction</li>
          </ol>
        </section>

        <section className="bg-primary/5 border border-primary/20 rounded-lg p-5">
          <h3 className="font-semibold text-foreground mb-2">💡 Pro Tip</h3>
          <p className="text-sm text-muted-foreground">
            Set up Stripe Connect early — even before your tournament. This ensures payments split automatically from the very first registration. Visit <Link to="/dashboard/payout-settings" className="text-primary underline">Payout Settings</Link> to get started.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default PayoutSchedule;

import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, DollarSign, Shield, Zap } from "lucide-react";

const FeesAndHold = () => (
  <Layout>
    <SEO title="Fees & Payment Flow | TeeVents Help" description="Understand TeeVents' 5% platform fee and automatic payment splitting. TeeVents never holds your money." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Fees & Payment Flow</h1>
      <p className="text-muted-foreground mb-8">How payments are split automatically at checkout — TeeVents never holds your money.</p>

      <div className="space-y-8">
        {/* Automatic Split */}
        <section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Automatic Payment Splitting</h2>
          <p className="text-muted-foreground mb-4">
            TeeVents uses <strong>Stripe Connect destination charges</strong> to split every payment automatically at checkout. When a golfer pays, Stripe instantly:
          </p>
          <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
            <li>Charges the golfer the full amount</li>
            <li>Sends TeeVents the 5% platform fee</li>
            <li>Deducts Stripe's processing fee (2.9% + $0.30)</li>
            <li>Deposits the remaining balance directly in <strong>your</strong> connected Stripe account</li>
          </ol>
          <p className="text-sm font-semibold text-primary mt-4">
            💡 TeeVents never holds, touches, or controls your funds. You withdraw from your own Stripe account on your schedule.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> The 5% Platform Fee</h2>
          <p className="text-muted-foreground mb-4">TeeVents charges a <strong>5% platform fee per transaction</strong>. This fee is automatically deducted by Stripe at checkout.</p>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">Example: $150 Registration</h4>
            <div className="text-sm space-y-1 bg-muted/50 rounded p-3">
              <div className="flex justify-between"><span>Registration Fee</span><span>$150.00</span></div>
              <div className="flex justify-between text-muted-foreground"><span>TeeVents Platform Fee (5%)</span><span>−$7.50</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Stripe Processing (2.9% + $0.30)</span><span>−$4.65</span></div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>$150.00</span></div>
              <div className="flex justify-between text-primary font-medium"><span>Deposited in Your Stripe</span><span>$140.35</span></div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Accessing Your Funds</h2>
          <p className="text-muted-foreground mb-4">
            Since payments go directly to your Stripe account, you control when and how you access your funds. Stripe typically makes funds available within 2 business days, and you can set up automatic daily or weekly transfers to your bank account through your Stripe dashboard.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p><strong>Stripe standard payout:</strong> 2 business days to your bank</p>
            <p><strong>Instant payouts:</strong> Available if enabled in your Stripe account (additional fee)</p>
            <p><strong>Manual transfers:</strong> Withdraw anytime from your Stripe dashboard</p>
          </div>
        </section>

        <section className="bg-primary/5 border border-primary/20 rounded-lg p-5">
          <h3 className="font-semibold text-foreground mb-2">💡 Key Difference from Other Platforms</h3>
          <p className="text-sm text-muted-foreground">
            Unlike Eventbrite and other event platforms that collect all funds and pay you out weeks later, TeeVents never holds your money. Every payment is split at the moment of checkout using Stripe Connect. You are always in control of your funds through your own Stripe account.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default FeesAndHold;

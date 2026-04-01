import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Shield, CreditCard } from "lucide-react";

const ConnectStripe = () => (
  <Layout>
    <SEO title="Connect Your Bank Account | TeeVents Help" description="Step-by-step guide to connecting your bank account via Stripe Connect for automatic tournament payouts." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Connect Your Bank Account</h1>
      <p className="text-muted-foreground mb-8">Set up Stripe Connect Express to receive automatic bi-weekly payouts directly to your bank account.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Getting Started</h2>
          <ol className="space-y-4 ml-6 list-decimal text-foreground">
            <li>Navigate to <strong>Payout Settings</strong> in your dashboard sidebar.</li>
            <li>Click <strong>"Connect with Stripe"</strong> to begin the onboarding process.</li>
            <li>You'll be redirected to Stripe's secure onboarding page.</li>
            <li>Enter your business details, bank account information, and verify your identity.</li>
            <li>Once complete, you'll be redirected back to TeeVents.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> What You'll Need</h2>
          <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
            <li>Your organization's legal name and EIN (if applicable)</li>
            <li>A U.S. bank account (routing and account numbers)</li>
            <li>A valid government-issued ID for identity verification</li>
            <li>Your organization's address</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /> After Connection</h2>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground space-y-2">
            <p>✅ Your payout method status will show as <strong>"Verified"</strong></p>
            <p>✅ Automatic bi-weekly payouts will begin on the next payout cycle</p>
            <p>✅ You can view your Stripe dashboard at any time from Payout Settings</p>
            <p>✅ Manual withdrawals become available for balances over $25</p>
          </div>
        </section>

        <section className="bg-muted/50 rounded-lg p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-2">🔒 Security Note</h3>
          <p className="text-sm text-muted-foreground">
            TeeVents never stores your bank account details. All financial information is securely handled by Stripe, a PCI Level 1 certified payment processor trusted by millions of businesses worldwide.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default ConnectStripe;

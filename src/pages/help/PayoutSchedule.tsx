import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Banknote, Clock, ArrowUpRight } from "lucide-react";

const PayoutSchedule = () => (
  <Layout>
    <SEO title="Payout Schedule | TeeVents Help" description="Learn about TeeVents' bi-weekly automatic payouts and manual withdrawal options for tournament organizers." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Payout Schedule</h1>
      <p className="text-muted-foreground mb-8">How and when you receive your tournament funds.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Automatic Bi-Weekly Payouts</h2>
          <p className="text-muted-foreground mb-4">TeeVents automatically processes payouts every other Monday at 9:00 AM UTC. Funds typically arrive in your bank account within 1-3 business days.</p>
          
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="font-medium text-foreground">Payout Timeline</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Funds collected from registrations</li>
                  <li>• 15% hold applied until 15 days post-event</li>
                  <li>• Available balance aggregated bi-weekly</li>
                  <li>• Automatic transfer to your connected bank account</li>
                  <li>• Funds arrive in 1-3 business days</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> Manual Withdrawals</h2>
          <p className="text-muted-foreground mb-4">Don't want to wait for the next automatic payout? You can request a manual withdrawal at any time.</p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p><strong>Minimum withdrawal:</strong> $25.00</p>
            <p><strong>Processing time:</strong> 1-3 business days</p>
            <p><strong>Requirement:</strong> Connected Stripe account in good standing</p>
            <p><strong>Dispute check:</strong> 7-day fraud/dispute-free period verified before processing</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><ArrowUpRight className="h-5 w-5 text-primary" /> How to Request a Withdrawal</h2>
          <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
            <li>Go to <strong>Finances</strong> in your dashboard</li>
            <li>Review your <strong>Available Now</strong> balance</li>
            <li>Click the <strong>"Withdraw Funds"</strong> button</li>
            <li>Confirm the withdrawal amount</li>
            <li>Funds will be transferred to your connected bank account</li>
          </ol>
        </section>

        <section className="bg-primary/5 border border-primary/20 rounded-lg p-5">
          <h3 className="font-semibold text-foreground mb-2">💡 Pro Tip</h3>
          <p className="text-sm text-muted-foreground">
            Set up Stripe Connect early — even before your tournament. This ensures your payouts are processed without delay once registrations start coming in. Visit <Link to="/dashboard/payout-settings" className="text-primary underline">Payout Settings</Link> to get started.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default PayoutSchedule;

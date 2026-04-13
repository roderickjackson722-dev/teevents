import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, Settings, ToggleLeft, Users, Building } from "lucide-react";

const PaymentSettings = () => (
  <Layout>
    <SEO title="Payment Settings | TeeVents Help" description="Learn how to configure fee models — pass fees to golfers or absorb them as the organizer." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Payment Settings</h1>
      <p className="text-muted-foreground mb-8">Choose how the 5% platform fee is handled for your tournaments.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><ToggleLeft className="h-5 w-5 text-primary" /> The Fee Toggle</h2>
          <p className="text-muted-foreground mb-4">
            In your tournament's <strong>Registration</strong> settings, you'll find the <strong>"Pass Fees to Participants"</strong> toggle. This controls who pays the 5% platform fee.
          </p>
        </section>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-card border-2 border-primary/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Toggle ON — Golfers Pay</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">The 5% platform fee and Stripe processing fee are added as transparent line items at checkout. Your organization receives the full registration amount.</p>
            <div className="text-sm bg-muted/50 rounded p-3 space-y-1">
              <div className="flex justify-between"><span>Registration</span><span>$150.00</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Platform Fee (5%)</span><span>$7.50</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Processing Fee</span><span>$4.88</span></div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>$162.38</span></div>
              <div className="flex justify-between text-primary"><span>You Receive</span><span>$150.00</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">✅ Best for: Maximizing your revenue per registration</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-5 w-5 text-secondary" />
              <h3 className="font-semibold text-foreground">Toggle OFF — You Absorb</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">The golfer pays only the listed registration fee. The 5% fee is deducted from your payout, creating a cleaner checkout experience.</p>
            <div className="text-sm bg-muted/50 rounded p-3 space-y-1">
              <div className="flex justify-between"><span>Registration</span><span>$150.00</span></div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>$150.00</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Platform Fee (5%)</span><span>−$7.50</span></div>
              <div className="flex justify-between text-primary"><span>You Receive</span><span>$142.50</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">✅ Best for: Clean pricing and simpler checkout</p>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">How to Change Your Setting</h2>
          <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
            <li>Go to your <strong>Dashboard → Registration</strong></li>
            <li>Find the <strong>"Pass Fees to Participants"</strong> toggle</li>
            <li>Toggle on or off based on your preference</li>
            <li>The change applies to all future registrations for that tournament</li>
          </ol>
        </section>

        <section className="bg-muted/50 rounded-lg p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-2">💡 Recommendation</h3>
          <p className="text-sm text-muted-foreground">
            Most charity tournaments use <strong>Toggle OFF</strong> (absorb fees) because it creates a cleaner experience for golfers and keeps the registration price simple. Corporate-sponsored events often use <strong>Toggle ON</strong> to maximize revenue.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default PaymentSettings;

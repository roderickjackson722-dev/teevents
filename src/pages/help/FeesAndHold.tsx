import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, DollarSign, Shield, Info } from "lucide-react";

const FeesAndHold = () => (
  <Layout>
    <SEO title="Fees & Fund Holds | TeeVents Help" description="Understand TeeVents' transparent 4% platform fee and 15% protective hold that safeguards organizers from chargebacks." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Fees & Fund Holds</h1>
      <p className="text-muted-foreground mb-8">A transparent breakdown of how fees and protective holds work on TeeVents.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> The 4% Platform Fee</h2>
          <p className="text-muted-foreground mb-4">TeeVents charges a flat 4% platform fee on each registration. This covers payment processing, platform maintenance, and customer support.</p>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2">Model A: Pass Fees to Golfers</h4>
              <p className="text-sm text-muted-foreground mb-3">The golfer pays the base price plus the 4% fee and Stripe processing fee as separate line items.</p>
              <div className="text-sm space-y-1 bg-muted/50 rounded p-3">
                <div className="flex justify-between"><span>Registration</span><span>$100.00</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Platform Fee (4%)</span><span>$4.00</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Processing Fee</span><span>$3.33</span></div>
                <hr className="my-1 border-border" />
                <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>$107.33</span></div>
                <div className="flex justify-between text-primary font-medium"><span>You Receive</span><span>$100.00</span></div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2">Model B: Absorb Fees</h4>
              <p className="text-sm text-muted-foreground mb-3">The golfer pays only the base registration fee. The 4% is deducted from your payout.</p>
              <div className="text-sm space-y-1 bg-muted/50 rounded p-3">
                <div className="flex justify-between"><span>Registration</span><span>$100.00</span></div>
                <hr className="my-1 border-border" />
                <div className="flex justify-between font-semibold"><span>Golfer Pays</span><span>$100.00</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Platform Fee (4%)</span><span>−$4.00</span></div>
                <div className="flex justify-between text-primary font-medium"><span>You Receive</span><span>$96.00</span></div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> The 15% Protective Hold</h2>
          <p className="text-muted-foreground mb-4">To protect organizers from chargebacks and fraudulent disputes, TeeVents holds 15% of the gross registration amount in reserve.</p>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">How the hold works:</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1.5 list-disc ml-4">
                  <li>15% of each registration's gross amount is held in reserve</li>
                  <li>The hold is <strong>automatically released 15 days after your event ends</strong></li>
                  <li>Once released, the full net amount becomes available for payout</li>
                  <li>You'll receive an email notification when holds are released</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-muted/50 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-foreground mb-2">Example: $100 Registration</h4>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>Gross Amount</span><span>$100.00</span></div>
              <div className="flex justify-between"><span>Platform Fee (4%)</span><span>−$4.00</span></div>
              <div className="flex justify-between"><span>Net Amount</span><span>$96.00</span></div>
              <div className="flex justify-between text-secondary"><span>Held in Reserve (15%)</span><span>$15.00</span></div>
              <div className="flex justify-between"><span>Available Immediately</span><span>$81.00</span></div>
              <div className="flex justify-between text-primary font-medium"><span>Released 15 Days Post-Event</span><span>+$15.00</span></div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-foreground mb-2">Why do you hold funds?</h3>
          <p className="text-sm text-muted-foreground">
            Credit card chargebacks can occur up to 120 days after a transaction. The 15-day post-event hold covers the most common dispute window and protects your organization from unexpected fund reversals. This is standard practice for event platforms like Eventbrite and GoFundMe.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default FeesAndHold;

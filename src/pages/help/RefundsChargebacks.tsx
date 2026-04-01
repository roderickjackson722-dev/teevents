import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, Shield, AlertTriangle, CheckCircle } from "lucide-react";

const RefundsChargebacks = () => (
  <Layout>
    <SEO title="Refunds & Chargebacks | TeeVents Help" description="How refund requests, chargebacks, and the 15% protective hold work together to protect tournament organizers." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Refunds & Chargebacks</h1>
      <p className="text-muted-foreground mb-8">How refund requests and chargeback disputes are handled on TeeVents.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-primary" /> Refund Requests</h2>
          <p className="text-muted-foreground mb-4">Golfers can submit refund requests through the tournament website. As the organizer, you have full control over approving or denying requests.</p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <div className="p-1.5 rounded-full bg-amber-100"><span className="text-amber-600 text-sm font-bold">1</span></div>
              <div>
                <p className="font-medium text-foreground">Golfer Submits Request</p>
                <p className="text-sm text-muted-foreground">The golfer provides their email and reason for the refund.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <div className="p-1.5 rounded-full bg-blue-100"><span className="text-blue-600 text-sm font-bold">2</span></div>
              <div>
                <p className="font-medium text-foreground">You Review in Dashboard</p>
                <p className="text-sm text-muted-foreground">View the request in Finances → Refund Requests. Add notes and approve or deny.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <div className="p-1.5 rounded-full bg-emerald-100"><span className="text-emerald-600 text-sm font-bold">3</span></div>
              <div>
                <p className="font-medium text-foreground">Automatic Processing</p>
                <p className="text-sm text-muted-foreground">Approved refunds are processed automatically through Stripe. Funds return to the golfer in 5-10 business days.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> How the Hold Protects You</h2>
          <p className="text-muted-foreground mb-4">
            The 15% protective hold exists specifically to cover potential chargebacks and refunds. Here's how it works:
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 space-y-2 text-sm text-muted-foreground">
            <p><CheckCircle className="h-4 w-4 text-primary inline mr-1" /> If a chargeback occurs, it's covered by the held reserve — not your bank account</p>
            <p><CheckCircle className="h-4 w-4 text-primary inline mr-1" /> The hold covers the most common dispute window (15 days post-event)</p>
            <p><CheckCircle className="h-4 w-4 text-primary inline mr-1" /> After the hold period, remaining funds are released to your available balance</p>
            <p><CheckCircle className="h-4 w-4 text-primary inline mr-1" /> You're never asked to return money already paid out for covered disputes</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> What is a Chargeback?</h2>
          <p className="text-muted-foreground mb-4">
            A chargeback occurs when a golfer disputes a charge with their credit card company instead of requesting a refund through TeeVents. Chargebacks can happen for various reasons:
          </p>
          <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
            <li>Golfer doesn't recognize the charge on their statement</li>
            <li>Unauthorized use of their credit card</li>
            <li>Dissatisfaction with the event (rare for golf tournaments)</li>
            <li>Duplicate charges</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            <strong>Prevention tip:</strong> Set a clear refund policy on your tournament page and handle refund requests promptly. Golfers who feel heard are far less likely to file chargebacks.
          </p>
        </section>

        <section className="bg-muted/50 rounded-lg p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-2">Setting Your Refund Policy</h3>
          <p className="text-sm text-muted-foreground">
            You can customize your refund policy in <strong>Dashboard → Registration → Refund Policy</strong>. We recommend a clear policy that specifies the deadline for refund requests (e.g., 30 days before the event) and any partial refund terms.
          </p>
        </section>
      </div>
    </div>
  </Layout>
);

export default RefundsChargebacks;

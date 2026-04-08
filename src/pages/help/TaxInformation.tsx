import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle, Download } from "lucide-react";

const TaxInformation = () => (
  <Layout>
    <SEO title="Tax Information | TeeVents Help" description="1099-K reporting, annual tax summaries, and record keeping guidance for TeeVents tournament organizers." />
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/help" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Help Center
      </Link>

      <h1 className="text-3xl font-display font-bold text-foreground mb-2">Tax Information</h1>
      <p className="text-muted-foreground mb-8">Understanding tax reporting for tournament revenue processed through TeeVents.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> 1099-K Reporting</h2>
          <p className="text-muted-foreground mb-4">
            Under IRS rules, payment platforms like TeeVents (via Stripe) are required to issue a 1099-K form if your organization processes more than <strong>$600</strong> in gross payments in a calendar year.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p><strong>Threshold:</strong> $600 in gross payments per calendar year (2024 IRS requirement)</p>
            <p><strong>Issued by:</strong> Stripe (as the payment processor)</p>
            <p><strong>Delivery:</strong> Mailed and available digitally via your Stripe Express dashboard by January 31</p>
            <p><strong>What it reports:</strong> Gross payment volume — not net income after fees</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Download className="h-5 w-5 text-primary" /> Annual Tax Summary</h2>
          <p className="text-muted-foreground mb-4">TeeVents provides a downloadable Annual Tax Summary from your Finances dashboard that includes:</p>
          <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
            <li>Total gross revenue collected</li>
            <li>Total platform fees paid (5%)</li>
            <li>Total net amount received</li>
            <li>Breakdown by tournament</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            Go to <strong>Finances → Reports</strong> and select <strong>"Annual Tax Summary"</strong> to download.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Nonprofit Considerations</h2>
          <p className="text-muted-foreground mb-4">
            If your organization is a registered 501(c)(3) nonprofit, tournament registration fees may be treated differently for tax purposes. Consult your tax advisor about:
          </p>
          <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
            <li>Whether registration fees qualify as charitable contributions</li>
            <li>Proper reporting of event revenue vs. donations</li>
            <li>State-specific tax exemption requirements</li>
          </ul>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Disclaimer</h3>
              <p className="text-sm text-muted-foreground">
                TeeVents does not provide tax advice. This page is for informational purposes only. Please consult a qualified tax professional for advice specific to your organization's situation.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </Layout>
);

export default TaxInformation;

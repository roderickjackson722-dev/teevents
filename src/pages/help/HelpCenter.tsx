import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { CreditCard, DollarSign, Calendar, FileText, Settings, RotateCcw, Globe, Clock } from "lucide-react";

const helpPages = [
  { title: "How Payments Work", description: "Understand the full payment flow — how the 5% fee works, Stripe Connect, and when you get paid.", icon: DollarSign, path: "/help/how-payments-work" },
  { title: "Understanding Payout Timing", description: "Why new Stripe accounts have a 2–7 day hold, where to check your balance, and when funds become available.", icon: Clock, path: "/help/understanding-payout-timing" },
  { title: "Connect Your Bank Account", description: "Set up Stripe Connect to receive automatic payouts to your bank account.", icon: CreditCard, path: "/help/connect-stripe" },
  { title: "Fees & Payment Flow", description: "Understand the 5% platform fee and how payment splitting works.", icon: DollarSign, path: "/help/fees-and-hold" },
  { title: "Payout Schedule", description: "Learn about automatic payouts and how funds reach your bank.", icon: Calendar, path: "/help/payout-schedule" },
  { title: "Tax Information", description: "1099-K reporting thresholds, annual tax summaries, and record keeping.", icon: FileText, path: "/help/tax-information" },
  { title: "Payment Settings", description: "Choose whether golfers or your organization covers the platform fee.", icon: Settings, path: "/help/payment-settings" },
  { title: "Refunds & Chargebacks", description: "How refund requests, chargebacks, and dispute resolution work.", icon: RotateCcw, path: "/help/refunds-chargebacks" },
  { title: "Custom Domain Setup", description: "Use your own domain name for your tournament page.", icon: Globe, path: "/help/custom-domain" },
];

const HelpCenter = () => (
  <Layout>
    <SEO title="Help Center | TeeVents" description="Get help with payments, payouts, fees, and managing your golf tournament on TeeVents." />
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-display font-bold text-foreground mb-2">Help Center</h1>
      <p className="text-lg text-muted-foreground mb-10">Everything you need to know about managing payments and finances on TeeVents.</p>
      <div className="grid sm:grid-cols-2 gap-5">
        {helpPages.map((page) => (
          <Link key={page.path} to={page.path} className="group flex gap-4 p-5 bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all">
            <div className="p-3 rounded-lg bg-primary/10 text-primary h-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <page.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{page.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </Layout>
);

export default HelpCenter;

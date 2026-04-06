import { motion } from "framer-motion";
import { Check, X, AlertTriangle, ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const CALENDLY = "https://calendly.com/teevents-golf/demo";

type Status = "yes" | "no" | "warn";

interface CompRow {
  feature: string;
  eventbrite: string;
  teevents: string;
  ebStatus: Status;
  tvStatus: Status;
}

interface CompSection {
  category: string;
  rows: CompRow[];
}

const data: CompSection[] = [
  {
    category: "Golf-Specific Features",
    rows: [
      { feature: "Live Leaderboard", eventbrite: "Not available", teevents: "Built-in, embeddable", ebStatus: "no", tvStatus: "yes" },
      { feature: "Hole Sponsors", eventbrite: "Basic logo only", teevents: "Portal with asset delivery", ebStatus: "no", tvStatus: "yes" },
      { feature: "Team Registration (Foursomes)", eventbrite: "Clunky workarounds", teevents: "Native group registration", ebStatus: "warn", tvStatus: "yes" },
      { feature: "Handicap Tracking", eventbrite: "Not available", teevents: "Stored per player", ebStatus: "no", tvStatus: "yes" },
      { feature: "Pairings & Tee Times", eventbrite: "Manual spreadsheets", teevents: "Drag-and-drop, auto-notify", ebStatus: "no", tvStatus: "yes" },
      { feature: "Volunteer Check-in", eventbrite: "Not available", teevents: "QR code, shift scheduling", ebStatus: "no", tvStatus: "yes" },
      { feature: "50/50 Raffles & Auctions", eventbrite: "Not available", teevents: "Built-in auction system", ebStatus: "no", tvStatus: "yes" },
    ],
  },
  {
    category: "Pricing",
    rows: [
      { feature: "Platform Fee", eventbrite: "3.5% + $1.79/ticket", teevents: "5% flat", ebStatus: "warn", tvStatus: "yes" },
      { feature: "Payment Processing Fee", eventbrite: "2.9% + $0.30 (extra)", teevents: "2.9% + $0.30 (Stripe)", ebStatus: "warn", tvStatus: "warn" },
      { feature: "Total on $100 Registration", eventbrite: "~$8.49+", teevents: "$8.20", ebStatus: "no", tvStatus: "yes" },
      { feature: "Monthly Subscription", eventbrite: "No (per-event fees)", teevents: "No", ebStatus: "yes", tvStatus: "yes" },
      { feature: "Pass Fees to Golfers", eventbrite: "Not transparent", teevents: "Yes (toggle on/off)", ebStatus: "warn", tvStatus: "yes" },
    ],
  },
  {
    category: "Payouts",
    rows: [
      { feature: "Payout Speed", eventbrite: "After event ends (slow)", teevents: "Bi-weekly or on-demand", ebStatus: "no", tvStatus: "yes" },
      { feature: "Fund Holds", eventbrite: "Arbitrary, unclear", teevents: "15% for 15 days (transparent)", ebStatus: "no", tvStatus: "yes" },
      { feature: "Manual Withdrawals", eventbrite: "No", teevents: "Yes ($25 minimum)", ebStatus: "no", tvStatus: "yes" },
      { feature: "Chargeback Protection", eventbrite: "None", teevents: "15% hold covers you", ebStatus: "no", tvStatus: "yes" },
    ],
  },
  {
    category: "Customization",
    rows: [
      { feature: "Branded Tournament Site", eventbrite: "Limited", teevents: "Full branding", ebStatus: "warn", tvStatus: "yes" },
      { feature: "Custom Domain", eventbrite: "Limited", teevents: "Free (CNAME setup)", ebStatus: "warn", tvStatus: "yes" },
      { feature: "Embed Leaderboard", eventbrite: "No", teevents: "Yes (iframe)", ebStatus: "no", tvStatus: "yes" },
    ],
  },
  {
    category: "Support",
    rows: [
      { feature: "Customer Support", eventbrite: "AI bots, unresponsive", teevents: "Direct email (info@teevents.golf)", ebStatus: "no", tvStatus: "yes" },
      { feature: "Phone Support", eventbrite: "No", teevents: "Available for Pro plans", ebStatus: "no", tvStatus: "yes" },
      { feature: "Onboarding Help", eventbrite: "No", teevents: "Free setup assistance", ebStatus: "no", tvStatus: "yes" },
    ],
  },
  {
    category: "Trust & Safety",
    rows: [
      { feature: "Golf-Specific Experience", eventbrite: "No", teevents: "Built by golf tournament experts", ebStatus: "no", tvStatus: "yes" },
      { feature: "Organizer Reviews", eventbrite: "Mixed (fees, support complaints)", teevents: "Positive (golf-focused)", ebStatus: "warn", tvStatus: "yes" },
      { feature: "Platform Transparency", eventbrite: "Hidden fees", teevents: "Clear, simple pricing", ebStatus: "warn", tvStatus: "yes" },
    ],
  },
];

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "yes") return <Check className="h-4 w-4 text-green-600 inline mr-1.5" />;
  if (status === "no") return <X className="h-4 w-4 text-red-500 inline mr-1.5" />;
  return <AlertTriangle className="h-4 w-4 text-orange-500 inline mr-1.5" />;
};

const CompareEventbrite = () => {

  return (
    <Layout>
      <SEO
        title="Eventbrite vs. TeeVents – Why Golf Tournaments Choose TeeVents"
        description="Compare Eventbrite and TeeVents side-by-side. See why golf tournament organizers switch to TeeVents for live leaderboards, sponsor management, and faster payouts."
      />

      {/* Hero */}
      <section className="bg-golf-green-dark text-primary-foreground pt-28 pb-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Eventbrite vs. TeeVents
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-8">
              Eventbrite is great for concerts. TeeVents is built for golf tournaments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider transition-colors"
                style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
              >
                <Calendar className="h-4 w-4" /> Book a Live Demo
              </a>
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider hover:bg-primary-foreground/10 transition-colors"
              >
                Start Free Today <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-8">Feature-by-Feature Comparison</h2>

          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30%] font-bold text-foreground">Feature</TableHead>
                  <TableHead className="w-[35%] text-center">
                    <span className="text-red-600 font-bold">Eventbrite</span>
                  </TableHead>
                  <TableHead className="w-[35%] text-center">
                    <span className="font-bold" style={{ color: "#1a5c38" }}>TeeVents</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((section) => (
                  <>
                    <TableRow key={section.category} className="bg-muted/30">
                      <TableCell colSpan={3} className="font-bold text-foreground text-sm uppercase tracking-wider py-3">
                        {section.category}
                      </TableCell>
                    </TableRow>
                    {section.rows.map((row) => (
                      <TableRow key={row.feature}>
                        <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          <StatusIcon status={row.ebStatus} />
                          {row.eventbrite}
                        </TableCell>
                        <TableCell className="text-center font-medium" style={{ color: "#1a5c38" }}>
                          <StatusIcon status={row.tvStatus} />
                          {row.teevents}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Fee Comparison Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 grid md:grid-cols-2 gap-6"
          >
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
              <h3 className="text-lg font-bold text-red-700 mb-3">Eventbrite on $100 Registration</h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li>Platform fee: 3.5% + $1.79 = <strong>$5.29</strong></li>
                <li>Payment processing: 2.9% + $0.30 = <strong>$3.20</strong></li>
                <li className="border-t border-red-200 pt-2 font-bold text-base">Total: $8.49 (8.5%)</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 p-6" style={{ borderColor: "#1a5c38", backgroundColor: "#f0f7f3" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "#1a5c38" }}>TeeVents on $100 Registration</h3>
              <ul className="space-y-2 text-sm" style={{ color: "#1a5c38" }}>
                <li>Platform fee: 5% flat = <strong>$5.00</strong></li>
                <li>Stripe processing: 2.9% + $0.30 = <strong>$3.20</strong></li>
                <li className="border-t pt-2 font-bold text-base" style={{ borderColor: "#1a5c38" }}>Total: $8.20 (8.2%)</li>
              </ul>
              <p className="mt-3 text-sm font-bold" style={{ color: "#F5A623" }}>
                YOU SAVE: $0.29 per registration · On 100 golfers: $29 saved + golf-specific features included
              </p>
            </div>
          </motion.div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Sales materials available to TeeVents team in the Admin Sales Hub
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-golf-green-dark">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Ready to Switch from Eventbrite?
            </h2>
            <p className="text-primary-foreground/70 mb-8">
              Join hundreds of golf tournament organizers who chose TeeVents for lower fees, golf-specific features, and faster payouts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider transition-colors"
                style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
              >
                <Calendar className="h-4 w-4" /> Book a Live Demo
              </a>
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider hover:bg-primary-foreground/10 transition-colors"
              >
                Start Free Today <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default CompareEventbrite;

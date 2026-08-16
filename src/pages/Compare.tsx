import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, AlertTriangle, ArrowRight, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const BOOK_DEMO_URL = "/book";

type Status = "yes" | "no" | "warn";
interface CompRow {
  feature: string;
  competitor: string;
  teevents: string;
  cStatus: Status;
  tvStatus: Status;
}
interface CompSection {
  category: string;
  rows: CompRow[];
}
interface Comparison {
  id: string;
  name: string;
  tagline: string;
  hookCtaTitle: string;
  sections: CompSection[];
}

const COMPARISONS: Comparison[] = [
  {
    id: "eventbrite",
    name: "Eventbrite",
    tagline: "Eventbrite is great for concerts. TeeVents is built for golf tournaments.",
    hookCtaTitle: "Ready to Switch from Eventbrite?",
    sections: [
      {
        category: "Golf-Specific Features",
        rows: [
          { feature: "Live Leaderboard", competitor: "Not available", teevents: "Built-in, embeddable", cStatus: "no", tvStatus: "yes" },
          { feature: "Hole Sponsors", competitor: "Basic logo only", teevents: "Portal with asset delivery", cStatus: "no", tvStatus: "yes" },
          { feature: "Team Registration (Foursomes)", competitor: "Clunky workarounds", teevents: "Native group registration", cStatus: "warn", tvStatus: "yes" },
          { feature: "Handicap Tracking", competitor: "Not available", teevents: "Stored per player", cStatus: "no", tvStatus: "yes" },
          { feature: "Pairings & Tee Times", competitor: "Manual spreadsheets", teevents: "Drag-and-drop, auto-notify", cStatus: "no", tvStatus: "yes" },
          { feature: "Volunteer Check-in", competitor: "Not available", teevents: "QR code, shift scheduling", cStatus: "no", tvStatus: "yes" },
          { feature: "50/50 Raffles & Auctions", competitor: "Not available", teevents: "Built-in auction system", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Pricing",
        rows: [
          { feature: "Platform Fee", competitor: "3.7% + $1.79/ticket", teevents: "5%", cStatus: "warn", tvStatus: "yes" },
          { feature: "Payment Processing Fee", competitor: "2.9% + $0.30 (extra)", teevents: "2.9% + $0.30 (Stripe)", cStatus: "warn", tvStatus: "warn" },
          { feature: "Total on $100 Registration", competitor: "~$8.69+", teevents: "$8.20", cStatus: "no", tvStatus: "yes" },
          { feature: "Monthly Subscription", competitor: "No (per-event fees)", teevents: "No", cStatus: "yes", tvStatus: "yes" },
          { feature: "Pass Fees to Golfers", competitor: "Not transparent", teevents: "Yes (toggle on/off)", cStatus: "warn", tvStatus: "yes" },
        ],
      },
      {
        category: "Payouts",
        rows: [
          { feature: "Payout Speed", competitor: "Holds funds until after event", teevents: "Automatic split at checkout", cStatus: "no", tvStatus: "yes" },
          { feature: "Who Holds Funds", competitor: "Eventbrite holds everything", teevents: "Stripe holds — TeeVents never touches", cStatus: "no", tvStatus: "yes" },
          { feature: "Fund Holds", competitor: "Arbitrary, unclear", teevents: "None — Stripe sends net proceeds directly", cStatus: "no", tvStatus: "yes" },
          { feature: "Withdraw Funds", competitor: "Wait for Eventbrite payout", teevents: "Withdraw from your Stripe anytime", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Customization",
        rows: [
          { feature: "Branded Tournament Site", competitor: "Limited", teevents: "Full branding", cStatus: "warn", tvStatus: "yes" },
          { feature: "Custom Domain", competitor: "Limited", teevents: "Free (CNAME setup)", cStatus: "warn", tvStatus: "yes" },
          { feature: "Embed Leaderboard", competitor: "No", teevents: "Yes (iframe)", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Support",
        rows: [
          { feature: "Customer Support", competitor: "AI bots, unresponsive", teevents: "Direct email (info@teevents.golf)", cStatus: "no", tvStatus: "yes" },
          { feature: "Phone Support", competitor: "No", teevents: "Available for Pro plans", cStatus: "no", tvStatus: "yes" },
          { feature: "Onboarding Help", competitor: "No", teevents: "Free setup assistance", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Trust & Safety",
        rows: [
          { feature: "Golf-Specific Experience", competitor: "No", teevents: "Built by golf tournament experts", cStatus: "no", tvStatus: "yes" },
          { feature: "Organizer Reviews", competitor: "Mixed (fees, support complaints)", teevents: "Positive (golf-focused)", cStatus: "warn", tvStatus: "yes" },
          { feature: "Platform Transparency", competitor: "Hidden fees", teevents: "Clear, simple pricing", cStatus: "warn", tvStatus: "yes" },
        ],
      },
    ],
  },
  {
    id: "givebutter",
    name: "Givebutter",
    tagline: "Givebutter is a general fundraising platform. TeeVents is purpose-built for golf tournaments.",
    hookCtaTitle: "Ready to Run a Real Golf Tournament?",
    sections: [
      {
        category: "Golf-Specific Features",
        rows: [
          { feature: "Live Leaderboard", competitor: "Not available", teevents: "Built-in, real-time, embeddable", cStatus: "no", tvStatus: "yes" },
          { feature: "Pairings & Tee Times", competitor: "Not available", teevents: "Drag-and-drop, auto-notify", cStatus: "no", tvStatus: "yes" },
          { feature: "Handicap Tracking", competitor: "Not available", teevents: "Stored per player", cStatus: "no", tvStatus: "yes" },
          { feature: "8 Scoring Formats", competitor: "Not available", teevents: "Stroke, Stableford, Scramble, more", cStatus: "no", tvStatus: "yes" },
          { feature: "Hole Sponsor Portal", competitor: "Logo only", teevents: "Asset delivery + ROI reports", cStatus: "warn", tvStatus: "yes" },
          { feature: "Volunteer Check-in", competitor: "Not available", teevents: "QR code, shift scheduling", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Fundraising",
        rows: [
          { feature: "Donations", competitor: "Strong", teevents: "Built-in donation collection", cStatus: "yes", tvStatus: "yes" },
          { feature: "Silent Auction", competitor: "Yes", teevents: "Yes — built-in auction system", cStatus: "yes", tvStatus: "yes" },
          { feature: "50/50 Raffles", competitor: "Yes", teevents: "Yes", cStatus: "yes", tvStatus: "yes" },
          { feature: "Add-On Store (mulligans, skins)", competitor: "Workaround", teevents: "Native add-on store", cStatus: "warn", tvStatus: "yes" },
          { feature: "Tax-Deductible Receipts", competitor: "Yes (501c3)", teevents: "Yes (501c3 nonprofit support)", cStatus: "yes", tvStatus: "yes" },
        ],
      },
      {
        category: "Pricing",
        rows: [
          { feature: "Platform Fee", competitor: "Free + optional donor tips", teevents: "5% platform fee", cStatus: "yes", tvStatus: "warn" },
          { feature: "Pro Tournament Tools", competitor: "Not available at any price", teevents: "$399 per tournament (one-time)", cStatus: "no", tvStatus: "yes" },
          { feature: "Payment Processing", competitor: "2.9% + $0.30", teevents: "2.9% + $0.30 (Stripe)", cStatus: "warn", tvStatus: "warn" },
        ],
      },
      {
        category: "Payouts",
        rows: [
          { feature: "Who Holds Funds", competitor: "Givebutter holds & disburses", teevents: "Stripe holds — TeeVents never touches", cStatus: "no", tvStatus: "yes" },
          { feature: "Payout Speed", competitor: "Scheduled disbursements", teevents: "Automatic, 3-7 business days", cStatus: "warn", tvStatus: "yes" },
        ],
      },
      {
        category: "Best For",
        rows: [
          { feature: "Pure Charity Fundraising", competitor: "Excellent", teevents: "Good", cStatus: "yes", tvStatus: "yes" },
          { feature: "Golf Tournaments with Scoring", competitor: "Not built for it", teevents: "Purpose-built", cStatus: "no", tvStatus: "yes" },
          { feature: "Sponsor Management", competitor: "Basic", teevents: "Full sponsor portal", cStatus: "warn", tvStatus: "yes" },
        ],
      },
    ],
  },
  {
    id: "venmo",
    name: "Venmo",
    tagline: "Venmo is a payment app. TeeVents is a complete tournament management platform.",
    hookCtaTitle: "Stop Chasing Venmo Payments — Run a Real Tournament",
    sections: [
      {
        category: "Registration & Player Management",
        rows: [
          { feature: "Online Registration Form", competitor: "Not available", teevents: "Branded, customizable form", cStatus: "no", tvStatus: "yes" },
          { feature: "Player Database", competitor: "Manual spreadsheet", teevents: "Built-in player list with CSV export", cStatus: "no", tvStatus: "yes" },
          { feature: "Waitlist Management", competitor: "Not available", teevents: "Automated 24-hour claim window", cStatus: "no", tvStatus: "yes" },
          { feature: "Group / Foursome Registration", competitor: "Not supported", teevents: "Native group registration", cStatus: "no", tvStatus: "yes" },
          { feature: "Automated Receipts", competitor: "Basic transaction record only", teevents: "Branded confirmation emails", cStatus: "warn", tvStatus: "yes" },
        ],
      },
      {
        category: "Tournament Operations",
        rows: [
          { feature: "Live Leaderboard", competitor: "Not available", teevents: "Built-in, real-time", cStatus: "no", tvStatus: "yes" },
          { feature: "Pairings & Tee Times", competitor: "Not available", teevents: "Drag-and-drop", cStatus: "no", tvStatus: "yes" },
          { feature: "Sponsor Management", competitor: "Not available", teevents: "Full sponsor portal", cStatus: "no", tvStatus: "yes" },
          { feature: "Volunteer Coordination", competitor: "Not available", teevents: "Shift scheduling + check-in", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Pricing & Payments",
        rows: [
          { feature: "Fee on $100 Payment", competitor: "1.9% + $0.10 (business profile)", teevents: "5% platform + 2.9% + $0.30 Stripe", cStatus: "yes", tvStatus: "warn" },
          { feature: "What You Get", competitor: "Just the payment", teevents: "Full tournament platform", cStatus: "warn", tvStatus: "yes" },
          { feature: "Refund Handling", competitor: "Manual, peer-to-peer", teevents: "Built-in refund workflow", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Reporting & Compliance",
        rows: [
          { feature: "Financial Reports", competitor: "Basic transaction list", teevents: "Full revenue, fees, payouts dashboard", cStatus: "warn", tvStatus: "yes" },
          { feature: "1099-K Handling", competitor: "May trigger personal 1099-K", teevents: "Routed through organizer Stripe account", cStatus: "warn", tvStatus: "yes" },
          { feature: "Professional Appearance", competitor: "Looks like a friend collecting cash", teevents: "Branded, professional event site", cStatus: "no", tvStatus: "yes" },
        ],
      },
    ],
  },
  {
    id: "google-forms",
    name: "Google Forms",
    tagline: "Google Forms collects data. TeeVents runs your tournament.",
    hookCtaTitle: "Stop Patching Together Google Forms + Spreadsheets",
    sections: [
      {
        category: "Registration & Payment",
        rows: [
          { feature: "Built-in Payment Collection", competitor: "Not available", teevents: "Integrated Stripe checkout", cStatus: "no", tvStatus: "yes" },
          { feature: "Branded Registration Page", competitor: "Generic Google form", teevents: "Fully branded tournament site", cStatus: "no", tvStatus: "yes" },
          { feature: "Confirmation Emails", competitor: "Basic auto-reply", teevents: "Branded receipts to all participants", cStatus: "warn", tvStatus: "yes" },
          { feature: "Group / Foursome Logic", competitor: "Manual workaround", teevents: "Native group registration", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Tournament Operations",
        rows: [
          { feature: "Live Leaderboard", competitor: "Not available", teevents: "Built-in, real-time", cStatus: "no", tvStatus: "yes" },
          { feature: "Pairings & Tee Times", competitor: "Manual spreadsheet", teevents: "Drag-and-drop interface", cStatus: "no", tvStatus: "yes" },
          { feature: "Scoring (8 Formats)", competitor: "Not available", teevents: "Stroke, Stableford, Scramble, more", cStatus: "no", tvStatus: "yes" },
          { feature: "Sponsor Management", competitor: "Not available", teevents: "Full sponsor portal", cStatus: "no", tvStatus: "yes" },
          { feature: "Volunteer Check-in", competitor: "Not available", teevents: "QR code + shift scheduling", cStatus: "no", tvStatus: "yes" },
          { feature: "Auctions & Raffles", competitor: "Not available", teevents: "Built-in auction system", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Data Management",
        rows: [
          { feature: "Player Database", competitor: "Spreadsheet only", teevents: "Searchable, exportable database", cStatus: "warn", tvStatus: "yes" },
          { feature: "Waitlist Management", competitor: "Manual", teevents: "Automated queue + claim window", cStatus: "no", tvStatus: "yes" },
          { feature: "Financial Reporting", competitor: "Manual reconciliation", teevents: "Full revenue + fee dashboard", cStatus: "no", tvStatus: "yes" },
          { feature: "CSV Export", competitor: "Yes", teevents: "Yes", cStatus: "yes", tvStatus: "yes" },
        ],
      },
      {
        category: "Cost vs. Value",
        rows: [
          { feature: "Software Cost", competitor: "Free", teevents: "5% platform fee or $399/tournament Pro", cStatus: "yes", tvStatus: "warn" },
          { feature: "Hours of Admin Work Saved", competitor: "0 — you do it all", teevents: "Dozens of hours per event", cStatus: "no", tvStatus: "yes" },
          { feature: "Risk of Errors", competitor: "High (manual everything)", teevents: "Low (automated workflows)", cStatus: "no", tvStatus: "yes" },
        ],
      },
    ],
  },
];

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "yes") return <Check className="h-4 w-4 text-green-600 inline mr-1.5" />;
  if (status === "no") return <X className="h-4 w-4 text-red-500 inline mr-1.5" />;
  return <AlertTriangle className="h-4 w-4 text-orange-500 inline mr-1.5" />;
};

const Compare = () => {
  const [selectedId, setSelectedId] = useState<string>(COMPARISONS[0].id);
  const selected = useMemo(() => COMPARISONS.find((c) => c.id === selectedId)!, [selectedId]);

  return (
    <Layout>
      <SEO
        title="Compare Golf Tournament Software"
        description="Compare TeeVents to Eventbrite, Givebutter, Venmo, and Google Forms. See why TeeVents is the smarter choice for golf tournaments."
        path="/compare"
      />

      {/* Hero */}
      <section className="bg-golf-green-dark text-primary-foreground pt-28 pb-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4 break-words">
              {selected.name} vs. TeeVents
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-8">
              {selected.tagline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={BOOK_DEMO_URL}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider transition-colors"
                style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
              >
                <Calendar className="h-4 w-4" /> Request a Sample
              </Link>
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider hover:bg-primary-foreground/10 transition-colors"
              >
                Start a Tournament for Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Selector */}
      <section className="py-8 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Compare TeeVents to:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {COMPARISONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedId === c.id
                    ? "bg-[#1a5c38] text-white shadow-md"
                    : "bg-background border hover:border-[#1a5c38]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-8">
            Feature-by-Feature Comparison
          </h2>

          {/* Desktop / tablet table */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30%] font-bold text-foreground">Feature</TableHead>
                  <TableHead className="w-[35%] text-center">
                    <span className="text-red-600 font-bold">{selected.name}</span>
                  </TableHead>
                  <TableHead className="w-[35%] text-center">
                    <span className="font-bold" style={{ color: "#1a5c38" }}>TeeVents</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.sections.map((section) => (
                  <>
                    <TableRow key={`${selected.id}-${section.category}`} className="bg-muted/30">
                      <TableCell colSpan={3} className="font-bold text-foreground text-sm uppercase tracking-wider py-3">
                        {section.category}
                      </TableCell>
                    </TableRow>
                    {section.rows.map((row) => (
                      <TableRow key={`${selected.id}-${section.category}-${row.feature}`}>
                        <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          <StatusIcon status={row.cStatus} />
                          {row.competitor}
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

          {/* Mobile stacked layout */}
          <div className="md:hidden space-y-6">
            {selected.sections.map((section) => (
              <div key={`m-${selected.id}-${section.category}`} className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 font-bold text-sm uppercase tracking-wider">
                  {section.category}
                </div>
                <div className="divide-y">
                  {section.rows.map((row) => (
                    <div key={`m-${section.category}-${row.feature}`} className="p-4 space-y-2">
                      <p className="font-semibold text-sm">{row.feature}</p>
                      <div className="rounded-md bg-muted/30 p-2 text-sm">
                        <p className="text-xs font-bold text-red-600 mb-1">{selected.name}</p>
                        <div className="flex gap-2">
                          <StatusIcon status={row.cStatus} />
                          <span className="break-words">{row.competitor}</span>
                        </div>
                      </div>
                      <div className="rounded-md p-2 text-sm" style={{ backgroundColor: "#f0f7f3" }}>
                        <p className="text-xs font-bold mb-1" style={{ color: "#1a5c38" }}>TeeVents</p>
                        <div className="flex gap-2" style={{ color: "#1a5c38" }}>
                          <StatusIcon status={row.tvStatus} />
                          <span className="break-words font-medium">{row.teevents}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-golf-green-dark">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4 break-words">
              {selected.hookCtaTitle}
            </h2>
            <p className="text-primary-foreground/70 mb-8">
              Join hundreds of golf tournament organizers who chose TeeVents for golf-specific tools, transparent pricing, and faster payouts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={BOOK_DEMO_URL}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider transition-colors"
                style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
              >
                <Calendar className="h-4 w-4" /> Request a Sample
              </Link>
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider hover:bg-primary-foreground/10 transition-colors"
              >
                Start a Tournament for Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Compare;

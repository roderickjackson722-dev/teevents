import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, AlertTriangle, ArrowRight, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const BOOK_DEMO_URL = "/request-sample";

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
    id: "golf-genius",
    name: "Golf Genius",
    tagline: "TeeVents gives you everything Golf Genius offers — at a fraction of the cost.",
    hookCtaTitle: "Ready to Switch from Golf Genius?",
    sections: [
      {
        category: "Pricing & Commitment",
        rows: [
          { feature: "Pricing Model", competitor: "Annual subscription + per-golfer fees", teevents: "$0 upfront + 5% platform fee", cStatus: "warn", tvStatus: "yes" },
          { feature: "Contract", competitor: "Annual contract required", teevents: "No long-term commitment", cStatus: "no", tvStatus: "yes" },
          { feature: "Setup Fees", competitor: "Often charged at onboarding", teevents: "None", cStatus: "warn", tvStatus: "yes" },
        ],
      },
      {
        category: "Tournament Features",
        rows: [
          { feature: "Pin Sheets (Hole Locations)", competitor: "Not native", teevents: "Built-in PDF generator", cStatus: "no", tvStatus: "yes" },
          { feature: "Auctions & Raffles", competitor: "Limited / add-on", teevents: "Native silent auction + raffle", cStatus: "warn", tvStatus: "yes" },
          { feature: "Sponsorship Portal", competitor: "Basic logo placement", teevents: "Full asset delivery + ROI reports", cStatus: "warn", tvStatus: "yes" },
          { feature: "Volunteer Management", competitor: "Not native", teevents: "Built-in QR check-in & scheduling", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Experience",
        rows: [
          { feature: "Learning Curve", competitor: "Steeper — designed for course pros", teevents: "Low — intuitive dashboard", cStatus: "warn", tvStatus: "yes" },
          { feature: "Onboarding Time", competitor: "Hours to days", teevents: "Published in under 60 seconds", cStatus: "warn", tvStatus: "yes" },
        ],
      },
    ],
  },
  {
    id: "zeffy",
    name: "Zeffy",
    tagline: "Zeffy handles donations. TeeVents runs your whole golf tournament.",
    hookCtaTitle: "Ready for Professional Golf Tools?",
    sections: [
      {
        category: "Golf-Specific Features",
        rows: [
          { feature: "Live Leaderboard", competitor: "Not available", teevents: "Built-in, real-time", cStatus: "no", tvStatus: "yes" },
          { feature: "Mobile Scoring", competitor: "Not available", teevents: "Yes — no app download required", cStatus: "no", tvStatus: "yes" },
          { feature: "Pairings & Tee Times", competitor: "No", teevents: "Drag-and-drop scheduling", cStatus: "no", tvStatus: "yes" },
          { feature: "Skins & Handicaps", competitor: "No", teevents: "Native golf calculations", cStatus: "no", tvStatus: "yes" },
        ],
      },
      {
        category: "Tournament Management",
        rows: [
          { feature: "Sponsorship Packages", competitor: "Limited", teevents: "Yes — dedicated sponsor portal", cStatus: "warn", tvStatus: "yes" },
          { feature: "Auction with mobile bidding", competitor: "Basic", teevents: "Yes — native auctions", cStatus: "warn", tvStatus: "yes" },
          { feature: "Branded tournament website", competitor: "Basic form page", teevents: "Full custom event site", cStatus: "no", tvStatus: "yes" },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const v = searchParams.get("v");
  
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (v && COMPARISONS.some(c => c.id === v)) return v;
    return COMPARISONS[0].id;
  });

  useEffect(() => {
    if (v && COMPARISONS.some(c => c.id === v)) {
      setSelectedId(v);
    }
  }, [v]);

  const selected = useMemo(() => COMPARISONS.find((c) => c.id === selectedId)!, [selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSearchParams({ v: id });
  };

  return (
    <Layout>
      <SEO
        title="Compare Golf Tournament Software"
        description="Compare TeeVents to Eventbrite, Golf Genius, Zeffy, Givebutter, and Google Forms. See why TeeVents is the smarter choice for golf tournaments."
        path="/compare"
      />

      {/* Hero */}
      <section className="bg-golf-green-dark text-primary-foreground pt-28 pb-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={selected.id}>
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
                to="/signup?interest=tournament"
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
                onClick={() => handleSelect(c.id)}
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

          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%] font-bold text-foreground p-4">Feature</TableHead>
                  <TableHead className="w-[30%] text-center p-4">{selected.name}</TableHead>
                  <TableHead className="w-[30%] text-center p-4 bg-primary/5 text-primary font-bold">TeeVents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.sections.map((section) => (
                  <tr key={section.category} className="border-b border-border bg-muted/20">
                    <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {section.category}
                    </td>
                  </tr>
                )).concat(
                  selected.sections.flatMap((section) =>
                    section.rows.map((row) => (
                      <TableRow key={row.feature} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <TableCell className="p-4 font-medium text-foreground">{row.feature}</TableCell>
                        <TableCell className="p-4 text-center text-muted-foreground">
                          <StatusIcon status={row.cStatus} /> {row.competitor}
                        </TableCell>
                        <TableCell className="p-4 text-center font-semibold text-primary bg-primary/5">
                          <StatusIcon status={row.tvStatus} /> {row.teevents}
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {/* Call to action */}
          <div className="mt-16 bg-golf-green-dark rounded-2xl p-8 md:p-12 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h3 className="text-2xl md:text-4xl font-display font-bold mb-4">
                {selected.hookCtaTitle}
              </h3>
              <p className="text-lg text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
                Join thousands of organizers who have simplified their tournament planning and increased their revenue with TeeVents.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup?interest=tournament"
                  className="bg-secondary text-secondary-foreground px-10 py-4 rounded-md font-bold text-sm uppercase tracking-wider hover:bg-secondary/90 transition-all shadow-lg"
                >
                  Create My Tournament
                </Link>
                <Link
                  to={BOOK_DEMO_URL}
                  className="bg-white/10 text-primary-foreground border border-white/20 px-10 py-4 rounded-md font-bold text-sm uppercase tracking-wider hover:bg-white/20 transition-all"
                >
                  See a Demo
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Compare;

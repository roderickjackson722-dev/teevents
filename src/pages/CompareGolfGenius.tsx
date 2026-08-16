import { Link } from "react-router-dom";
import { Check, X, AlertTriangle, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type Status = "yes" | "no" | "warn";
interface Row { feature: string; teevents: string; gg: string; tv: Status; ggs: Status; }
interface Section { category: string; rows: Row[]; }

const data: Section[] = [
  {
    category: "Pricing & Commitment",
    rows: [
      { feature: "Pricing Model", teevents: "$399 per tournament (one-time) + 5% platform fee", gg: "Annual subscription + per-golfer fees", tv: "yes", ggs: "warn" },
      { feature: "Contract", teevents: "No long-term commitment — pay per tournament", gg: "Annual contract required", tv: "yes", ggs: "no" },
      { feature: "Setup Fees", teevents: "None", gg: "Often charged at onboarding", tv: "yes", ggs: "warn" },
    ],
  },
  {
    category: "Tournament Features",
    rows: [
      { feature: "Player Gifts / Merchandise Store", teevents: "Included in Pro", gg: "Requires TM Premium upgrade", tv: "yes", ggs: "warn" },
      { feature: "Live Leaderboard & Mobile Scoring", teevents: "Included in Pro", gg: "Often gated behind premium tier", tv: "yes", ggs: "warn" },
      { feature: "Pin Sheets (Hole Locations)", teevents: "Built-in PDF generator", gg: "Not native — third-party tool needed", tv: "yes", ggs: "no" },
      { feature: "Auctions & Raffles", teevents: "Native silent auction + raffle with auto-draw", gg: "Limited / add-on", tv: "yes", ggs: "warn" },
      { feature: "Sponsorship Portal", teevents: "Tiered packages, logo upload, custom sponsorship fields", gg: "Basic logo placement", tv: "yes", ggs: "warn" },
      { feature: "Volunteer Management & QR Check-in", teevents: "Built-in", gg: "Not native", tv: "yes", ggs: "no" },
    ],
  },
  {
    category: "Tournament Website",
    rows: [
      { feature: "Custom Domain", teevents: "White-label custom domain support", gg: "Limited branding", tv: "yes", ggs: "warn" },
      { feature: "Site Builder", teevents: "6 professional templates, drag-and-drop sections", gg: "Basic event page", tv: "yes", ggs: "warn" },
      { feature: "SEO-optimized Public Pages", teevents: "Yes", gg: "Limited", tv: "yes", ggs: "warn" },
    ],
  },
  {
    category: "Experience",
    rows: [
      { feature: "Audience", teevents: "Tournament organizers, charities, courses", gg: "Primarily golf course operations", tv: "yes", ggs: "warn" },
      { feature: "Learning Curve", teevents: "Low — intuitive dashboard", gg: "Steeper — designed for course pros", tv: "yes", ggs: "warn" },
      { feature: "Onboarding Time", teevents: "Under 60 seconds to a published site", gg: "Hours to days with rep walkthrough", tv: "yes", ggs: "warn" },
    ],
  },
  {
    category: "Payments & Payouts",
    rows: [
      { feature: "Direct-to-organizer Payments", teevents: "Stripe Connect Direct Charges — organizer is merchant of record", gg: "Funds often held by platform", tv: "yes", ggs: "warn" },
      { feature: "Fee Transparency", teevents: "5% TeeVents fee + Stripe shown on checkout", gg: "Bundled / opaque per-golfer fees", tv: "yes", ggs: "warn" },
      { feature: "Pass Fees to Players", teevents: "Toggle on/off", gg: "Limited", tv: "yes", ggs: "warn" },
    ],
  },
];

const StatusIcon = ({ s }: { s: Status }) =>
  s === "yes" ? <Check className="h-4 w-4 text-green-600 inline-block mr-1" /> :
  s === "no" ? <X className="h-4 w-4 text-red-600 inline-block mr-1" /> :
  <AlertTriangle className="h-4 w-4 text-amber-600 inline-block mr-1" />;

export default function CompareGolfGenius() {
  return (
    <Layout>
      <SEO
        title="TeeVents vs Golf Genius — Compare Tournament Software"
        description="Side-by-side comparison of TeeVents and Golf Genius. Simpler pricing, built-in pin sheets, no annual contract."
      />
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold">TeeVents vs. Golf Genius</h1>
          <p className="text-lg text-muted-foreground">
            Why tournament organizers and courses are switching to TeeVents.
          </p>
        </header>

        {data.map((section) => (
          <section key={section.category} className="space-y-3">
            <h2 className="text-xl font-semibold">{section.category}</h2>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Feature</TableHead>
                    <TableHead className="bg-primary/5">TeeVents</TableHead>
                    <TableHead>Golf Genius</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.rows.map((r) => (
                    <TableRow key={r.feature}>
                      <TableCell className="font-medium">{r.feature}</TableCell>
                      <TableCell className="bg-primary/5"><StatusIcon s={r.tv} />{r.teevents}</TableCell>
                      <TableCell><StatusIcon s={r.ggs} />{r.gg}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ))}

        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center space-y-3">
          <h3 className="text-2xl font-semibold">The bottom line</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            TeeVents gives you everything Golf Genius offers — plus built-in pin sheets,
            no long-term contract, and simpler pricing.
          </p>
          <Link
            to="/request-sample"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Request a Sample <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Layout>
  );
}

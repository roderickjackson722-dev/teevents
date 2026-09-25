import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface CompRow {
  feature: string;
  eventbrite: string;
  teevents: string;
  isYesNo?: boolean;
}

const rows: CompRow[] = [
  { feature: "Cost per tournament", eventbrite: "3.7% + $1.79/ticket + 2.9% processing", teevents: "$150 flat" },
  { feature: "$150 ticket (144 players)", eventbrite: "~$958", teevents: "$150" },
  { feature: "$250 ticket (144 players)", eventbrite: "~$1,323", teevents: "$150" },
  { feature: "$500 ticket (144 players)", eventbrite: "~$2,113", teevents: "$150" },
  { feature: "Payout timing", eventbrite: "After event (3-7 business days)", teevents: "Immediately" },
  { feature: "Live Leaderboard", eventbrite: "No", teevents: "Yes", isYesNo: true },
  { feature: "Mobile Scoring", eventbrite: "No", teevents: "Yes", isYesNo: true },
  { feature: "Pairings & Tee Times", eventbrite: "No", teevents: "Yes", isYesNo: true },
  { feature: "Scorecards & Flights", eventbrite: "No", teevents: "Yes", isYesNo: true },
  { feature: "Handicap & GHIN", eventbrite: "No", teevents: "Yes", isYesNo: true },
  { feature: "Skins & Deuces", eventbrite: "No", teevents: "Yes", isYesNo: true },
  { feature: "Built for Golf", eventbrite: "No", teevents: "Yes", isYesNo: true },
];

const gold = "#F5A623";
const green = "#1a5c38";

const CompareTeeventsVsEventbrite = () => {
  return (
    <Layout>
      <SEO
        title="TeeVents vs. Eventbrite — Stop Paying Eventbrite Fees | TeeVents"
        description="Side-by-side comparison: Eventbrite vs. TeeVents for golf tournaments. Flat $150 per tournament vs. 3.7% + per-ticket fees, faster payouts, and golf-specific features Eventbrite doesn't offer."
      />

      {/* Hero */}
      <section className="text-primary-foreground pt-28 pb-16" style={{ backgroundColor: green }}>
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Stop Paying Eventbrite Fees. Start Keeping Your Revenue.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-8">
              See why tournament organizers are switching to TeeVents.
            </p>
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider transition-colors"
              style={{ backgroundColor: gold, color: green }}
            >
              Get Started — Free for Organizers <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-8 text-center">
            Eventbrite vs. TeeVents
          </h2>

          {/* Mobile-friendly table */}
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[30%] font-bold text-foreground min-w-[160px]">Feature</TableHead>
                    <TableHead className="w-[35%] text-center min-w-[180px]">
                      <span className="font-bold">Eventbrite</span>
                    </TableHead>
                    <TableHead className="w-[35%] text-center min-w-[160px]" style={{ backgroundColor: "rgba(245, 166, 35, 0.12)" }}>
                      <span className="font-bold" style={{ color: gold }}>TeeVents</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                      <TableCell className="text-center">
                        {row.isYesNo ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <X className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="hidden sm:inline">{row.eventbrite}</span>
                            <span className="sm:hidden">{row.eventbrite}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{row.eventbrite}</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-center font-semibold"
                        style={{ backgroundColor: "rgba(245, 166, 35, 0.12)", color: green }}
                      >
                        {row.isYesNo ? (
                          <span className="inline-flex items-center justify-center gap-1.5">
                            <Check className="h-4 w-4 shrink-0" style={{ color: "#16a34a" }} />
                            {row.teevents}
                          </span>
                        ) : (
                          row.teevents
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Callout Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-xl p-8 text-center shadow-sm"
            style={{ backgroundColor: green, color: "#ffffff" }}
          >
            <p className="text-2xl md:text-4xl font-display font-bold" style={{ color: gold }}>
              Save $2,000 per tournament with TeeVents.
            </p>
          </motion.div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md font-bold text-sm uppercase tracking-wider transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: gold, color: green }}
            >
              Get Started — Free for Organizers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom band */}
      <section className="py-12" style={{ backgroundColor: green }}>
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <p className="text-primary-foreground/70">
            Flat pricing, instant payouts, and the golf features Eventbrite was never built to offer.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default CompareTeeventsVsEventbrite;

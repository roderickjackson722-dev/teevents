import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, ArrowRight, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

type Cell = { text: string; status?: "yes" | "no" | "warn" };
type Row = { feature: string; teevents: Cell; competitor: Cell };
type Comparison = {
  id: string;
  name: string;
  tagline: string;
  differentiator: string;
  rows: Row[];
};

const yes = (text: string): Cell => ({ text, status: "yes" });
const no = (text: string): Cell => ({ text, status: "no" });
const warn = (text: string): Cell => ({ text, status: "warn" });
const txt = (text: string): Cell => ({ text });

const COMPARISONS: Comparison[] = [
  {
    id: "eventbrite",
    name: "Eventbrite",
    tagline: "General ticketing platform",
    differentiator: "Eventbrite is a general ticketing platform. TeeVents is built specifically for golf tournaments.",
    rows: [
      { feature: "Pricing Model", teevents: txt("5% platform fee + Stripe processing fees"), competitor: warn("3.5% + $1.79 per ticket plus 2.9% + $0.30 processing — often over 8%") },
      { feature: "Payout Speed", teevents: yes("Automatic, 1–3 business days via Stripe Connect"), competitor: no("Delayed payout schedule after the event") },
      { feature: "Live Leaderboard", teevents: yes("Built-in, real-time, embeddable"), competitor: no("Not available") },
      { feature: "Sponsor Management", teevents: yes("Dedicated sponsor portal with asset delivery and ROI"), competitor: no("Basic logo placement only") },
      { feature: "Volunteer Check-in", teevents: yes("QR code check-in and shift scheduling"), competitor: no("Not available") },
      { feature: "Golf-Specific Tools", teevents: yes("Pairings, handicaps, 8 scoring formats"), competitor: no("No golf-specific features") },
      { feature: "Customer Support", teevents: yes("Direct support from golf industry experts"), competitor: no("Poor reputation; hard to reach a human") },
    ],
  },
  {
    id: "event-caddy",
    name: "Event Caddy",
    tagline: "Subscription golf tournament software",
    differentiator: "TeeVents offers transparent, pay-per-use pricing with no upfront commitment.",
    rows: [
      { feature: "Pricing Model", teevents: yes("$399 per tournament (one-time). No monthly fees."), competitor: warn("$660 per year — subscription required even for one event") },
      { feature: "Live Scoring", teevents: yes("Included in Pro plan"), competitor: yes("Included") },
      { feature: "Sponsor Management", teevents: yes("Included in Pro plan"), competitor: yes("Included") },
      { feature: "Auction & Raffle", teevents: yes("Included in Pro plan"), competitor: yes("Included") },
      { feature: "Budget Tracking", teevents: yes("Included in Pro plan"), competitor: yes("Included") },
      { feature: "SMS Messaging", teevents: yes("Included in Pro plan"), competitor: yes("Included") },
      { feature: "Value for Money", teevents: yes("Pay only when you host an event"), competitor: warn("Lower value for organizations running 1–2 events per year") },
    ],
  },
  {
    id: "perfect-golf-event",
    name: "Perfect Golf Event",
    tagline: "Software + service packages",
    differentiator: "TeeVents provides full tournament management software, not just a planning service.",
    rows: [
      { feature: "Pricing Model", teevents: yes("$399 per tournament (one-time)"), competitor: warn("Tiered packages plus add-ons like hole-in-one insurance") },
      { feature: "Core Offering", teevents: yes("Self-service software for full management"), competitor: warn("Blend of software and service packages") },
      { feature: "Real-Time Scoring", teevents: yes("Powerful mobile scoring for players"), competitor: yes("Included in Ace plan") },
      { feature: "Built-in Fundraising", teevents: yes("Donations, auctions, raffles, add-on store"), competitor: warn("Strong, but often requires selling additional contests") },
      { feature: "Control", teevents: yes("Organizer retains full control"), competitor: warn("Some control may be ceded with service packages") },
    ],
  },
  {
    id: "givebutter",
    name: "Givebutter",
    tagline: "General fundraising platform",
    differentiator: "TeeVents is an all-in-one tournament management platform, not just a fundraising tool.",
    rows: [
      { feature: "Primary Focus", teevents: yes("Golf tournament management"), competitor: warn("General fundraising (auctions, donations, ticketing)") },
      { feature: "Golf-Specific Tools", teevents: yes("Scoring, pairings, tee sheets, handicaps"), competitor: no("None — adaptable but no dedicated features") },
      { feature: "Pricing Model", teevents: txt("$399 per tournament (Pro) or Free tier"), competitor: txt("Free with optional donor tips, or small platform fee") },
      { feature: "Payouts", teevents: yes("Stripe Connect (1–3 days)"), competitor: warn("Held and paid out by Givebutter") },
      { feature: "Best For", teevents: yes("Organizers needing a complete golf tournament solution"), competitor: warn("Simple charity golf events without scoring/pairings") },
    ],
  },
  {
    id: "venmo",
    name: "Venmo",
    tagline: "Peer-to-peer payment app",
    differentiator: "TeeVents is a professional tournament management platform, not a peer-to-peer payment app.",
    rows: [
      { feature: "Primary Use", teevents: yes("Professional registration, management, and payouts"), competitor: no("Peer-to-peer payments between individuals") },
      { feature: "Registration Management", teevents: yes("Player database, CSV export, waitlist"), competitor: no("None — organizers manually track who paid") },
      { feature: "Fee Structure", teevents: txt("5% platform fee + Stripe fees"), competitor: txt("1.9% + $0.10 instant transfer (business profiles)") },
      { feature: "Professionalism", teevents: yes("Branded tournament site, automated receipts"), competitor: no("Informal, cash app-style") },
      { feature: "Reporting", teevents: yes("Full financial reports, 1099-K friendly"), competitor: no("Limited reporting for organizers") },
      { feature: "Bottom Line", teevents: yes("Complete system for running a tournament"), competitor: no("Payment method that adds admin work") },
    ],
  },
  {
    id: "google-forms",
    name: "Google Forms",
    tagline: "Free static form builder",
    differentiator: "TeeVents is an automated tournament management system, not a static form.",
    rows: [
      { feature: "Primary Use", teevents: yes("Full tournament management"), competitor: no("Simple data collection only") },
      { feature: "Payment Collection", teevents: yes("Integrated Stripe checkout"), competitor: no("Impossible — requires a separate payment link") },
      { feature: "Live Leaderboard", teevents: yes("Built-in and auto-updating"), competitor: no("Manual updates required") },
      { feature: "Data Management", teevents: yes("Automated player lists, CSV export, status tracking"), competitor: no("Manual spreadsheet entry") },
      { feature: "Pairings & Tee Times", teevents: yes("Drag-and-drop interface"), competitor: no("Manual spreadsheet management") },
      { feature: "Bottom Line", teevents: yes("All-in-one solution that saves hours of admin work"), competitor: no("Manual, fragmented, error-prone process") },
    ],
  },
  {
    id: "golfstatus",
    name: "GolfStatus",
    tagline: "Free platform with paid add-ons",
    differentiator: "TeeVents offers simpler, more transparent pricing with no tricky add-ons.",
    rows: [
      { feature: "Pricing Model", teevents: yes("$399 per tournament (one-time). Simple and transparent."), competitor: warn("Free upfront, but charges for essential features") },
      { feature: "Live Scoring", teevents: yes("Included in Pro plan"), competitor: no("Paid add-on — $299 per event") },
      { feature: "Sponsor Invoicing", teevents: yes("Included in Pro plan"), competitor: no("Paid add-on — $199 per event") },
      { feature: "Core Platform", teevents: yes("Full tournament management"), competitor: warn("Full management, but costs add up quickly") },
      { feature: "Best For", teevents: yes("Organizers wanting a simple, all-inclusive price"), competitor: warn("Nonprofits without scoring/invoicing needs") },
    ],
  },
];

function StatusIcon({ status }: { status?: Cell["status"] }) {
  if (status === "yes") return <Check className="h-5 w-5 text-[#1a5c38] flex-shrink-0" aria-label="Included" />;
  if (status === "no") return <X className="h-5 w-5 text-destructive flex-shrink-0" aria-label="Not included" />;
  if (status === "warn") return <span className="text-amber-600 font-bold flex-shrink-0" aria-label="Limited">!</span>;
  return null;
}

const Compare = () => {
  const [selectedId, setSelectedId] = useState<string>(COMPARISONS[0].id);
  const selected = useMemo(() => COMPARISONS.find((c) => c.id === selectedId)!, [selectedId]);

  return (
    <Layout>
      <SEO
        title="Compare Golf Tournament Software"
        description="Compare TeeVents to Eventbrite, Event Caddy, GolfStatus, Givebutter, Venmo, Google Forms and more. See why TeeVents is the smarter choice for golf tournaments."
        path="/compare"
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a5c38] to-[#0f3d24] text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 break-words">
            Why TeeVents is the smarter choice for golf tournaments.
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Side-by-side comparisons against the platforms organizers consider most.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
              <Link to="/get-started">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
              <Link to="/book"><Calendar className="mr-2 h-4 w-4" />Book a Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Selector */}
      <section className="py-10 bg-muted/30 border-b">
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

      {/* Comparison */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <Card className="mb-8 border-[#1a5c38]/20 bg-[#1a5c38]/5">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider text-[#1a5c38] font-semibold mb-2">
                Key Differentiator
              </p>
              <p className="text-lg md:text-xl font-medium">{selected.differentiator}</p>
            </CardContent>
          </Card>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[28%] font-semibold">Feature</TableHead>
                  <TableHead className="bg-[#1a5c38]/10 font-bold text-[#1a5c38]">TeeVents</TableHead>
                  <TableHead className="font-semibold">{selected.name}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.rows.map((r) => (
                  <TableRow key={r.feature}>
                    <TableCell className="font-medium align-top">{r.feature}</TableCell>
                    <TableCell className="bg-[#1a5c38]/5 align-top">
                      <div className="flex gap-2">
                        <StatusIcon status={r.teevents.status} />
                        <span className="break-words">{r.teevents.text}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex gap-2">
                        <StatusIcon status={r.competitor.status} />
                        <span className="break-words">{r.competitor.text}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {selected.rows.map((r) => (
              <Card key={r.feature}>
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    {r.feature}
                  </p>
                  <div className="rounded-md bg-[#1a5c38]/5 border border-[#1a5c38]/20 p-3">
                    <p className="text-xs font-bold text-[#1a5c38] mb-1">TeeVents</p>
                    <div className="flex gap-2">
                      <StatusIcon status={r.teevents.status} />
                      <span className="text-sm break-words">{r.teevents.text}</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/40 border p-3">
                    <p className="text-xs font-bold mb-1">{selected.name}</p>
                    <div className="flex gap-2">
                      <StatusIcon status={r.competitor.status} />
                      <span className="text-sm break-words">{r.competitor.text}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30 border-t">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to run a better tournament?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join organizers who switched to TeeVents for transparent pricing, fast payouts, and golf-specific tools.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
              <Link to="/get-started">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book"><Calendar className="mr-2 h-4 w-4" />Book a Demo</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/plans">See Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Compare;

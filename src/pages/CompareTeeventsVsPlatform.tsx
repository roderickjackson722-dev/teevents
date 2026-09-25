import { Check, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

type Row = { feature: string; them: string; teevents: string; yesNo?: boolean };

const golfRows: Row[] = [
  { feature: "Live Leaderboard", them: "No", teevents: "Yes", yesNo: true },
  { feature: "Mobile Scoring", them: "No", teevents: "Yes", yesNo: true },
  { feature: "Pairings & Tee Times", them: "No", teevents: "Yes", yesNo: true },
  { feature: "Scorecards & Flights", them: "No", teevents: "Yes", yesNo: true },
  { feature: "Handicap & GHIN", them: "No", teevents: "Yes", yesNo: true },
  { feature: "Skins & Deuces", them: "No", teevents: "Yes", yesNo: true },
  { feature: "Built for Golf", them: "No", teevents: "Yes", yesNo: true },
];

export const PLATFORMS = {
  zeffy: {
    name: "Zeffy",
    headline: "Zeffy Handles Donations. TeeVents Runs Your Whole Tournament.",
    sub: "Zeffy is great for nonprofit fundraising forms — but it wasn't built to run a golf event.",
    callout: "Keep your fundraising — and add everything golf needs with TeeVents.",
    rows: [
      { feature: "Cost to organizer", them: "$0 (asks donors for a voluntary tip)", teevents: "$0 to start or $150 flat" },
      { feature: "Branded tournament website", them: "Basic form page", teevents: "Full custom event site" },
      { feature: "Sponsorship packages & hole signs", them: "Limited", teevents: "Yes" },
      { feature: "Auction with mobile bidding", them: "Basic", teevents: "Yes" },
      ...golfRows,
    ] as Row[],
  },
  givebutter: {
    name: "GiveButter",
    headline: "Stop Forcing a Fundraising Tool to Run a Golf Tournament.",
    sub: "GiveButter is built for campaigns. TeeVents is built for tee times, scorecards and leaderboards.",
    callout: "One platform for registration, sponsors, scoring and payouts.",
    rows: [
      { feature: "Cost to organizer", them: "Optional tips or platform fee + processing", teevents: "$0 to start or $150 flat" },
      { feature: "Branded tournament website", them: "Campaign page", teevents: "Full custom event site" },
      { feature: "Sponsorship packages & hole signs", them: "Generic tiers", teevents: "Golf-specific packages" },
      { feature: "QR check-in on event day", them: "Limited", teevents: "Yes" },
      ...golfRows,
    ] as Row[],
  },
  "google-forms": {
    name: "Google Forms",
    headline: "Outgrow the Spreadsheet. Run a Professional Tournament.",
    sub: "Google Forms collects names. TeeVents collects payments, builds pairings and scores the event.",
    callout: "Save hours of manual spreadsheet work on every tournament.",
    rows: [
      { feature: "Online payments", them: "No", teevents: "Yes", yesNo: true },
      { feature: "Automatic confirmation emails", them: "No", teevents: "Yes", yesNo: true },
      { feature: "Branded tournament website", them: "No", teevents: "Yes", yesNo: true },
      { feature: "Sponsor management", them: "No", teevents: "Yes", yesNo: true },
      { feature: "Waitlist & capacity limits", them: "No", teevents: "Yes", yesNo: true },
      ...golfRows,
    ] as Row[],
  },
} as const;

export type PlatformKey = keyof typeof PLATFORMS;

const CompareTeeventsVsPlatform = ({ platform }: { platform: PlatformKey }) => {
  const p = PLATFORMS[platform];
  return (
    <Layout>
      <SEO
        title={`TeeVents vs. ${p.name} — Golf Tournament Comparison | TeeVents`}
        description={`Side-by-side comparison of ${p.name} and TeeVents for golf tournaments: pricing, registration, sponsors, live scoring and more.`}
      />
      <section className="bg-primary text-primary-foreground pt-28 pb-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">{p.headline}</h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 mb-8">{p.sub}</p>
          <Link to="/get-started" className="inline-flex items-center gap-2 px-8 py-3 rounded-md font-semibold text-sm uppercase tracking-wider bg-secondary text-secondary-foreground">
            Get Started — No Cost for Organizers <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-display font-bold text-foreground mb-8 text-center">{p.name} vs. TeeVents</h2>
          <div className="rounded-xl border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-4 text-left font-bold text-foreground">Feature</th>
                  <th className="p-4 text-center font-bold text-foreground">{p.name}</th>
                  <th className="p-4 text-center font-bold text-secondary bg-secondary/10">TeeVents</th>
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.feature} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium text-foreground">{r.feature}</td>
                    <td className="p-4 text-center text-muted-foreground">
                      {r.yesNo ? <span className="inline-flex items-center gap-1.5"><X className="h-4 w-4 text-destructive" />{r.them}</span> : r.them}
                    </td>
                    <td className="p-4 text-center font-semibold text-primary bg-secondary/10">
                      {r.yesNo ? <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{r.teevents}</span> : r.teevents}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 rounded-xl p-8 text-center bg-primary">
            <p className="text-2xl md:text-3xl font-display font-bold text-secondary">{p.callout}</p>
          </div>
          <div className="mt-12 text-center">
            <Link to="/get-started" className="inline-flex items-center gap-2 px-10 py-4 rounded-md font-bold text-sm uppercase tracking-wider bg-secondary text-secondary-foreground">
              Get Started — No Cost for Organizers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CompareTeeventsVsPlatform;

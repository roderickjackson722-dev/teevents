import { ArrowRight, Calendar, ClipboardList, HandHeart, Ticket, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

const comparisons = [
  {
    name: "Eventbrite",
    description: "Compare ticket fees, payout timing, and golf-specific event tools.",
    to: "/compare/teevents-vs-eventbrite",
    icon: Ticket,
  },
  {
    name: "Golf Genius",
    description: "Compare annual commitments, event pricing, scoring, and course operations.",
    to: "/compare/golf-genius-vs-teevents",
    icon: Trophy,
  },
  {
    name: "Zeffy",
    description: "Compare donation forms with a complete golf tournament platform.",
    to: "/compare/teevents-vs-zeffy",
    icon: HandHeart,
  },
  {
    name: "GiveButter",
    description: "Compare general fundraising tools with golf-built event management.",
    to: "/compare/teevents-vs-givebutter",
    icon: Calendar,
  },
  {
    name: "Google Forms",
    description: "Compare spreadsheets and forms with registration, payments, pairings, and scoring.",
    to: "/compare/teevents-vs-google-forms",
    icon: ClipboardList,
  },
];

export default function Compare() {
  return (
    <Layout>
      <SEO
        title="Compare Golf Tournament Platforms | TeeVents"
        description="Choose a side-by-side comparison of TeeVents with Eventbrite, Golf Genius, Zeffy, GiveButter, or Google Forms."
        path="/compare"
      />

      <section className="bg-primary pb-16 pt-28 text-primary-foreground">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl">Compare TeeVents</h1>
          <p className="text-lg text-primary-foreground/75">
            Choose a platform to see how it compares with TeeVents for golf tournament management.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.name}
                to={comparison.to}
                className="group flex min-h-52 flex-col rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-secondary hover:shadow-md"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                  <comparison.icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">TeeVents vs. {comparison.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{comparison.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  View comparison <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

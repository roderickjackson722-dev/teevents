import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Check, GraduationCap, Monitor, Printer, QrCode, Smartphone,
  Users, LayoutTemplate, Trophy, Shuffle,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { COLLEGE_SCORING_CENTS, dollars } from "@/lib/addonPricing";

const capabilities = [
  {
    icon: Smartphone,
    title: "Live mobile scoring — no app download",
    desc: "Coaches, players and scoring staff score straight from any phone browser. Nothing to install, nothing to update, works on any device on the course.",
  },
  {
    icon: QrCode,
    title: "QR codes for live scoring",
    desc: "Generate a QR code per group, team or scorer. Scan and start posting scores in seconds — with 6-digit passcodes for scoring-only access.",
  },
  {
    icon: Monitor,
    title: "Leaderboard on a monitor + shareable URL",
    desc: "A full-screen display view for clubhouse monitors and TVs, plus a public leaderboard URL you can share with families, media and athletic departments.",
  },
  {
    icon: Users,
    title: "Team rosters, any size",
    desc: "Build rosters with as many players per team as your event needs. Assign teams to divisions, track WD/DQ, and import or add players in bulk.",
  },
  {
    icon: Trophy,
    title: "Flexible counting scores",
    desc: "Set up how the event plays: five players counting the best four, or any team size and counting-score combination you run. Division and team standings calculate live.",
  },
  {
    icon: Printer,
    title: "Custom printables",
    desc: "Scorecards, pairing sheets, cart signs, alpha lists, check-in rosters and name badges — all customizable with your logo, colors, fonts and content.",
  },
  {
    icon: LayoutTemplate,
    title: "Pairings templates & setup",
    desc: "Save reusable pairing templates for threesomes or foursomes, with tee-time or shotgun structures you can apply to any round.",
  },
  {
    icon: Shuffle,
    title: "Round-by-round formats",
    desc: "Drag players onto specific holes for a shotgun start or into tee-time slots, and change the format per round when your event calls for it.",
  },
];

const included = [
  "Unlimited divisions within your purchased tier (1–4)",
  "Team scoring with your own counting-score rule",
  "Up to 54 holes (3 rounds) with per-round validation",
  "Fast Entry Mode with auto-tabbing for 100+ players",
  "Search and filter by team, player or group",
  "Withdrawal (WD) and disqualification (DQ) statuses",
  "Live division and team standings as scores are entered",
  "Scoring staff logins with 6-digit passcodes (scoring access only)",
];

/** Public detail page for the College Golf Scoring & Leaderboard add-on. */
const CollegeGolfScoring = () => {
  return (
    <Layout>
      <SEO
        title="College Golf Scoring & Leaderboard | TeeVents"
        description="Live mobile scoring with no app download, QR scoring codes, monitor leaderboard display, customizable printables and pairings templates for college golf events."
        path="/college-golf-scoring"
      />

      {/* Hero */}
      <section className="bg-primary pt-24 pb-14">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5">
              <GraduationCap className="h-3.5 w-3.5" /> College Golf
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              College Golf Scoring &amp; Leaderboard
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              Everything a collegiate event needs: live scoring from any phone with no app download, QR scoring
              codes, a leaderboard built for clubhouse monitors, customizable printables and reusable pairings
              templates.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/checkout/college-scoring"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Continue to Checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                See Pricing
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Built for collegiate events
            </h2>
            <p className="text-muted-foreground mt-2">
              A dedicated college organizer workspace — rosters, pairings, printables, scoring and leaderboard.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/15 text-secondary mb-3">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Included + pricing */}
      <section id="pricing" className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-2 gap-8 items-start">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-2xl font-display font-bold text-foreground mb-4">What's included</h3>
            <ul className="space-y-2.5">
              {included.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-foreground/85">
                  <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-secondary bg-card p-8">
            <h3 className="text-2xl font-display font-bold text-foreground mb-1">Pricing by divisions</h3>
            <p className="text-sm text-muted-foreground mb-5">One-time, per event.</p>
            <ul className="divide-y divide-border mb-6">
              {[1, 2, 3, 4].map((d) => (
                <li key={d} className="py-3 flex items-baseline justify-between gap-4">
                  <span className="text-sm font-semibold text-foreground">
                    {d} division{d > 1 ? "s" : ""}
                  </span>
                  <span className="font-display font-bold text-foreground text-lg">
                    {dollars(COLLEGE_SCORING_CENTS[d])}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/checkout/college-scoring"
              className="block w-full text-center bg-secondary text-secondary-foreground px-6 py-3.5 rounded-md font-semibold text-sm tracking-wider uppercase hover:bg-secondary/90 transition-colors"
            >
              Continue to Checkout
            </Link>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              You'll pick your event and division count on the next step.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CollegeGolfScoring;

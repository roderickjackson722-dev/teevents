import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Gavel, Award, Users, ClipboardCheck, DollarSign } from "lucide-react";

const steps = [
  { icon: ClipboardCheck, title: "1. Plan", text: "Pick a date, course, and budget. Use the 30-step planning checklist so nothing slips." },
  { icon: Award, title: "2. Recruit Sponsors", text: "Sell hole sponsorships, presenting sponsors, and add-ons online with built-in sponsor pages." },
  { icon: Users, title: "3. Open Registration", text: "Branded registration with tiered pricing, team signups, and add-ons like mulligans and meals." },
  { icon: Gavel, title: "4. Run the Event", text: "Live scoring, silent auctions, raffles, and donation tools all running on tournament day." },
  { icon: DollarSign, title: "5. Report Results", text: "See total raised, sponsor revenue, and a full transaction history for your board." },
];

const benefits = [
  "501(c)(3) tax-exempt receipting on every paid registration and donation",
  "Silent auctions and online raffles to maximize giving",
  "Sponsor logos shown on the website, leaderboard, and printable signs",
  "Donation widgets on registration, the public site, and the leaderboard",
  "One dashboard for committee members with role-based permissions",
];

export default function CharityGolfTournamentPlanning() {
  return (
    <Layout>
      <SEO
        title="Charity Golf Tournament Planning"
        description="A complete guide and platform for planning a charity golf tournament — registration, sponsors, auctions, and 501(c)(3) receipting all included."
        path="/charity-golf-tournament-planning"
      />

      <section className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-4xl">
          <Heart className="h-10 w-10 mx-auto text-secondary mb-4" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight">
            Charity Golf Tournament Planning Made Simple
          </h1>
          <p className="mt-5 text-base md:text-lg text-primary-foreground/85">
            Raise more for your cause with software designed for nonprofit and charity golf tournaments.
            Sponsors, auctions, donations, and tax-exempt receipting — done.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              <Link to="/get-started">Plan Your Charity Event</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/nonprofits">For Nonprofits</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-4xl font-display font-bold text-center mb-10">
          The 5-step charity golf tournament playbook
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-muted/40 py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-4xl font-display font-bold text-center mb-8">
            Built for nonprofits, ready out of the box
          </h2>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex gap-3 text-base">
                <span className="mt-2 h-2 w-2 rounded-full bg-secondary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="text-center mt-10">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              <Link to="/get-started">Start Your Charity Tournament</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, BarChart3, Users, Award, Globe, ClipboardCheck, Trophy } from "lucide-react";

const features = [
  { icon: Globe, title: "Branded Tournament Website", text: "Launch a custom event site in minutes with your colors, logo, and sponsors." },
  { icon: CreditCard, title: "Online Registration & Payments", text: "Accept credit cards, Apple Pay, and Google Pay. Automated confirmations included." },
  { icon: Users, title: "Player Pairings & Check-In", text: "Drag-and-drop pairings, tee assignments, and QR-code check-in on event day." },
  { icon: Award, title: "Sponsor & Auction Tools", text: "Showcase sponsors with logo placement and run silent auctions or raffles online." },
  { icon: BarChart3, title: "Live Scoring & Leaderboards", text: "Real-time leaderboards golfers can follow on their phones — no extra app." },
  { icon: ClipboardCheck, title: "Planning Checklists", text: "30-step interactive guide so nothing falls through the cracks." },
];

const faqs = [
  {
    q: "What is golf tournament management software?",
    a: "Golf tournament management software handles registration, payments, pairings, scoring, sponsorships, and reporting in one place — replacing spreadsheets, paper scorecards, and manual checkout.",
  },
  {
    q: "How much does TeeVents cost?",
    a: "TeeVents has a Base plan at $0 with full setup access. Upgrade any tournament to Pro for a one-time $399 unlock that adds advanced features like live leaderboards, auctions, and the flyer studio. Enterprise pricing is available for large operators.",
  },
  {
    q: "Is TeeVents good for charity and nonprofit golf tournaments?",
    a: "Yes — TeeVents is widely used for charity golf fundraisers and nonprofit events. It supports 501(c)(3) tax-exempt receipting, donations, sponsor packages, and silent auctions.",
  },
  {
    q: "Do golfers need an app to use the live leaderboard?",
    a: "No. The live leaderboard runs in any web browser, so spectators and players can follow along on their phones with just a link or QR code.",
  },
];

export default function GolfTournamentSoftware() {
  return (
    <Layout>
      <SEO
        title="Golf Tournament Management Software"
        description="The all-in-one golf tournament management software trusted by charities, corporates, and nonprofits. Online registration, live scoring, sponsorships, and payments."
        path="/golf-tournament-software"
      />
      {/* JSON-LD FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      <section className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight">
            Golf Tournament Management Software
          </h1>
          <p className="mt-5 text-base md:text-lg text-primary-foreground/85">
            Plan, register, sponsor, score, and report — all in one platform built for charity, corporate,
            and nonprofit golf tournaments.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              <Link to="/get-started">Start Your Tournament</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/plans">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl md:text-4xl font-display font-bold">Built for every part of a golf tournament</h2>
          <p className="mt-3 text-muted-foreground">
            From the first planning call to the post-event thank-you email, TeeVents is the
            golf tournament software organizers actually enjoy using.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-muted/40 py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-4xl font-display font-bold text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-5">
            {faqs.map((f) => (
              <Card key={f.q}>
                <CardHeader>
                  <CardTitle className="text-lg flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{f.q}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm md:text-base text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              <Link to="/get-started">
                <Trophy className="h-4 w-4 mr-2" /> Launch Your Tournament Site
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

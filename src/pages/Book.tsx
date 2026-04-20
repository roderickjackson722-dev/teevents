import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  PlayCircle,
  Trophy,
  Smartphone,
  Calculator,
  Wallet,
  Palette,
  Handshake,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
  Rocket,
  Quote,
} from "lucide-react";

const CALENDLY_URL = "https://calendly.com/teevents/teevents-demo";

const learnPoints = [
  "How to set up a branded tournament website in 10 minutes",
  "How to collect payments automatically (Stripe, Apple Pay, Google Pay)",
  "How live leaderboards, QR scoring, and handicap calculations work",
  "How to manage sponsors, volunteers, and pairings from one dashboard",
  "How to get paid instantly (Stripe Connect — no holding)",
];

const features = [
  { icon: Trophy, emoji: "🏌️", title: "Live Leaderboard", desc: "Real-time gross/net scores, embed on any website, sponsor logos." },
  { icon: Smartphone, emoji: "📱", title: "QR Scoring", desc: "Players enter scores from their phone — no app download." },
  { icon: Calculator, emoji: "🧮", title: "USGA Handicap", desc: "Automatic course handicap, stroke allocation, net score calculation." },
  { icon: Wallet, emoji: "💰", title: "Automatic Payouts", desc: "Stripe Connect — funds go directly to your bank account." },
  { icon: Palette, emoji: "🎨", title: "Custom Website", desc: "Branded tournament site, custom URL, live in minutes." },
  { icon: Handshake, emoji: "🤝", title: "Sponsor Portal", desc: "Sponsors upload logos, download tax receipts, track ROI." },
];

const whyBook = [
  { icon: Clock, emoji: "⏱️", text: "See exactly how TeeVents fits your tournament — no generic slides." },
  { icon: Target, emoji: "🎯", text: "Get answers to your specific questions about registration, payouts, or scoring." },
  { icon: Lightbulb, emoji: "💡", text: "Learn time-saving tricks that organizers wish they knew earlier." },
  { icon: Rocket, emoji: "🚀", text: "No obligation — just a friendly walkthrough." },
];

const Book = () => {
  return (
    <Layout>
      <SEO
        title="Book a TeeVents Demo – See the Platform in Action"
        description="Schedule a 30-min demo to see how TeeVents simplifies golf tournament management."
        path="/book"
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            See TeeVents in Action — Book a 30-Min Demo
          </h1>
          <p className="text-lg md:text-xl mb-10 text-primary-foreground/90 max-w-2xl mx-auto">
            Discover how tournament organizers save 10+ hours, collect payments automatically,
            and run a pro-level event with our all-in-one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <a href={CALENDLY_URL}>
                <Calendar className="mr-2 h-5 w-5" />
                Book Your Demo Now
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-full px-8 py-6"
            >
              <a href="/how-it-works">
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch a 2-Min Overview
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-foreground">
            What You'll Learn on the Call
          </h2>
          <ul className="space-y-4">
            {learnPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 bg-muted/40 p-4 rounded-lg border border-border">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-base md:text-lg text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Standout Features Grid */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
              Standout Features We'll Show You
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The most demo-worthy capabilities organizers love.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <Card key={i} className="border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6 flex gap-4">
                  <div className="text-3xl flex-shrink-0" aria-hidden>{f.emoji}</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Book a Demo */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            Why Book a Demo?
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {whyBook.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-lg bg-muted/40 border border-border">
                <span className="text-2xl flex-shrink-0" aria-hidden>{b.emoji}</span>
                <span className="text-foreground">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-accent/30 bg-card shadow-md">
            <CardContent className="p-8 md:p-10 text-center">
              <Quote className="h-10 w-10 text-accent mx-auto mb-4" />
              <p className="text-xl md:text-2xl italic text-foreground leading-relaxed mb-4">
                "TeeVents saved us over 20 hours of spreadsheet work. The demo showed us
                exactly how."
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                — Tournament Director
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24 bg-gradient-to-b from-primary/95 to-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Ready to run your best tournament yet?
          </h2>
          <p className="text-lg md:text-xl mb-8 text-primary-foreground/90">
            Book a 30-min demo and see TeeVents in action.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <a href={CALENDLY_URL}>
              <Calendar className="mr-2 h-5 w-5" />
              Book Your Demo Now
            </a>
          </Button>
          <p className="mt-6 text-sm text-primary-foreground/70">
            No obligation. No credit card required for demo.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Book;

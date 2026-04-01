import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Copy, ExternalLink,
  Users, LayoutDashboard, Globe, CreditCard, Trophy, DollarSign, Tag, HelpCircle,
  Clock, CheckCircle2, MessageSquare, Mail, Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

const STEPS = [
  {
    num: 1, title: "Welcome & Quick Overview", minutes: 2, icon: MessageSquare,
    hero: "In just 25 minutes I'll show you how TeeVents replaces spreadsheets and lets you run a professional golf tournament in minutes.",
    keyMessage: "Zero upfront cost on Base plan • Only 4% platform fee passed to players by default • 15% reserve for refunds/chargebacks",
    bullets: [
      "Introduce yourself and thank them for their time.",
      'Ask: "Tell me about your tournament — how many players, is it a fundraiser, how do you manage it today?"',
      "Listen for pain points: spreadsheets, manual check-in, no website, payment headaches.",
      'Transition: "Let me show you exactly how TeeVents solves all of that."',
    ],
    route: null,
  },
  {
    num: 2, title: "Onboarding in 60 Seconds", minutes: 3, icon: Users,
    hero: "Enter your organization name → pick a template → your branded tournament site is ready.",
    keyMessage: null,
    bullets: [
      "Show the Onboarding flow live (organization name + template picker).",
      "Highlight how fast it is — under 60 seconds to a fully branded site.",
      'Say: "No design skills needed. Pick a template, upload your logo, done."',
    ],
    route: "/onboarding",
  },
  {
    num: 3, title: "Dashboard Tour", minutes: 3, icon: LayoutDashboard,
    hero: "Everything in one place – no more Google Sheets or multiple tools.",
    keyMessage: null,
    bullets: [
      "Show the main dashboard — highlight at-a-glance stats (players, revenue, check-ins).",
      'Point out the sidebar: "Everything you need lives right here."',
      "Mention the Planning Guide checklist: 30-item checklist from 12 months out to post-event.",
      "Show PlanGate badges — features clearly labeled by tier.",
    ],
    route: "/dashboard",
  },
  {
    num: 4, title: "Build Your Custom Tournament Website", minutes: 4, icon: Globe,
    hero: "Drag-and-drop your branded site in minutes – fully mobile responsive.",
    keyMessage: null,
    bullets: [
      "Show the 3 templates: Classic Green, Modern Navy, Charity Warmth.",
      'Highlight: "Pick a template, upload your logo, set your colors — publish with one click."',
      "Preview the public site — show mobile-responsive design.",
      "Mention 8 built-in pages: Home, Contests, Registration, Photos, Location, Agenda, Donation, Contact.",
      "Call out custom domain support for Starter+ plans.",
    ],
    route: "/dashboard/tournaments",
  },
  {
    num: 5, title: "Registration, Payments & Fees", minutes: 5, icon: CreditCard,
    hero: "4% TeeVents platform fee + Stripe fee shown clearly • Default = passed to players so you keep 100% of advertised price • Toggle to absorb fees if you want.",
    keyMessage: "$150 registration example → Golfer pays $160.82 (fees passed) or Organizer nets $139.35 (fees absorbed).",
    bullets: [
      "Show Registration page with tiers, group sizes, and checkout breakdown.",
      "Walk through the fee breakdown: Base Price → 4% TeeVents Fee → Stripe Fee → Total.",
      'Emphasize: "You keep 100% of your advertised price by default."',
      "Show the toggle in Settings to absorb fees instead.",
      "Mention promo codes, group registration (up to 4 players), and waitlist.",
    ],
    route: "/dashboard/registration",
  },
  {
    num: 6, title: "Live Scoring, Pairings & Check-In", minutes: 5, icon: Trophy,
    hero: "Real-time mobile scoring, drag-and-drop pairings, instant leaderboards.",
    keyMessage: null,
    bullets: [
      "Show the admin leaderboard — real-time scores, group-by-group.",
      "Navigate to Printables → Scorecards tab — show QR codes.",
      '"Players scan this code with their phone — no app download, no login."',
      "Explain: Scan → phone opens scoring page → enter scores → leaderboard updates live.",
      "Show Tee Sheet with shotgun/sequential start options.",
      "Show QR Check-In: print badges, open Scan Station on any tablet.",
    ],
    route: "/dashboard/leaderboard",
  },
  {
    num: 7, title: "Budget, Sponsors, Auctions & Payouts", minutes: 5, icon: DollarSign,
    hero: "Real-time budget tracking • Automatic bi-weekly payouts • 15% reserve released 15 days after event • You are never personally liable for chargebacks.",
    keyMessage: null,
    bullets: [
      "Show sponsor tiers: Title, Gold, Silver, Bronze — logos auto-display on tournament site.",
      "Show budget tracking: income vs. expenses by category, paid/unpaid status.",
      "Show Finances page with payout timeline and reserve breakdown.",
      "Show Auction page — silent auction, raffle, buy-now items.",
      'Highlight: "Know exactly where your money is at all times."',
    ],
    route: "/dashboard/budget",
  },
  {
    num: 8, title: "Pricing & Upgrade Options", minutes: 2, icon: Tag,
    hero: "Start for $0 • Upgrade only when you need unlimited players or white-glove service.",
    keyMessage: "Base ($0, 72 players) → Starter ($299, unlimited) → Premium ($999, white-glove + reduced reserve)",
    bullets: [
      "Show the 3-tier comparison: Base $0 / Starter $299 / Premium $999.",
      "Base highlight: 1 tournament, 72 players max, all core features.",
      'Starter highlight: "Unlimited tournaments and players + custom domain."',
      'Premium highlight: "White-glove consulting, 10% reserve, faster payouts."',
      "All plans: 4% platform fee passed to participants by default.",
    ],
    route: "/dashboard/upgrade",
  },
  {
    num: 9, title: "Q&A & Next Steps", minutes: 3, icon: HelpCircle,
    hero: "What questions do you have? Let's get your tournament set up today.",
    keyMessage: null,
    bullets: [
      '"What stood out to you? Which features would make the biggest difference?"',
      "Address any questions or concerns.",
      '"I can set up your tournament right now — takes just a few minutes."',
      "Share the sign-up link: teevents.golf/get-started",
      "If nonprofit: mention tax-deductible donation receipts and EIN verification.",
      "Follow up within 24 hours with a recap email.",
    ],
    route: null,
  },
];

const TOTAL_MINUTES = STEPS.reduce((sum, s) => sum + s.minutes, 0);

export default function SalesHub() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>("step-0");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progressPct = Math.min((elapsed / (TOTAL_MINUTES * 60)) * 100, 100);

  const goTo = useCallback((idx: number) => {
    setCurrentStep(idx);
    setOpenAccordion(`step-${idx}`);
  }, []);

  const next = () => { if (currentStep < STEPS.length - 1) goTo(currentStep + 1); };
  const prev = () => { if (currentStep > 0) goTo(currentStep - 1); };

  const reset = () => {
    setElapsed(0);
    setRunning(false);
    goTo(0);
    toast.success("Demo reset");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/sales-hub`);
    toast.success("Demo link copied to clipboard");
  };

  const step = STEPS[currentStep];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h1 className="text-lg md:text-xl font-bold text-foreground">
                TeeVents Live Demo — {TOTAL_MINUTES}-Minute Sales Walkthrough
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-sm">
                  <Clock className="h-3.5 w-3.5 mr-1" /> {fmt(elapsed)} / {TOTAL_MINUTES}:00
                </Badge>
                <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning(!running)}>
                  {running ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={copyLink}><Copy className="h-4 w-4 mr-1" /> Link</Button>
              </div>
            </div>
            <Progress value={progressPct} className="h-2" />
            {/* Step pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    i === currentStep
                      ? "bg-primary text-primary-foreground"
                      : i < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.num}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Active step hero */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-mono">Step {step.num} of {STEPS.length} • {step.minutes} min</p>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{step.title}</h2>
                </div>
              </div>

              <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
                {step.hero}
              </p>

              {step.keyMessage && (
                <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 text-sm text-foreground/80">
                  <strong>Key message:</strong> {step.keyMessage}
                </div>
              )}

              <ul className="space-y-2 pt-2">
                {step.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm md:text-base text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 pt-4 flex-wrap">
                <Button variant="outline" onClick={prev} disabled={currentStep === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button onClick={next} disabled={currentStep === STEPS.length - 1}>
                  Next Step <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                {step.route && (
                  <Button variant="secondary" onClick={() => navigate(step.route!)}>
                    <ExternalLink className="h-4 w-4 mr-1" /> Open in App
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Full agenda accordion */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Full Agenda</h3>
            <Accordion type="single" collapsible value={openAccordion} onValueChange={(v) => setOpenAccordion(v)}>
              {STEPS.map((s, i) => (
                <AccordionItem key={i} value={`step-${i}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === currentStep ? "bg-primary text-primary-foreground" : i < currentStep ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{s.num}</span>
                      <span className="font-medium">{s.title}</span>
                      <Badge variant="outline" className="text-xs font-mono ml-auto mr-2">{s.minutes} min</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-10 space-y-2">
                    <p className="text-foreground/90">{s.hero}</p>
                    {s.keyMessage && <p className="text-sm text-muted-foreground italic">{s.keyMessage}</p>}
                    <ul className="space-y-1">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    {s.route && (
                      <Button size="sm" variant="link" onClick={() => navigate(s.route!)} className="px-0">
                        Open {s.title} →
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Separator />

          {/* FAQ */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Reference — Fee & Reserve FAQ</h3>
            <Accordion type="multiple">
              <AccordionItem value="fee">
                <AccordionTrigger>What is the 4% TeeVents platform fee?</AccordionTrigger>
                <AccordionContent>
                  TeeVents charges a flat 4% platform fee on every transaction (registrations, sponsor payments, auction bids, donations). This is separate from Stripe's standard processing fee (~2.9% + $0.30). By default, fees are passed to participants so organizers keep 100% of their advertised price. Organizers can toggle a setting to absorb the fees instead.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="reserve">
                <AccordionTrigger>What is the 15% reserve?</AccordionTrigger>
                <AccordionContent>
                  TeeVents holds 15% of net proceeds as a reserve to cover potential refunds and chargebacks. This reserve is automatically released 15 days after your event ends. Premium plan customers receive a reduced 10% reserve rate with faster payout schedules.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="payouts">
                <AccordionTrigger>When do organizers get paid?</AccordionTrigger>
                <AccordionContent>
                  Payouts are processed automatically every two weeks (bi-weekly). The net amount (after platform fee and reserve) is deposited directly into the organizer's connected bank account. Premium plan organizers receive faster payout schedules.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Email Template */}
          <EmailTemplate />

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center py-8">
            <Button size="lg" onClick={() => navigate("/get-started")}>
              Get Started Free
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/sales-hub/demo-talk-track")}>
              📋 Payment Talk Track
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.open("https://calendly.com", "_blank")}>
              Book a Personalized Demo
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

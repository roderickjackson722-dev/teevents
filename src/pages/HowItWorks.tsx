import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, CreditCard, Users, QrCode, Trophy, Megaphone, HandCoins,
  ShoppingBag, Gavel, Camera, Heart, ClipboardList, UserCheck,
  BarChart3, ArrowRight, CheckCircle, CheckCircle2, Check, Zap, Clock,
  DollarSign, Smartphone, LayoutDashboard, PieChart, Send,
  Star, Printer, FileText, MessageSquare, Award, ShieldCheck,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import HeroSection from "@/components/HeroSection";
import heroGolf from "@/assets/hero-golf.jpg";
import logoWhite from "@/assets/logo-white.png";
import demoWebsiteBuilder from "@/assets/demo-website-builder.jpg";
import demoRegistration from "@/assets/demo-registration.jpg";
import demoPairings from "@/assets/demo-pairings.jpg";
import demoBudget from "@/assets/demo-budget.jpg";
import demoSponsors from "@/assets/demo-sponsors.jpg";
import demoMessaging from "@/assets/demo-messaging.jpg";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i?: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: typeof i === "number" ? i * 0.08 : 0, duration: 0.5 },
  }),
};

const slideLeft = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } },
};

const slideRight = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

/* ─── Data ─── */
const sellingPoints = [
  { stat: "✓", label: "Custom domain support", icon: Globe },
  { stat: "100%", label: "Mobile optimized", icon: Smartphone },
  { stat: "0", label: "Tech skills needed", icon: LayoutDashboard },
  { stat: "$0", label: "Startup cost", icon: DollarSign },
];

const coreModules = [
  {
    icon: Globe,
    title: "Custom Tournament Website",
    image: demoWebsiteBuilder,
    bullets: [
      "Three branded templates (Classic Green, Modern Navy, Charity Warmth)",
      "Eight built-in navigation tabs — no coding required",
      "Mobile-responsive out of the box",
      "Connect your own custom domain",
    ],
  },
  {
    icon: CreditCard,
    title: "Online Registration",
    image: demoRegistration,
    bullets: [
      "Register now for the annual golf tournament",
      "Stripe-powered checkout with Apple Pay & Google Pay",
      "Registration add-ons (mulligans, dinner tickets, hole packages)",
      "Custom fields, promo codes & automated email confirmations",
    ],
  },
  {
    icon: Users,
    title: "Player Management & Pairings",
    image: demoPairings,
    bullets: [
      "Drag-and-drop player pairings editor",
      "Import players via CSV or paste from spreadsheet",
      "Hole assignments with automatic numbering",
      "Handicap, shirt size, and dietary tracking",
    ],
  },
  {
    icon: BarChart3,
    title: "Real-Time Budget Tracker",
    image: demoBudget,
    bullets: [
      "Revenue & expense line items by category",
      "Paid/unpaid status for every item",
      "Live profit/loss summary dashboard",
    ],
  },
  {
    icon: Award,
    title: "Sponsor Management",
    image: demoSponsors,
    bullets: [
      "Tiered sponsor levels (Title, Gold, Silver, Bronze)",
      "Logo uploads and website links per sponsor",
      "Payment tracking and leaderboard logo rotation",
    ],
  },
  {
    icon: MessageSquare,
    title: "SMS & Email Messaging",
    image: demoMessaging,
    bullets: [
      "Bulk email and SMS to golfers, sponsors, and volunteers",
      "Scheduled messages for tournament day reminders",
      "Full message history and delivery tracking",
    ],
  },
];

const scoringSteps = [
  { step: "1", icon: Printer, title: "Print Scorecards", desc: "Generate professional scorecards with embedded QR codes from the Printables dashboard — one click." },
  { step: "2", icon: QrCode, title: "Player Scans QR", desc: "Each QR code is unique to the player and links directly to their assigned group's scoring page." },
  { step: "3", icon: Smartphone, title: "Score on Any Device", desc: "Players enter scores hole-by-hole on their phone. Supports 8 formats including Scramble and Best Ball." },
  { step: "4", icon: Trophy, title: "Live Leaderboard", desc: "Scores update in real-time on the tournament leaderboard with sponsor logo rotations." },
];

const advancedFeatures = [
  { icon: Trophy, title: "Live Leaderboard", desc: "Hole-by-hole scoring with real-time standings and 8 scoring formats." },
  { icon: QrCode, title: "QR Code Check-In", desc: "Players scan QR codes to check in instantly — zero friction on event day." },
  { icon: Gavel, title: "Auction & Raffle", desc: "Silent auctions with Buy Now, bid tracking, and online raffle ticket sales." },
  { icon: Heart, title: "Donation Portal", desc: "Fundraising goal tracking with progress bars and Stripe-powered donations." },
  { icon: ShoppingBag, title: "Merchandise Store", desc: "Sell branded apparel and gear with integrated checkout." },
  { icon: Camera, title: "Photo Gallery", desc: "Upload and showcase tournament photos with captions." },
  { icon: ClipboardList, title: "Planning Guide", desc: "Pre-built 30-item checklist system to keep organizers on track." },
  { icon: UserCheck, title: "Volunteer Coordinator", desc: "Define roles, time slots, and manage volunteer signups." },
  { icon: FileText, title: "6 Printable Types", desc: "Scorecards, cart signs, name badges, sponsor signs, alpha list & hole assignments." },
];

const whyTeeVents = [
  "Replace 10+ tools with one platform",
  "Organizers keep full control of their revenue — choose Stripe Connect, PayPal, or check payouts",
  "No monthly subscriptions — pay per tournament",
  "White-label branding for every event",
  "Built for nonprofits, corporations, and golf communities",
  "Dedicated support from golf industry professionals",
];

const plans = [
  {
    name: "Base",
    price: "$0",
    period: "per tournament",
    description: "Get started free — limited to 1 tournament & 72 players.",
    fee: "$5 platform fee per transaction + Stripe processing fees",
    features: [
      "1 active tournament (max 72 players)",
      "Online registration & payments",
      "Tournament website (1 template)",
      "Player pairings & check-in",
      "Planning guide & checklist",
      "Email messaging",
      "Printable scorecards",
    ],
    cta: "Start Free",
    plan: "free",
  },
  {
    name: "Starter",
    price: "$299",
    period: "per tournament",
    description: "Unlimited players. We build your tournament platform for you.",
    fee: "$5 platform fee per transaction + Stripe processing fees",
    features: [
      "Everything in Base (unlimited players)",
      "We build your website for you",
      "All 6 templates + custom colors",
      "All 8 scoring formats",
      "Live leaderboard (Stroke Play & Best Ball)",
      "Sponsor management & recognition",
      "Photo gallery",
      "Custom domain support",
      "Budget tracking & volunteer coordination",
      "Donations page",
      "SMS texting (500 messages)",
    ],
    cta: "Get Started",
    plan: "starter",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$999",
    period: "per tournament",
    description: "White-glove consulting & full-service setup.",
    fee: "5% platform fee per transaction + Stripe processing fees",
    features: [
      "Everything in Starter",
      "White-glove consulting & setup",
      "$25,000 hole-in-one insurance (up to 72 golfers)",
      "Auction item included",
      "Merchandise store",
      "Auction & raffle management",
      "Surveys & analytics",
      "Priority support",
    ],
    cta: "Get Started",
    plan: "premium",
  },
];

/* ─── Component ─── */
const HowItWorks = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const { toast } = useToast();

  const handleCheckout = async (plan: string) => {
    if (plan === "free") {
      window.location.href = "/get-started?plan=free";
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, promo_code: promoCode.trim() || undefined },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not start checkout.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };
  return (
    <Layout>
      <SEO
        title="How It Works | TeeVents — Golf Tournament Management Made Simple"
        description="See how TeeVents replaces 10+ tools with one platform purpose-built for golf tournament organizers. From registration to live scoring, everything in one place."
        path="/how-it-works"
      />

      {/* Hero */}
      <HeroSection backgroundImage={heroGolf} title="" height="h-screen">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <img src={logoWhite} alt="TeeVents" className="h-28 w-28 mx-auto mb-4 object-contain" />
          <p className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
            How It Works
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground text-shadow-hero leading-tight">
            One Platform. <br />
            <span className="text-secondary">Every Tournament Need.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Stop juggling spreadsheets, email chains, and separate payment processors. TeeVents gives organizers everything they need — from branded websites to live scoring on game day.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://calendly.com/teevents-golf/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              Book a Demo
            </a>
          </div>
        </motion.div>
      </HeroSection>

      {/* Stats Bar */}
      <section className="bg-primary py-8 border-b border-primary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {sellingPoints.map((s) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                <s.icon className="h-6 w-6 text-secondary mx-auto mb-2" />
                <p className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">{s.stat}</p>
                <p className="text-sm text-primary-foreground/60 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Modules — Alternating Layout with Screenshots */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Core Modules</h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Six Powerful Tools, One Dashboard
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Each module is purpose-built for golf tournament organizers — no bloat, no complexity.
            </p>
          </motion.div>

          <div className="space-y-20">
            {coreModules.map((mod, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={mod.title}
                  variants={isEven ? slideRight : slideLeft}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  className={`flex flex-col md:flex-row items-center gap-10 ${!isEven ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="w-full md:w-5/12 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/5 rounded-2xl rotate-3 scale-[1.02]" />
                      <img src={mod.image} alt={mod.title} className="relative rounded-2xl border border-border shadow-lg w-full max-w-sm object-cover" />
                    </div>
                  </div>
                  <div className="w-full md:w-7/12">
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">{mod.title}</h3>
                    <ul className="space-y-3">
                      {mod.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* QR Code Live Scoring Walkthrough */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Player Experience</h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Scan. Score. Done.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Every player gets a personalized QR code on their scorecard. One scan opens their group's live scoring page — no logins, no apps, no friction.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-4 gap-6">
            {scoringSteps.map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} className="relative bg-card border border-border rounded-xl p-8 text-center group hover:border-secondary/40 transition-colors">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-secondary/30" />
                )}
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 mt-2 group-hover:bg-secondary/20 transition-colors">
                  <item.icon className="h-7 w-7 text-secondary" />
                </div>
                <h4 className="text-lg font-display font-bold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-14 bg-primary rounded-xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 w-20 h-20 bg-secondary/20 rounded-2xl flex items-center justify-center">
              <QrCode className="h-10 w-10 text-secondary" />
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-xl font-display font-bold text-primary-foreground mb-2">Zero Friction for Players</h4>
              <p className="text-primary-foreground/70 leading-relaxed">
                No app downloads. No account creation. No manual group lookups. Each player's QR code is auto-generated and tied to their registration — admins can regenerate codes at any time.
              </p>
            </div>
            <Link to="/get-started" className="flex-shrink-0 inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold text-sm hover:bg-secondary/90 transition-colors whitespace-nowrap">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Advanced Features Grid */}
      <section className="bg-primary py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Advanced Features</h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">
              Go Beyond the Basics
            </h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {advancedFeatures.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl p-6 hover:bg-primary-foreground/10 transition-colors group"
              >
                <div className="w-11 h-11 bg-secondary/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/30 transition-colors">
                  <f.icon className="h-5 w-5 text-secondary" />
                </div>
                <h4 className="text-lg font-display font-bold text-primary-foreground mb-2">{f.title}</h4>
                <p className="text-sm text-primary-foreground/60 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Revenue Model — Automatic Split */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div variants={slideRight} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Automatic Payments</h3>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                We Never Hold Your Money.<br />Payments Split Automatically.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Every payment is split instantly at checkout using Stripe Connect destination charges. Your net proceeds go directly to your connected Stripe account. Alternatively, choose PayPal or check payouts.
              </p>
              <div className="space-y-3">
                {[
                  "Golfer pays → Stripe processes payment",
                  "5% platform fee → sent to TeeVents",
                  "Stripe fee → deducted by Stripe",
                  "Net proceeds → deposited in your account (Stripe, PayPal, or check)",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Send className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground font-medium">
                  💡 Three payout options: Stripe Connect (automatic), PayPal (bi-weekly), or Check (on request). You choose what works best for your organization.
                </p>
              </div>
            </motion.div>

            <motion.div variants={slideLeft} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
                <h4 className="font-display font-bold text-foreground text-lg mb-6">Example: $150 Registration Fee</h4>
                <p className="text-xs text-muted-foreground mb-4 bg-muted/50 rounded-lg px-3 py-2">
                  Stripe splits funds automatically at checkout — TeeVents never holds your money
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-muted-foreground">Golfer pays</span>
                    <span className="font-display font-bold text-foreground">$150.00</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-muted-foreground">TeeVents platform fee (5%)</span>
                    <span className="font-display font-bold text-destructive">−$7.50</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-muted-foreground">Stripe processing (~2.9% + $0.30)</span>
                    <span className="font-display font-bold text-destructive">−$4.65</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 bg-primary/5 rounded-lg px-3 py-2">
                    <span className="font-semibold text-primary">Net to Organizer</span>
                    <span className="font-display font-bold text-primary text-2xl">$137.85</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  All plans: 5% platform fee + Stripe 2.9% + $0.30 per transaction. Choose Stripe Connect (automatic), PayPal (bi-weekly), or check (on request).
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why TeeVents */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Why Choose Us</h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Built for Tournament Organizers
            </h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-4">
            {whyTeeVents.map((reason) => (
              <motion.div key={reason} variants={fadeUp} className="flex items-start gap-3 bg-card border border-border rounded-lg p-5">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground/80 leading-relaxed">{reason}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>



      {/* Testimonial */}
      <section className="bg-primary py-20">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-display italic text-primary-foreground leading-relaxed">
              "TeeVents made planning our charity golf tournament effortless. The registration, pairings, and sponsor tools saved us countless hours of work."
            </blockquote>
            <p className="mt-6 text-primary-foreground/60 font-medium">— Tournament Organizer</p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-background py-20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
              Ready to Simplify Your Tournament?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join organizers who've switched from spreadsheets and scattered tools to one unified platform. Bring your own custom domain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                View Pricing & Purchase <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://calendly.com/teevents-golf/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/20 text-primary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Book a Demo
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;

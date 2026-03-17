import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe,
  CreditCard,
  Users,
  QrCode,
  Trophy,
  Megaphone,
  HandCoins,
  ShoppingBag,
  Gavel,
  Camera,
  Heart,
  ClipboardList,
  UserCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  DollarSign,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const steps = [
  {
    icon: Globe,
    title: "Professional Tournament Website",
    description:
      "Choose from ready-made templates, customize your branding and colors, and publish a stunning tournament site in minutes — with your own custom domain.",
  },
  {
    icon: CreditCard,
    title: "Online Registration & Payments",
    description:
      "Accept registrations and payments online through Stripe. Players get instant email confirmations, and you track everything in real-time.",
  },
  {
    icon: Users,
    title: "Player Management & Pairings",
    description:
      "Import players via CSV, drag-and-drop them into foursomes, and auto-assign groups with one click. Support for 8 scoring formats.",
  },
  {
    icon: QrCode,
    title: "QR Code Check-In",
    description:
      "Print QR codes for every player. On event day, open the Scan Station on any phone or tablet and check players in instantly.",
  },
  {
    icon: Trophy,
    title: "Live Scoring & Leaderboard",
    description:
      "Print scorecards with embedded QR codes. Players scan, enter scores hole-by-hole, and the leaderboard updates live — no app download required.",
  },
  {
    icon: HandCoins,
    title: "Sponsor Management",
    description:
      "Track sponsors by tier — Title, Gold, Silver, Bronze. Manage payments and automatically display logos on your website and rotating leaderboard.",
  },
  {
    icon: Megaphone,
    title: "Email & SMS Messaging",
    description:
      "Send email blasts or SMS texts to your entire field in seconds. Schedule messages in advance and track delivery.",
  },
  {
    icon: BarChart3,
    title: "Budget Tracking",
    description:
      "Track income and expenses by category. Mark items as paid, and see your budget health at a glance with real-time totals.",
  },
];

const advancedFeatures = [
  {
    icon: ShoppingBag,
    title: "Merchandise Store",
    description: "Sell branded gear with Stripe checkout on your tournament site.",
  },
  {
    icon: Gavel,
    title: "Auction & Raffle",
    description: "Run silent auctions with online bidding and Buy Now options.",
  },
  {
    icon: Camera,
    title: "Photo Gallery",
    description: "Upload and showcase event photos on your public tournament page.",
  },
  {
    icon: Heart,
    title: "Donation Page",
    description: "Accept donations with a progress bar toward your fundraising goal.",
  },
  {
    icon: ClipboardList,
    title: "Post-Event Surveys",
    description: "Gather feedback with rating, text, and multiple-choice questions.",
  },
  {
    icon: UserCheck,
    title: "Volunteer Coordination",
    description: "Define roles, time slots, and track volunteer signups and capacity.",
  },
];

const plans = [
  {
    name: "Base",
    price: "Free",
    fee: "5%",
    highlights: ["1 tournament", "Registration & payments", "Website (1 template)", "Live leaderboard", "Planning guide"],
  },
  {
    name: "Starter",
    price: "$499",
    fee: "3%",
    highlights: ["All templates", "Sponsors & budget", "Donations & gallery", "SMS messaging (500)", "Custom domain"],
    popular: true,
  },
  {
    name: "Pro",
    price: "$999",
    fee: "2%",
    highlights: ["Merch store", "Auction & raffle", "Surveys & volunteers", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    fee: "1%",
    highlights: ["Unlimited tournaments", "Unlimited SMS", "White-label branding", "API access"],
  },
];

const HowItWorks = () => {
  return (
    <Layout>
      <SEO
        title="How It Works | TeeVents — Golf Tournament Management Made Simple"
        description="See how TeeVents replaces 10+ tools with one platform purpose-built for golf tournament organizers. From registration to live scoring, everything in one place."
      />

      {/* Hero */}
      <section className="relative bg-primary py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--secondary)/0.15),transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4 px-4 py-1.5 rounded-full bg-secondary/20 text-secondary font-medium text-sm tracking-wide font-sans"
          >
            Purpose-Built for Golf
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-primary-foreground font-serif mb-6"
          >
            One Platform. <br className="hidden md:block" />
            Every Tournament Need.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-primary-foreground/80 font-sans max-w-2xl mx-auto mb-10"
          >
            Stop juggling spreadsheets, email chains, and separate payment processors. TeeVents gives organizers everything they need — from branded websites to live scoring on game day.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold text-base px-8" asChild>
              <Link to="/get-started">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base px-8" asChild>
              <Link to="/demo">See Demo</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: DollarSign, label: "$0 to start", sub: "Free Base plan, no credit card" },
              { icon: Clock, label: "30-minute setup", sub: "Publish your site same day" },
              { icon: Zap, label: "Replaces 10+ tools", sub: "One dashboard for everything" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col items-center text-center p-6"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground font-serif mb-1">{item.label}</h3>
                <p className="text-muted-foreground text-sm font-sans">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">
              Everything You Need, Built In
            </h2>
            <p className="text-muted-foreground text-lg font-sans">
              From the first registration to the final scorecard — TeeVents handles it all.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                className="flex gap-5 p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-serif mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-sm font-sans leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-primary/[0.03]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-secondary/15 text-secondary font-medium text-xs tracking-wide uppercase font-sans">
              Pro & Enterprise
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">
              Unlock More as You Grow
            </h2>
            <p className="text-muted-foreground text-lg font-sans">
              Upgrade to access powerful tools that maximize your event's impact and revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {advancedFeatures.map((feat, i) => (
              <motion.div
                key={feat.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={fadeUp}
                className="flex gap-4 p-5 rounded-xl border border-border bg-card"
              >
                <feat.icon className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-foreground text-sm font-serif mb-0.5">{feat.title}</h4>
                  <p className="text-muted-foreground text-xs font-sans leading-relaxed">{feat.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Snapshot */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg font-sans">
              Start free. Upgrade when you're ready. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`relative rounded-xl border p-6 bg-card flex flex-col ${
                  plan.popular ? "border-secondary shadow-lg ring-2 ring-secondary/20" : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-foreground font-serif">{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold text-foreground font-serif">{plan.price}</span>
                  {plan.price !== "Free" && plan.price !== "Custom" && (
                    <span className="text-muted-foreground text-sm font-sans"> /event</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-sans mb-4">{plan.fee} transaction fee</p>
                <ul className="space-y-2 flex-1">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-foreground font-sans">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-10" asChild>
              <Link to="/get-started">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground font-serif mb-4">
            Ready to Simplify Your Tournament?
          </h2>
          <p className="text-primary-foreground/80 text-lg font-sans mb-8">
            Join organizers who've switched from spreadsheets and scattered tools to one unified platform. Set up in 30 minutes — your next tournament will thank you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold text-base px-8" asChild>
              <Link to="/get-started">Start Free Today</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base px-8" asChild>
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;

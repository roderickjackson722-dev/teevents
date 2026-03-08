import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Globe, CreditCard, Users, BarChart3, Award, MessageSquare,
  CheckCircle, Trophy, Camera, ShoppingBag, Gavel, Heart,
  QrCode, ClipboardList, ArrowRight, Smartphone, Star, Zap,
  LayoutDashboard, PieChart, Send, UserCheck
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const slideLeft = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } },
};

const slideRight = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } },
};

const coreModules = [
  {
    icon: Globe,
    title: "Custom Tournament Website",
    image: demoWebsiteBuilder,
    bullets: [
      "Three branded templates (Classic Green, Modern Navy, Charity Warmth)",
      "Eight built-in navigation tabs — no coding required",
      "Mobile-responsive out of the box",
    ],
  },
  {
    icon: CreditCard,
    title: "Online Registration & Payments",
    image: demoRegistration,
    bullets: [
      "Stripe-powered checkout with Apple Pay & Google Pay",
      "Configurable registration fees per tournament",
      "Automated email confirmations on signup",
    ],
  },
  {
    icon: Users,
    title: "Player Management & Pairings",
    image: demoPairings,
    bullets: [
      "Drag-and-drop player pairings editor",
      "Group assignments with automatic numbering",
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
      "Tiered sponsor levels (Platinum, Gold, Silver, Bronze)",
      "Logo uploads and website links per sponsor",
      "Payment tracking for sponsor commitments",
    ],
  },
  {
    icon: MessageSquare,
    title: "SMS & Email Messaging",
    image: demoMessaging,
    bullets: [
      "Bulk SMS to golfers, sponsors, and volunteers",
      "Scheduled messages for tournament day reminders",
      "Full message history and delivery tracking",
    ],
  },
];

const advancedFeatures = [
  { icon: Trophy, title: "Live Leaderboard", desc: "Hole-by-hole scoring with real-time standings and course par integration." },
  { icon: QrCode, title: "QR Code Check-In", desc: "Instant player check-in on tournament day — no paper lists." },
  { icon: Gavel, title: "Auction & Raffle", desc: "Silent auctions with Buy Now, bid tracking, and online raffle ticket sales." },
  { icon: Heart, title: "Donation Portal", desc: "Fundraising goal tracking with progress bars and Stripe-powered donations." },
  { icon: ShoppingBag, title: "Merchandise Store", desc: "Sell branded apparel and gear with integrated checkout." },
  { icon: Camera, title: "Photo Gallery", desc: "Upload and showcase tournament photos with captions." },
  { icon: ClipboardList, title: "Planning Guide", desc: "Pre-built checklist system to keep organizers on track." },
  { icon: UserCheck, title: "Volunteer Coordinator", desc: "Define roles, time slots, and manage volunteer signups." },
];

const sellingPoints = [
  { stat: "5 min", label: "Average setup time", icon: Zap },
  { stat: "100%", label: "Mobile optimized", icon: Smartphone },
  { stat: "0", label: "Tech skills needed", icon: LayoutDashboard },
  { stat: "5%", label: "Simple platform fee", icon: PieChart },
];

const whyTeeVents = [
  "Replace 10+ tools with one platform",
  "Organizers keep full control of their revenue via Stripe Connect",
  "No monthly subscriptions — pay per tournament",
  "White-label branding for every event",
  "Built for nonprofits, corporations, and golf communities",
  "Dedicated support from golf industry professionals",
];

const Demo = () => {
  return (
    <Layout>
      {/* Hero */}
      <HeroSection backgroundImage={heroGolf} title="" height="h-screen">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <img src={logoWhite} alt="TeeVents" className="h-28 w-28 mx-auto mb-4 object-contain" />
          <p className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
            Platform Demo
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground text-shadow-hero leading-tight">
            The Complete Golf
            <br />
            <span className="text-secondary">Tournament Platform</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Everything your organization needs to plan, manage, and execute a world-class golf tournament — all from one dashboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/platform#pricing"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              View Plans & Pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              Schedule a Walkthrough
            </Link>
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

      {/* Core Modules — Alternating Layout */}
      <section className="bg-golf-cream py-24">
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
                  {/* Screenshot */}
                  <div className="w-full md:w-5/12 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/5 rounded-2xl rotate-3 scale-[1.02]" />
                      <img
                        src={mod.image}
                        alt={mod.title}
                        className="relative rounded-2xl border border-border shadow-lg w-full max-w-sm object-cover"
                      />
                    </div>
                  </div>

                  {/* Details */}
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

      {/* Advanced Features Grid */}
      <section className="bg-primary py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Advanced Features</h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">
              Go Beyond the Basics
            </h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Revenue Model / Stripe Connect */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div variants={slideRight} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">Revenue Model</h3>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                You Keep Your Revenue.
                <br />We Take a Simple 5%.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Powered by Stripe Connect, all registration fees, store purchases, auction sales, and donations flow directly to the organizer's bank account — minus a transparent 5% platform fee. No invoices, no delays.
              </p>
              <div className="space-y-3">
                {[
                  "Registration payments → organizer's Stripe",
                  "Store purchases → organizer's Stripe",
                  "Auction Buy Now → organizer's Stripe",
                  "Donations → organizer's Stripe",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Send className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={slideLeft} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
                <h4 className="font-display font-bold text-foreground text-lg mb-6">Example: $150 Registration Fee</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-muted-foreground">Golfer pays</span>
                    <span className="font-display font-bold text-foreground text-xl">$150.00</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-muted-foreground">Platform fee (5%)</span>
                    <span className="font-display font-bold text-destructive">−$7.50</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-foreground">Organizer receives</span>
                    <span className="font-display font-bold text-primary text-2xl">$142.50</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why TeeVents */}
      <section className="bg-golf-cream py-24">
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

      {/* CTA */}
      <section className="bg-background py-20 border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
              Ready to See It in Action?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Get started with TeeVents today or schedule a personalized walkthrough with our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/platform#pricing"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary/90 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Demo;

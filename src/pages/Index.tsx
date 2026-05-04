import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CreditCard,
  MessageSquare,
  Globe,
  Users,
  BarChart3,
  Award,
  Trophy,
  CheckCircle,
  Star,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import heroGolf from "@/assets/hero-golf.jpg";
import logoWhite from "@/assets/logo-white.png";

const highlights = [
  {
    icon: Globe,
    title: "Custom Tournament Website",
    description: "Launch a branded event site in minutes — no design skills needed.",
  },
  {
    icon: CreditCard,
    title: "Online Registration & Payments",
    description: "Accept credit cards, Apple Pay, and Google Pay with automated confirmations.",
  },
  {
    icon: MessageSquare,
    title: "SMS & Email Updates",
    description: "Keep golfers, sponsors, and volunteers informed in real time.",
  },
  {
    icon: Users,
    title: "Player Pairings & Check-In",
    description: "Drag-and-drop pairings with QR code check-in on tournament day.",
  },
  {
    icon: BarChart3,
    title: "Live Budget Tracking",
    description: "Track every dollar of revenue and expense as it happens.",
  },
  {
    icon: Award,
    title: "Sponsor & Auction Tools",
    description: "Showcase sponsors and run silent auctions & raffles online.",
  },
];

const steps = [
  { num: "01", title: "Start Free", text: "Create your account on the Base plan at $0 — upgrade any tournament to Pro for $399 when you're ready." },
  { num: "02", title: "Build & Customize", text: "Set up your branded site, registration, and sponsor pages." },
  { num: "03", title: "Launch & Manage", text: "Go live and run everything from one powerful dashboard." },
];

const stats = [
  { value: "10+", label: "Features Included" },
  { value: "100%", label: "Mobile Optimized" },
  { value: "24/7", label: "Platform Access" },
  { value: "0", label: "Tech Skills Needed" },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Index = () => {
  return (
    <Layout>
      <SEO title="Home" description="The all-in-one platform for nonprofits and corporations to plan, manage, and execute world-class golf tournaments." path="/" />
      {/* Hero */}
      <HeroSection backgroundImage={heroGolf} title="" height="min-h-screen py-20 md:py-0 md:h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={logoWhite}
            alt="TeeVents Golf"
            className="h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 mx-auto mb-4 md:mb-6 object-contain"
          />
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground text-shadow-hero leading-tight">
            Run Your Golf Tournament
            <br />
            <span className="text-secondary">Like a Pro</span>
          </h1>
           <p className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            The all-in-one platform for nonprofits and corporations to plan,
            manage, and execute world-class golf tournaments.
            <span className="block mt-2 text-secondary font-semibold text-sm sm:text-base">
              Payments split automatically at checkout — we never hold your money.
            </span>
          </p>
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to="/plans#pricing"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              View Plans & Pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/plans"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              See How It Works
            </Link>
            <Link
              to="/book"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              Book a Live Demo
            </Link>
          </div>
        </motion.div>
      </HeroSection>

      {/* Stats Bar */}
      <section className="bg-primary py-8 border-b border-primary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-display font-bold text-secondary">
                  {stat.value}
                </p>
                <p className="text-sm text-primary-foreground/70 mt-1 font-medium">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Prop */}
      <section className="bg-golf-cream py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              Why TeeVents
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">
              Stop Juggling Spreadsheets.
              <br />
              Start Running Great Tournaments.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              From registration to the awards ceremony, our platform handles
              every detail so you can focus on your cause. One dashboard,
              zero headaches.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              Platform Features
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              Everything You Need, Built In
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {highlights.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-12">
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:text-secondary transition-colors"
            >
              See All Features
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-primary py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              How It Works
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">
              Up and Running in Minutes
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="text-center"
              >
                <div className="text-6xl font-display font-bold text-secondary/30 mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-display font-bold text-primary-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-primary-foreground/70 leading-relaxed">
                  {step.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="bg-golf-cream py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-display italic text-foreground leading-relaxed">
              "TeeVents made planning our charity golf tournament effortless.
              The registration, pairings, and sponsor tools saved us
              countless hours of work."
            </blockquote>
            <p className="mt-6 text-muted-foreground font-medium">
              — Tournament Organizer
            </p>
            <Link
              to="/reviews"
              className="inline-flex items-center gap-2 text-primary font-semibold mt-6 hover:text-secondary transition-colors"
            >
              Read More Reviews
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How Payments Work */}
      <section className="bg-background py-24 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              How Payments Work
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
              We Never Hold Your Money
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Payments split automatically at checkout using Stripe Connect. Your funds go directly to your Stripe account — TeeVents never touches them.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Golfer Pays", desc: "Full registration amount charged at checkout via Stripe." },
              { num: "2", title: "5% Fee Deducted", desc: "TeeVents automatically receives a 5% platform fee." },
              { num: "3", title: "Stripe Fee Applied", desc: "Standard 2.9% + $0.30 processing fee deducted by Stripe." },
              { num: "4", title: "You Get Paid", desc: "Net proceeds land directly in your connected Stripe account. New Stripe accounts: funds typically available within 2–7 business days (standard Stripe review)." },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center bg-card border border-border rounded-xl p-6"
              >
                <div className="w-10 h-10 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                  {step.num}
                </div>
                <h4 className="text-lg font-display font-bold text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
            <p className="text-foreground font-semibold">
              💡 TeeVents never holds your money. Stripe sends net proceeds directly to your bank account on your schedule. For brand-new Stripe Connect accounts, Stripe applies a standard 2–7 business day review before funds become available to withdraw.
            </p>
          </div>
        </div>
      </section>

      {/* Consulting Mention */}
      <section className="bg-background py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-14 h-14 bg-secondary/10 rounded-lg flex items-center justify-center mb-5">
                <Trophy className="h-7 w-7 text-secondary" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                Need Hands-On Help?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Our team has years of experience in the golf industry. Whether you
                need full-service tournament consulting or just a helping hand with
                logistics, we're here for you.
              </p>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary/90 transition-colors"
              >
                Our Services
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {[
                "Tournament planning & day-of coordination",
                "Sponsor acquisition strategy",
                "Course selection & vendor management",
                "Budget planning & financial reporting",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-6">
              Ready to Elevate Your
              <br />
              Golf Tournament?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Join the growing number of nonprofits and corporations using
              TeeVents to run unforgettable golf events.
            </p>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/plans"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                View Pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Book a Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;

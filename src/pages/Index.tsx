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
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import FindYourLeague from "@/components/leagues/FindYourLeague";
import { DedicatedRepBadge, DedicatedRepSection, WhyServiceMatters } from "@/components/DedicatedRep";
import FounderSection from "@/components/FounderSection";
import FounderPartners from "@/components/FounderPartners";
import OrganizerTestimonials from "@/components/OrganizerTestimonials";
import { Button } from "@/components/ui/button";

import heroGolf from "@/assets/hero-golf.jpg";
import logoWhite from "@/assets/logo-white.png";

const highlights = [
  {
    icon: Globe,
    title: "Custom Tournament Website",
    description: "Your dedicated rep builds a branded event site — no design work for you.",
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
  { num: "01", title: "Tell Us About Your Event", text: "Share your event details, logo, colors, and goals with your named TeeVents rep." },
  { num: "02", title: "We Build It For You", text: "Your rep sets up your branded site, registration, sponsor page, pairings, and scoring." },
  { num: "03", title: "Run Your Tournament", text: "Everything is ready to go, with your dedicated partner before, during, and after the event." },
];

const stats = [
  "100% of events include a dedicated rep — free or paid",
  "20+ Years in the Golf Industry",
  "10+ Years as a Tournament Director",
  "Trusted by the Largest HBCU Golf Tournament in the World",
  "Trusted by the Black College Golf Coaches Association Since 2017",
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
      <SEO title="TeeVents — The Golf Tournament Platform That Builds Your Event For You" description="Every event includes a named TeeVents rep who builds your branded page, registration, leaderboard, pairings, and scoring — free or paid." path="/" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "TeeVents Golf",
              alternateName: "TeeVents Golf Management",
              url: "https://www.teevents.golf/",
              logo: "https://www.teevents.golf/logo.png",
              image: "https://www.teevents.golf/logo.png",
              email: "info@teevents.golf",
              description: "Golf tournament management platform for organizers.",
              areaServed: "US",
              address: { "@type": "PostalAddress", addressCountry: "US" },
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: "info@teevents.golf",
                  areaServed: "US",
                  availableLanguage: "English",
                },
              ],
              sameAs: ["https://www.teevents.golf/"],
            },
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://www.teevents.golf/#localbusiness",
              name: "TeeVents Golf",
              url: "https://www.teevents.golf/",
              logo: "https://www.teevents.golf/logo.png",
              image: "https://www.teevents.golf/logo.png",
              email: "info@teevents.golf",
              description: "Golf tournament management platform for organizers.",
              priceRange: "$",
              address: { "@type": "PostalAddress", addressCountry: "US" },
              areaServed: { "@type": "Country", name: "United States" },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "TeeVents",
              url: "https://www.teevents.golf/",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://www.teevents.golf/tournaments/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ]),
        }}
      />
      {/* Hero */}
      <HeroSection backgroundImage={heroGolf} title="" height="min-h-[680px] py-8 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={logoWhite}
            alt="TeeVents Golf"
             className="h-12 w-12 md:h-20 md:w-20 mx-auto mb-4 object-contain"
          />
          <p className="mb-3 text-sm font-semibold text-secondary">For nonprofit, charity &amp; corporate golf tournaments</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground text-shadow-hero leading-tight">
            The Golf Tournament Platform That
            <span className="text-secondary"> Builds Your Event For You</span>
          </h1>
          <p className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto font-medium">
            Every event includes a dedicated TeeVents rep — free or paid — who sets up your branded event page, sponsor page, registration, mobile scoring, pairings, and live leaderboard — so you can focus on running your tournament, not the software.
          </p>
          <p className="mt-3 md:mt-4 text-sm sm:text-base md:text-lg text-primary-foreground/75 max-w-2xl mx-auto leading-relaxed">
            Built by a tournament director with 20+ years in the golf industry. No spreadsheets. No manual setup. No stress. You tell us about your event — we build it for you.
          </p>
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              Get Started — We'll Build It For You
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/request-sample"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              Request a Sample
            </Link>
          </div>
          <p className="mt-4 text-xs sm:text-sm text-primary-foreground/90 max-w-xl mx-auto">No credit card to start. Payments go straight to your connected Stripe account — we never hold your money. <Link to="/help/how-payments-work" className="underline">How payments work</Link></p>
        </motion.div>
      </HeroSection>

      <DedicatedRepBadge />
      <DedicatedRepSection />
      <WhyServiceMatters />

      {/* Stats Bar */}
      <section className="bg-primary py-8 border-b border-primary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {stats.map((stat) => (
              <motion.div
                key={stat}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-lg font-display font-semibold text-primary-foreground leading-relaxed">
                  {stat}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <FounderSection />
      <FounderPartners />
      <OrganizerTestimonials />

      {/* For Tournament Organizers */}
      <section className="bg-golf-cream py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4 text-center">
              For You
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight text-center mb-10">
              For Tournament Organizers
            </h2>
            <ul className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {[
                "Your rep builds your professional tournament website",
                "Sell registrations & sponsorships online",
                "Manage players, pairings, and live scoring",
                "Get paid automatically – we never hold your money",
                "Share registration and financial reports with your board",
                "Invite staff and volunteers with role-based access",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 bg-card p-4 rounded-lg border border-border">
                  <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* For Golfers */}
      <section className="bg-background py-20 md:py-24 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4 text-center">
              For Players
            </h3>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight text-center mb-10">
              For Golfers
            </h2>
            <ul className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {[
                "Discover & register for tournaments",
                "QR check‑in & live scoring from your phone",
                "Follow the live leaderboard",
                "Instant email confirmation & calendar invites",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 bg-card p-4 rounded-lg border border-border">
                  <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Trust / Differentiation */}
      <section className="bg-primary py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-6">
              Why TeeVents
            </h3>
            <p className="text-xl md:text-2xl font-display text-primary-foreground leading-relaxed mb-8">
              Built by golf tournament managers, for golf tournament managers.
              With over a decade of experience, we built TeeVents to solve the exact problems we faced.
            </p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 text-left mb-10">
              {[
                ['A named rep on every plan', 'Your event built by a real person — free or paid.'],
                ['Custom leaderboard colors', 'Your rep matches every leaderboard to your event colors.'],
                ['Event pages that look like real websites', 'A polished home for registration, event details, and sponsors.'],
                ['Free for organizers (player-funded)', '$0 to start, with the 5% platform fee covered by players.'],
                ['Built for golf', 'Pairings, handicaps, and scoring — not generic event tools.'],
                ['Sponsor highlights', 'Put your sponsors in front of players on your event page and leaderboard.'],
                ['White-label branding', 'Keep your organization’s identity at the center of the experience.'],
              ].map(([title, description]) => <div key={title} className="border-t border-primary-foreground/20 pt-4"><h3 className="font-display text-lg font-semibold text-secondary">{title}</h3><p className="mt-2 text-sm text-primary-foreground/80 leading-relaxed">{description}</p></div>)}
            </div>
            <div className="bg-primary-foreground/5 border border-primary-foreground/15 rounded-xl p-6 md:p-8 mb-10">
              <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
                <span className="text-secondary font-semibold">We never hold your money.</span>{" "}
                Payments split automatically at checkout. You get paid when your players register.
              </p>
            </div>
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3.5 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              Start a Tournament
              <ArrowRight className="h-4 w-4" />
            </Link>
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
              to="/features"
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
              You Tell Us. We Build It. You Run It.
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

      <section className="bg-background py-16 border-t border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="font-display text-3xl font-bold text-primary mb-8">Choose the right fit for your event</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              ['No Cost to Start', '$0', '5% platform fee covered by players'],
              ['Per-Event', '$299', 'per tournament · 0% platform fees'],
              ['Per-League', '$499', 'per league · 0% platform fees'],
              ['Enterprise', '$2,999', 'per year · unlimited events'],
             ].map(([title, price, description]) => <div key={title} className={title === 'Per-Event' ? "rounded-lg border-2 border-secondary bg-card p-5 shadow-md" : "border-t-2 border-secondary pt-5"}>{title === 'Per-Event' && <p className="mb-3 text-xs font-bold text-primary">Recommended for charity and first-time organizers</p>}<h3 className="font-display text-xl font-semibold">{title}</h3><p className="font-display text-3xl font-bold text-primary mt-3">{price}</p><p className="text-sm text-muted-foreground mt-2">{description}</p></div>)}
          </div>
          <p className="mt-8 text-muted-foreground">A dedicated rep and your event page build are included on every plan — even free. Optional add-ons are $99 each. Standard card processing applies.</p>
          <Button asChild className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"><Link to="/plans">View Plans &amp; Pricing <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline" className="mt-6 sm:ml-3"><Link to="/sales-sheet">TeeVents Sales Sheet <ArrowRight className="h-4 w-4" /></Link></Button>
          <p className="mt-4 text-sm text-muted-foreground">No credit card to start. Payments go straight to your connected Stripe account — we never hold your money. <Link to="/help/how-payments-work" className="text-primary underline">How payments work</Link></p>
        </div>
      </section>

      {/* How Payments Work */}
      <section id="payments" className="bg-background py-24 border-t border-border">
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
              { num: "2", title: "Your Plan Applies", desc: "No Cost to Start: a 5% platform fee covered by players. Paid plans: 0% platform transaction fees." },
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

      <FindYourLeague />

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
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
              >
                Start a Tournament
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/request-sample"
                className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
              >
                Request a Sample
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;

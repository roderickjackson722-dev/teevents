import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Monitor, Flag, Calendar, Rocket, Phone, Check } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import aboutBg from "@/assets/golf-about-bg.jpg";

const platformFeatures: { name: string; description: string }[] = [
  { name: "Tournament Website", description: "Branded public page – live in 10 minutes. Custom domain support." },
  { name: "Online Registration", description: "Stripe, Apple Pay, Google Pay. Group registration (foursomes)." },
  { name: "Live Leaderboard", description: "Real-time gross/net scores. Embed on any website." },
  { name: "QR Check-In & Scoring", description: "Scan a QR code to check in. Players enter scores from their phone." },
  { name: "Sponsor Management", description: "Tiered packages, asset delivery, ROI tracking. Sponsor logos on leaderboard." },
  { name: "Volunteer Coordination", description: "Shift scheduling, QR check-in, automated reminders." },
  { name: "Day-of Event Page", description: "Players see tee times, group, leaderboard, sponsor ads, and announcements." },
  { name: "Automatic Payouts", description: "Stripe Connect – funds go directly to your bank account. No holding." },
  { name: "Printables & Reports", description: "Scorecards, cart signs, name badges, CSV exports, financial reports." },
];

const onsitePhases: { phase: string; services: string }[] = [
  { phase: "Planning", services: "Course selection, contract negotiation, budget creation, timeline development" },
  { phase: "Logistics", services: "Volunteer recruitment, staff training, equipment setup, signage production" },
  { phase: "Day-of Execution", services: "Check-in management, scoring oversight, volunteer coordination, real-time troubleshooting" },
  { phase: "Sponsor Management", services: "Sponsor recruitment, asset delivery, on-site recognition, post-event reporting" },
  { phase: "Post-Event", services: "Awards ceremony coordination, final scoring, participant surveys, financial reconciliation" },
];

const processSteps: { step: string; title: string; body: string }[] = [
  { step: "Step 1", title: "Discovery", body: "We learn about your event – size, budget, goals, and timeline." },
  { step: "Step 2", title: "Setup", body: "If you're using the platform, we help you get set up in under 10 minutes. If you're using our full-service option, we handle everything from course negotiation to day-of execution." },
  { step: "Step 3", title: "Execution", body: "Your tournament runs smoothly – whether you're managing it yourself through the dashboard or our team is on-site handling every detail." },
  { step: "Step 4", title: "Wrap-Up", body: "We help you finalize scores, process payouts, and gather feedback for next year." },
];

const whyUs: { why: string; meaning: string }[] = [
  { why: "Built by Directors", meaning: "Every feature was designed by people who have run tournaments. No guesswork." },
  { why: "All-in-One", meaning: "No need for multiple platforms – website, registration, scoring, sponsors, payouts, all in one place." },
  { why: "No Upfront Cost", meaning: "Start with no upfront cost. You only pay when you collect registration fees." },
  { why: "We Never Hold Your Money", meaning: "Stripe pays you instantly. No waiting weeks for your funds." },
  { why: "Real Human Support", meaning: "You talk to tournament directors, not chatbots." },
];

const platformBullets = [
  "Branded tournament website",
  "Online registration & payments",
  "Live leaderboard & scoring",
  "Sponsor management",
  "Automatic payouts",
];

const onsiteBullets = [
  "Course negotiation",
  "Sponsor recruitment",
  "Volunteer coordination",
  "Day-of event management",
  "Post-event wrap-up",
];

const About = () => {
  return (
    <Layout>
      <SEO
        title="About TeeVents – Platform & On-Site Event Management"
        description="TeeVents is the complete golf tournament solution — an online platform plus full-service on-site event management, built by tournament directors."
        path="/about"
      />
      <HeroSection
        backgroundImage={aboutBg}
        title="About TeeVents"
        subtitle="The complete golf tournament solution — platform and on-site management."
        height="h-[60vh]"
      />

      {/* Intro */}
      <section className="bg-golf-cream py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-lg p-8 md:p-10 shadow-sm text-center"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-primary mb-4">
              We are tournament directors, software builders, and event managers.
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              TeeVents was built from the ground up by people who have run hundreds of golf tournaments.
              We know what organizers need because we've been in their shoes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Two-column dual offering */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-lg p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-md bg-primary/10 text-primary">
                  <Monitor className="h-6 w-6" />
                </div>
                <h3 className="font-display text-2xl font-bold text-primary">The Online Platform</h3>
              </div>
              <p className="text-foreground/80 mb-5">
                A complete tournament management system built for golf.
              </p>
              <ul className="space-y-2">
                {platformBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-lg p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-md bg-secondary/15 text-secondary">
                  <Flag className="h-6 w-6" />
                </div>
                <h3 className="font-display text-2xl font-bold text-primary">On-Site Event Management</h3>
              </div>
              <p className="text-foreground/80 mb-5">
                Full-service event execution from start to finish.
              </p>
              <ul className="space-y-2">
                {onsiteBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tabs deep-dive */}
      <section className="bg-golf-cream py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <Tabs defaultValue="platform" className="w-full">
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto gap-2 bg-transparent p-0 mb-6">
              <TabsTrigger value="platform" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5">Platform</TabsTrigger>
              <TabsTrigger value="onsite" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5">Event Management</TabsTrigger>
              <TabsTrigger value="process" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5">Our Process</TabsTrigger>
              <TabsTrigger value="why" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5">Why Us</TabsTrigger>
            </TabsList>

            <TabsContent value="platform" className="mt-0">
              <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
                <h3 className="font-display text-2xl font-bold text-primary mb-2">
                  Everything You Need to Run a Tournament Online
                </h3>
                <p className="text-foreground/80 mb-6">
                  TeeVents is a complete golf tournament management platform built by tournament directors for tournament directors. Whether you're running a charity event, a corporate outing, or a club championship, the platform gives you everything you need.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-3 font-semibold text-primary border-b border-border w-1/3">Feature</th>
                        <th className="p-3 font-semibold text-primary border-b border-border">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformFeatures.map((f) => (
                        <tr key={f.name} className="border-b border-border/60">
                          <td className="p-3 font-medium text-foreground align-top">{f.name}</td>
                          <td className="p-3 text-sm text-foreground/80">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="onsite" className="mt-0">
              <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
                <h3 className="font-display text-2xl font-bold text-primary mb-2">
                  Full-Service Event Management – From Concept to Completion
                </h3>
                <p className="text-foreground/80 mb-6">
                  If you prefer a hands-off approach, our team can manage your entire tournament from start to finish. We handle every detail so you can focus on your guests and sponsors.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-3 font-semibold text-primary border-b border-border w-1/3">Phase</th>
                        <th className="p-3 font-semibold text-primary border-b border-border">Services</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onsitePhases.map((p) => (
                        <tr key={p.phase} className="border-b border-border/60">
                          <td className="p-3 font-medium text-foreground align-top">{p.phase}</td>
                          <td className="p-3 text-sm text-foreground/80">{p.services}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="process" className="mt-0">
              <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
                <h3 className="font-display text-2xl font-bold text-primary mb-2">How We Work</h3>
                <p className="text-foreground/80 mb-6">
                  We meet you where you are. Whether you need full-service management or just the platform, we adapt to your needs.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {processSteps.map((s) => (
                    <div key={s.step} className="border border-border rounded-md p-5 bg-background">
                      <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">{s.step}</div>
                      <div className="font-display text-lg font-bold text-primary mb-2">{s.title}</div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="why" className="mt-0">
              <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
                <h3 className="font-display text-2xl font-bold text-primary mb-2">
                  Why Tournament Directors Choose TeeVents
                </h3>
                <p className="text-foreground/80 mb-6">
                  We are tournament directors first. We've run hundreds of events – from small club outings to large charity tournaments. We built TeeVents to solve the problems we experienced firsthand.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-3 font-semibold text-primary border-b border-border w-1/3">Why</th>
                        <th className="p-3 font-semibold text-primary border-b border-border">What It Means</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whyUs.map((w) => (
                        <tr key={w.why} className="border-b border-border/60">
                          <td className="p-3 font-medium text-foreground align-top">{w.why}</td>
                          <td className="p-3 text-sm text-foreground/80">{w.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Run Your Tournament?
          </h2>
          <p className="text-primary-foreground/85 text-lg mb-8">
            Whether you need the platform, full-service management, or both — we're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              <Calendar className="h-4 w-4" /> Request a Sample
            </Link>
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-6 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/90 transition-colors"
            >
              <Rocket className="h-4 w-4" /> Get Started
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 text-primary-foreground px-6 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              <Phone className="h-4 w-4" /> Contact Us
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  Shield,
  Receipt,
  BadgeCheck,
  DollarSign,
  Users,
  Globe,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Megaphone,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroGolf from "@/assets/hero-golf.jpg";

const benefits = [
  {
    icon: DollarSign,
    title: "100% Revenue to Your Cause",
    description:
      "With our 'Donor Covers Fees' model, registrants can opt to cover the platform and processing fees — so your organization keeps every dollar raised.",
  },
  {
    icon: Shield,
    title: "Locked 5% Platform Fee",
    description:
      "Nonprofits always pay just 5% — regardless of plan tier. No surprise rate hikes, no hidden costs. Transparent pricing you can budget around.",
  },
  {
    icon: BadgeCheck,
    title: "Verified 501(c)(3) Badge",
    description:
      "Enter your EIN and we verify it against the IRS database instantly. Your tournament site displays a trusted nonprofit badge that builds donor confidence.",
  },
  {
    icon: Receipt,
    title: "Automated Tax Receipts",
    description:
      "Every donation and registration automatically generates a branded, IRS-compliant tax-exempt receipt with your EIN — emailed and available as PDF.",
  },
  {
    icon: Heart,
    title: "Built-In Donation Page",
    description:
      "Accept donations beyond registration with a dedicated page, progress bar toward your fundraising goal, and real-time tracking in your dashboard.",
  },
  {
    icon: Globe,
    title: "Professional Tournament Website",
    description:
      "Launch a branded event site in minutes with custom domain support, event agenda, photo gallery, and sponsor showcases — no developer required.",
  },
  {
    icon: Users,
    title: "Volunteer Coordination",
    description:
      "Recruit and manage volunteers with defined roles, time slots, and automated confirmations — all from the same dashboard.",
  },
  {
    icon: Megaphone,
    title: "Email & SMS Outreach",
    description:
      "Communicate with your entire player roster via email and SMS. Schedule messages, track delivery, and keep supporters engaged.",
  },
];

const steps = [
  { step: "1", label: "Sign Up Free", detail: "Create your account in under 2 minutes." },
  { step: "2", label: "Verify Your EIN", detail: "Enter your 501(c)(3) EIN for instant verification." },
  { step: "3", label: "Build Your Tournament", detail: "Add details, set pricing, and customize your site." },
  { step: "4", label: "Go Live & Fundraise", detail: "Publish your site and start collecting registrations." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const Nonprofits = () => {
  return (
    <Layout>
      <SEO
        title="Nonprofits"
        description="TeeVents empowers 501(c)(3) nonprofits with a locked 5% platform fee, donor-covers-fees model, automated tax receipts, and everything you need to run a charity golf tournament."
        path="/nonprofits"
      />

      {/* Hero */}
      <HeroSection
        backgroundImage={heroGolf}
        title="Your Mission Deserves Every Dollar"
        subtitle="TeeVents gives nonprofit organizations a game-changing advantage — a locked 5% platform fee, donor-covered costs, and automated tax receipts so 100% of your fundraising goes where it matters."
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base px-8">
            <Link to="/get-started">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild className="text-base px-8 font-bold">
            <Link to="/demo">See a Live Demo</Link>
          </Button>
        </div>
      </HeroSection>

      {/* Social Proof Banner */}
      <section className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto flex flex-wrap justify-center gap-8 md:gap-16 text-center text-sm md:text-base font-medium">
          <span>✓ Verified 501(c)(3) Support</span>
          <span>✓ Locked 5% Fee — All Plans</span>
          <span>✓ $0 to Start</span>
          <span>✓ Custom Domain Support</span>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Built for Nonprofits, From the Ground Up
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              Every feature is designed to maximize your fundraising while minimizing the work.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full border-border hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <b.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                      {b.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {b.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Comparison */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              See the Difference
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
              When donors cover fees, your organization keeps 100%.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="border-destructive/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm font-medium text-destructive uppercase tracking-wider mb-2">Without TeeVents</p>
                  <p className="text-4xl font-display font-bold text-foreground">$150</p>
                  <p className="text-muted-foreground text-sm mt-1">Registration collected</p>
                  <div className="my-6 space-y-2 text-sm text-left">
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (10-15%)</span><span className="text-destructive font-medium">-$22.50</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Processing fee</span><span className="text-destructive font-medium">-$4.65</span></div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold"><span>You keep</span><span className="text-foreground">$122.85</span></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="border-primary ring-2 ring-primary/20">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">With TeeVents (Donor Covers Fees)</p>
                  <p className="text-4xl font-display font-bold text-foreground">$150</p>
                  <p className="text-muted-foreground text-sm mt-1">Registration collected</p>
                  <div className="my-6 space-y-2 text-sm text-left">
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (5%)</span><span className="text-primary font-medium">Donor pays</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Processing fee</span><span className="text-primary font-medium">Donor pays</span></div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold"><span>You keep</span><span className="text-primary text-lg">$150.00</span></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Get Started in 4 Simple Steps
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{s.label}</h3>
                <p className="text-muted-foreground text-sm">{s.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist / Extra Features */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Everything You Need — Nothing You Don't
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              "Online registration & payments",
              "Custom tournament website",
              "Live scoring & leaderboard",
              "QR code check-in",
              "Sponsor management & tiers",
              "Budget tracking",
              "Email & SMS messaging",
              "Auction & raffle tools",
              "Photo gallery",
              "Surveys & feedback",
              "Printable scorecards & cart signs",
              "30-item planning checklist",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <BarChart3 className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Ready to Maximize Your Fundraising?
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-lg">
              Join nonprofits that keep 100% of their tournament revenue with TeeVents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild className="text-base px-8">
                <Link to="/get-started">
                  Start Free Today <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/contact">Talk to Our Team</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Nonprofits;

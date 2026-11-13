import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Layout from "@/components/Layout";
import { DedicatedRepBadge, DedicatedRepSection } from "@/components/DedicatedRep";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import servicesBg from "@/assets/golf-services-bg.jpg";

const services = [
  "Create Tournament Website",
  "Golf Course Negotiation",
  "Reviewing Contracts",
  "Budget & Revenue Tracking",
  "Liaison with Course",
  "Manage Volunteers",
  "Manage Tournament Committee",
  "Event Timeline Management",
  "Establish Golf Format",
  "Manage Golf Pairings",
  "Manage Event Contests",
  "Fundraising Strategies",
  "Scoring Services",
  "Coordinate Awards",
  "Manage Food & Beverage",
  "Assist with Sourcing Event Needs",
];

const clientTypes = [
  "Non-Profits",
  "Companies",
  "Foundations",
  "Schools",
  "Church Groups",
  "Professional Athletes",
  "Large Golf Groups",
  "& Many More",
];

const Services = () => {
  return (
    <Layout>
      <SEO title="Services" description="Full-service golf tournament consulting — from course selection and vendor management to day-of coordination and sponsor strategy." path="/services" />
      <HeroSection
        backgroundImage={servicesBg}
        title="Our Services"
        subtitle="Creating Perfect Golf Events"
        height="h-[60vh]"
      />

      <DedicatedRepBadge />
      <DedicatedRepSection extraLine="Your virtual Tournament director builds it, sets it up, and stays on call on event day for live scoring and leaderboard challenges." />
      <section className="bg-golf-cream py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-foreground/80 leading-relaxed text-center mb-16 max-w-3xl mx-auto"
          >
            At TeeVents Golf Mgt., we are dedicated to providing exceptional golf tournament planning
            services that are tailor-made to meet the unique needs and goals of our clients. From start
            to finish, we handle every aspect of tournament planning.
          </motion.p>

          <h2 className="text-3xl font-display font-bold text-primary text-center mb-10">
            Services Include:
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {services.map((service, i) => (
              <motion.div
                key={service}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 bg-card p-4 rounded-lg border border-border"
              >
                <Check className="h-5 w-5 text-secondary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{service}</span>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground italic mb-16">
            *Effective tournament planning starts 1 year prior to event date.
          </p>

          <h2 className="text-3xl font-display font-bold text-primary text-center mb-10">
            Two Ways To Work With Us
          </h2>

          <div className="grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="font-display text-xl font-bold text-primary">Software With Your Director</h3>
              <p className="mt-3 text-foreground/80 leading-relaxed">Your director builds your branded event page, registration, pairings, format, mobile scoring, and live leaderboard for you. You run your tournament, and your rep is on call on event day. Start at no cost with the 8% service fee paid by players, or pay $399 per event with no platform fee.</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="font-display text-xl font-bold text-primary">Full Service Management, On Site</h3>
              <p className="mt-3 text-foreground/80 leading-relaxed">A dedicated tournament manager works with you from agreement through event day and closeout, on site from check in through awards. Contact us for a quote. The price is shown in your proposal after a meeting, starting at $5,000 per event.</p>
            </div>
          </div>

          <h2 className="text-3xl font-display font-bold text-primary text-center mb-10">
            Who We Serve
          </h2>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {clientTypes.map((type) => (
              <span
                key={type}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium"
              >
                {type}
              </span>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/contact"
              className="inline-block bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              Schedule A Call
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;

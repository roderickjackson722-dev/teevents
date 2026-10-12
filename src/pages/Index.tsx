import { Link } from "react-router-dom";
import { ArrowRight, UserRoundCheck, Paintbrush, CircleDollarSign, ShieldCheck, Quote } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HomeHowItWorks from "@/components/HomeHowItWorks";
import { founderPartnerLogos } from "@/components/FounderPartners";
import { ORGANIZER_TESTIMONIALS } from "@/components/OrganizerTestimonials";
import { Button } from "@/components/ui/button";
import heroGolf from "@/assets/hero-golf.jpg";

const differentiators = [
  { icon: UserRoundCheck, title: "A Named Rep on Every Plan", text: "Your event built by a real person, free or paid." },
  { icon: Paintbrush, title: "Custom Leaderboard & Event Pages", text: "Your rep matches every leaderboard to your event colors. Event pages that look like real websites." },
  { icon: CircleDollarSign, title: "Free for Organizers", text: "Start at $0, with the 5% platform fee covered by players." },
];

function HomeActions({ hero = false }: { hero?: boolean }) {
  return <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
    <Button asChild variant="secondary" size="lg" className="h-auto min-h-12 whitespace-normal px-5 py-3 text-center font-semibold uppercase leading-snug">
      <Link to="/get-started">{hero ? "Get Started, We'll Build It For You" : "Get Started"}<ArrowRight aria-hidden="true" /></Link>
    </Button>
    {!hero && <Button asChild variant="outline" size="lg" className="h-auto min-h-12 border-primary-foreground/60 bg-transparent py-3 font-semibold uppercase text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
      <Link to="/request-sample">Request a Sample</Link>
    </Button>}
  </div>;
}

export default function Index() {
  const testimonial = ORGANIZER_TESTIMONIALS[0];
  return <Layout>
    <SEO title="TeeVents | The Golf Tournament Platform That Builds Your Event For You" description="Every event includes a dedicated TeeVents rep who builds your event page, registration, sponsor page, scoring, pairings, and leaderboard, free or paid." path="/" />
    <div className="homepage">
      <section aria-labelledby="homepage-title" className="relative overflow-hidden bg-primary text-primary-foreground">
        <img src={heroGolf} alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        <div className="homepage-hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex min-h-[680px] max-w-5xl flex-col justify-center px-6 py-14 text-center md:py-20">
          <h1 id="homepage-title" className="font-display text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">The Golf Tournament Platform That <span className="text-secondary">Builds Your Event For You</span></h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-primary-foreground/95 md:text-lg">Every event includes a dedicated TeeVents rep, free or paid, who sets up your branded event page, sponsor page, registration, mobile scoring, pairings, and live leaderboard. You focus on running your tournament while we handle the software.</p>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 md:text-base">Built by a tournament director with over 20 years in the golf industry. No spreadsheets. No manual setup. No stress.</p>
          <div className="mt-8"><HomeActions hero /></div>
          <p className="mx-auto mt-6 flex max-w-2xl items-start justify-center gap-2 text-xs leading-relaxed text-primary-foreground/85 md:text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" /><span>No credit card to start. Payments go straight to your connected Stripe account. We never hold your money.</span></p>
        </div>
      </section>

      <HomeHowItWorks />

      <section aria-labelledby="differentiators-title" className="bg-primary py-14 text-primary-foreground md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="differentiators-title" className="mb-10 text-center font-display text-3xl font-bold leading-tight md:mb-14 md:text-4xl">Why Organizers Choose TeeVents</h2>
          <div className="grid gap-8 md:grid-cols-3 md:gap-12">
            {differentiators.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 md:block">
              <Icon className="mt-1 h-6 w-6 shrink-0 text-secondary md:mb-5 md:h-8 md:w-8" aria-hidden="true" />
              <div><h3 className="mb-3 font-display text-xl font-semibold">{title}</h3><p className="text-sm leading-relaxed text-primary-foreground/80 md:text-base">{text}</p></div>
            </div>)}
          </div>
          <p className="mx-auto mt-10 max-w-3xl border-t border-primary-foreground/20 pt-8 text-center font-display text-lg leading-relaxed text-secondary md:mt-14 md:text-xl">That's why organizers choose TeeVents. Not because the software is better, but because the service is.</p>
        </div>
      </section>

      <section aria-labelledby="social-proof-title" className="bg-background py-14 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="social-proof-title" className="mx-auto max-w-3xl text-center font-display text-3xl font-bold leading-tight text-primary md:text-4xl">Trusted by Leaders in Collegiate and HBCU Golf</h2>
          <p className="mt-4 text-center text-base text-muted-foreground">Here's what organizers say about working with TeeVents.</p>
          <figure className="mx-auto my-10 max-w-3xl md:my-14">
            <Quote className="mx-auto mb-5 h-8 w-8 text-secondary" aria-hidden="true" />
            <blockquote className="text-base leading-relaxed text-foreground md:text-center md:text-xl">“{testimonial.quote.replace(" — ", ", ").replace("NCAA-sanctioned", "NCAA sanctioned")}”</blockquote>
            <figcaption className="mt-6 text-center text-sm leading-relaxed"><span className="font-semibold text-primary">{testimonial.name}</span><br /><span className="text-muted-foreground">{testimonial.title}, {testimonial.organization}</span></figcaption>
          </figure>
          <div className="flex items-center gap-6 overflow-x-auto border-t border-border pt-8 pb-2 md:justify-between" aria-label="Golf organizations and events">
            {founderPartnerLogos.map(logo => <div key={logo.name} className={`flex h-20 w-24 shrink-0 items-center justify-center p-2 ${logo.dark ? "bg-primary" : ""}`}>
              <img src={logo.image} alt={logo.name} title={logo.name} loading="lazy" className="max-h-full max-w-full object-contain grayscale" />
            </div>)}
          </div>
        </div>
      </section>

      <section aria-labelledby="final-cta-title" className="bg-primary px-6 py-16 text-center text-primary-foreground md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 id="final-cta-title" className="font-display text-3xl font-bold leading-tight md:text-4xl">Ready to See Your Event on TeeVents?</h2>
          <p className="mt-5 text-base text-primary-foreground/85 md:text-lg">Free for organizers. A dedicated rep builds it for you.</p>
          <div className="mt-8"><HomeActions /></div>
        </div>
      </section>
    </div>
  </Layout>;
}

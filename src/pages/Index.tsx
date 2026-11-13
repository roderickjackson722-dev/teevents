import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, UserRoundCheck, Paintbrush, CircleDollarSign, ShieldCheck, Quote } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HomeHowItWorks from "@/components/HomeHowItWorks";
import { founderPartnerLogos } from "@/components/FounderPartners";
import { ORGANIZER_TESTIMONIALS } from "@/components/OrganizerTestimonials";
import { Button } from "@/components/ui/button";
import heroGolf from "@/assets/hero-golf.jpg";
import { SOFTWARE_TAG } from "@/lib/programTypes";

const differentiators = [
  { icon: UserRoundCheck, title: "A Named Rep on Every Plan", text: "Your event built by a real person, free or paid." },
  { icon: Paintbrush, title: "Custom Leaderboard & Event Pages", text: "Your rep matches every leaderboard to your event colors. Event pages that look like real websites. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up." },
  { icon: CircleDollarSign, title: "Free for Organizers", text: "Start at $0, with the 5% platform fee covered by players." },
];

function HomeActions({ hero = false }: { hero?: boolean }) {
  return <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
    <Button asChild variant="secondary" size="lg" className="h-auto min-h-12 whitespace-normal px-5 py-3 text-center font-semibold uppercase leading-snug">
      <Link to="/get-started">{hero ? "Get Started, We'll Build It For You" : "Get Started"}<ArrowRight aria-hidden="true" /></Link>
    </Button>
  </div>;
}

const directorTasks = [
  "Builds your branded event page",
  "Sets up your sponsor page",
  "Sets up registration",
  "Builds your pairings",
  "Sets your format, scramble, best ball, stroke play, and more",
  "Sets up mobile scoring, sends scoring codes to your players, and runs your live leaderboard in your event colors",
  "Connects your Stripe, so the money goes straight to you",
  "Stays on call on event day for live scoring and leaderboard challenges",
];
const pathCards = [
  { title: "Running Your First Tournament?", text: "You have never run a golf tournament before, and you do not have to figure it out alone. Your virtual Tournament director builds everything for you, your branded event page, registration, pairings, your format, and your live leaderboard. You tell us about your event, we set it up, and your rep is on call on event day if anything comes up.", items: ["We build your event page for you", "We set up registration, pairings, and scoring", "Your rep is on call on event day", "You can open your event any time and change anything"] },
  { title: "Running Your Annual Event Again?", text: "You know your event. You have run it before, and you do not need someone to hold your hand. You get the same platform, and you build it yourself with the same tools. Registration, pairings, live scoring, leaderboard, sponsors, and payments, all on one branded page. Your rep is still there when you need them, and you can change anything any time.", items: ["Build it yourself with the same tools", "Registration, pairings, live scoring, and sponsors on one page", "Change anything, any time", "Your rep is there when you need them"] },
];
const standards = [
  "Your page is live in 7 days or less",
  "Your format, pairings, and leaderboard are set the way you want them",
  "Your rep is on call on event day",
  "You can open your event and change anything, any time",
];

function CheckList({ items }: { items: string[] }) {
  return <ul className="space-y-3">{items.map(i => <li key={i} className="flex gap-3 text-sm leading-relaxed md:text-base"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /><span>{i}</span></li>)}</ul>;
}

function DirectorSections() {
  return <>
    <section aria-labelledby="director-title" className="bg-muted/40 py-14 md:py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 id="director-title" className="text-center font-display text-3xl font-bold leading-tight text-primary md:text-4xl">What Your Virtual Tournament Director Does For You</h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed text-muted-foreground md:text-lg">Setting up a tournament takes months of preparation, and that is why good events do not come back for year two. Your virtual Tournament director does the setup for you, so your event comes back.</p>
        <div className="mx-auto mt-10 max-w-2xl text-foreground"><CheckList items={directorTasks} /></div>
        <p className="mx-auto mt-10 max-w-3xl text-center font-display text-lg leading-relaxed text-primary md:text-xl">Build it yourself with the same tools, or let your director build it for you. You stay in control either way.</p>
      </div>
    </section>
    <section aria-labelledby="paths-title" className="bg-background py-14 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="paths-title" className="text-center font-display text-3xl font-bold leading-tight text-primary md:text-4xl">How This Works For You</h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed text-muted-foreground md:text-lg">Every organizer is different. Some are running their first tournament. Some run the same event every year. Either way, TeeVents works for you.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {pathCards.map(c => <div key={c.title} className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
            <h3 className="font-display text-xl font-semibold text-primary md:text-2xl">{c.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">{c.text}</p>
            <div className="mt-6"><CheckList items={c.items} /></div>
          </div>)}
        </div>
        <p className="mt-10 text-center font-display text-lg text-primary md:text-xl">Two ways in. One event that runs right.</p>
      </div>
    </section>
    <section aria-labelledby="standard-title" className="bg-muted/40 py-14 md:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 id="standard-title" className="text-center font-display text-3xl font-bold leading-tight text-primary md:text-4xl">The TeeVents Standard</h2>
        <p className="mt-5 text-center text-base leading-relaxed text-muted-foreground md:text-lg">We do not compare ourselves to other platforms. We compare ourselves to the event you are running, and to the standard we set for it. Every event we build has to meet this bar.</p>
        <div className="mx-auto mt-8 max-w-xl text-foreground"><CheckList items={standards} /></div>
      </div>
    </section>
  </>;
}

export default function Index() {
  const testimonial = ORGANIZER_TESTIMONIALS[0];
  return <Layout>
    <SEO title="Golf Tournament Management Software for Organizers & Courses | TeeVents" description="Golf tournament management software for charities, organizers, and golf courses. Build your event page yourself or with an included dedicated TeeVents rep." path="/" />
    <div className="homepage">
      <section aria-labelledby="homepage-title" className="relative overflow-hidden bg-primary text-primary-foreground">
        <img src={heroGolf} alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        <div className="homepage-hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex min-h-[680px] max-w-5xl flex-col justify-center px-6 py-14 text-center md:py-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-secondary">Your Virtual Tournament Director</p>
          <h1 id="homepage-title" className="font-display text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">The Golf Tournament Platform That <span className="text-secondary">Builds Your Event For You</span></h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-primary-foreground/95 md:text-lg">Every event includes a dedicated TeeVents rep, free or paid, who sets up your branded event page, sponsor page, registration, mobile scoring, pairings, and live leaderboard. Your virtual Tournament director builds it and stays on call on event day for live scoring and leaderboard challenges. You can open your event any time and change anything. You focus on running your tournament while we handle the software.&nbsp;</p>
          <p className="mt-2 text-xs font-bold text-secondary">{SOFTWARE_TAG}</p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-primary-foreground/95 md:text-lg">Golf tournament management software for charity fundraisers, corporate golf outings, golf courses, and golf leagues.</p>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 md:text-base">No spreadsheets. No manual setup. No stress.</p>
          <div className="mt-8"><HomeActions hero /></div>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">We build your event page for you — live in 7 days or less.</p>
          <p className="mx-auto mt-6 flex max-w-2xl items-start justify-center gap-2 text-xs leading-relaxed text-primary-foreground/85 md:text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" /><span>No credit card to start. Payments go straight to your connected Stripe account. We never hold your money.</span></p>
        </div>
      </section>

      <HomeHowItWorks showTurnaroundPromise showEventDaySupport />

      <DirectorSections />

      <section aria-labelledby="differentiators-title" className="bg-primary py-14 text-primary-foreground md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="differentiators-title" className="mb-10 text-center font-display text-3xl font-bold leading-tight md:mb-14 md:text-4xl">Why Organizers Choose TeeVents</h2>
          <div className="grid gap-8 md:grid-cols-3 md:gap-12">
            {differentiators.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 md:block">
              <Icon className="mt-1 h-6 w-6 shrink-0 text-secondary md:mb-5 md:h-8 md:w-8" aria-hidden="true" />
              <div><h3 className="mb-3 font-display text-xl font-semibold">{title}</h3><p className="text-sm leading-relaxed text-primary-foreground/80 md:text-base">{text}</p>{title === "A Named Rep on Every Plan" && <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">We build your event page for you. Send us your logo and tournament details, and your page is live in 7 days or less.</p>}</div>
            </div>)}
          </div>
          <p className="mx-auto mt-10 max-w-3xl border-t border-primary-foreground/20 pt-8 text-center font-display text-lg leading-relaxed text-secondary md:mt-14 md:text-xl">That's why organizers choose TeeVents. Not because the software is better, but because the service behind it is.</p>
        </div>
      </section>

      <section aria-labelledby="social-proof-title" className="bg-background py-14 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="social-proof-title" className="mx-auto max-w-3xl text-center font-display text-3xl font-bold leading-tight text-primary md:text-4xl">Trusted by Leaders in Collegiate and HBCU Golf</h2>
          <p className="mt-4 text-center text-base text-muted-foreground">Here's what organizers say about working with TeeVents.</p>
          <figure className="mx-auto my-10 max-w-3xl md:my-14">
            <Quote className="mx-auto mb-5 h-8 w-8 text-secondary" aria-hidden="true" />
            <blockquote className="text-base leading-relaxed text-foreground md:text-center md:text-xl">“{testimonial.quote.replace(" — ", ", ").replace("NCAA-sanctioned", "NCAA sanctioned")}”</blockquote>
            <figcaption className="mt-6 text-center text-sm leading-relaxed"><span className="font-semibold text-primary">L. Smoot</span><br /><span className="text-muted-foreground">{testimonial.title}, {testimonial.organization}</span></figcaption>
          </figure>
          <figure className="mx-auto my-10 max-w-3xl md:my-14">
            <Quote className="mx-auto mb-5 h-8 w-8 text-secondary" aria-hidden="true" />
            <blockquote className="text-base leading-relaxed text-foreground md:text-center md:text-xl">“We turned over the golf tournament management duties to Roderick and the TeeVents team, and we have been beyond pleased with the service. From the initial setup to the conclusion of the event, everything was handled with the highest level of professionalism. We look forward to a lasting partnership with TeeVents.”</blockquote>
            <figcaption className="mt-6 text-center text-sm leading-relaxed"><span className="font-semibold text-primary">M. Jackson</span><br /><span className="text-muted-foreground">Executive Directo, National Black College Alumni Hall of Fame</span></figcaption>
          </figure>
          <p className="mb-10 text-center text-base font-medium text-primary">On November 7, 2026, the ATL 2-Person Team Shamble ran 48 players on TeeVents live scoring.</p>
          <div className="logo-marquee border-t border-border pt-8 pb-2" aria-label="Golf organizations and events">
            <div className="logo-marquee-track">
              {Array.from({ length: 4 }).map((_, set) => founderPartnerLogos.map(logo => <div key={`${set}-${logo.name}`} aria-hidden={set > 0} className={`mr-6 flex h-20 w-24 shrink-0 items-center justify-center p-2 ${logo.dark ? "bg-primary" : ""}`}>
                <img src={logo.image} alt={set > 0 ? "" : logo.name} title={logo.name} loading="lazy" className="max-h-full max-w-full object-contain" />
              </div>))}
            </div>
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

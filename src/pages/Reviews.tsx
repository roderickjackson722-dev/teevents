import { motion } from "framer-motion";
import { Quote, UserRound, Trophy, ShieldCheck, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { founderPartnerLogos } from "@/components/FounderPartners";
import { fade, Hero, SectionHead, IconCard, Stats } from "@/components/marketing/PageBits";

const testimonials = [
  { quote: "We have trusted the TeeVents team to organize and manage our NCAA-sanctioned golf tournaments for the past 10 years. That trust has only grown stronger, to the point where we would not choose any other organization to work with. Their hard work, preparation, attention to detail, and professionalism are unmatched when it comes to running our multiple college golf tournaments.", name: "Leonard Smoot", title: "President", org: "Black College Golf Coaches Association" },
  { quote: "We turned over the golf tournament management duties to Roderick and the TeeVents team, and we have been beyond pleased with the service. From the initial setup to the conclusion of the event, everything was handled with the highest level of professionalism. We look forward to a lasting partnership with TeeVents.", name: "Merral Jackson", title: "Tournament Director", org: "National Black College Alumni Hall of Fame" },
];

export default function Reviews() {
  return (
    <Layout>
      <SEO title="Reviews" description="Read what collegiate and HBCU golf organizers say about working with TeeVents and their dedicated event rep." path="/reviews" />

      <Hero eyebrow="REVIEWS" title="Trusted by Leaders in Collegiate and HBCU Golf" subtitle="Here is what organizers say about working with TeeVents.">
        <p className="mt-6 font-semibold text-secondary">Real tournaments. Real partnerships. Real results.</p>
      </Hero>

      <section id="testimonials" className="scroll-mt-20 bg-background py-20 md:py-28">
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
          {testimonials.map((t) => (
            <motion.figure {...fade} key={t.name} className="flex flex-col rounded-2xl border border-border border-t-4 border-t-secondary bg-card p-8 shadow-md">
              <Quote className="h-10 w-10 text-secondary" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 font-display text-lg leading-relaxed text-foreground md:text-xl">“{t.quote}”</blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-secondary bg-primary font-display text-lg font-bold text-primary-foreground" aria-hidden="true">{t.name.split(" ").map((p) => p[0]).join("")}</div>
                <div><p className="font-semibold text-foreground">{t.name}</p><p className="text-sm text-muted-foreground">{t.title}, {t.org}</p></div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionHead title="Why Organizers Choose TeeVents" subtitle="Four reasons our partners keep coming back." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <IconCard icon={UserRound} title="A Named Rep on Every Event" text="Every tournament, free or paid, comes with a dedicated TeeVents rep who builds it for you." />
            <IconCard icon={Trophy} title="Built for Golf" text="Pairings, handicaps, live scoring, and leaderboards. Not generic event tools." />
            <IconCard icon={ShieldCheck} title="Payments You Can Trust" text="Funds go directly to your Stripe account. We never hold your money." />
            <IconCard icon={Clock} title="Save Hours of Setup Time" text="Your rep does the work so you can focus on running your tournament." />
          </div>
        </div>
      </section>

      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-4 text-center">
          <SectionHead title="Organizations We Have Worked With" subtitle="Our team has partnered with some of the most respected names in golf." />
          <div className="grid grid-cols-2 items-center gap-x-6 gap-y-10 md:grid-cols-4">
            {founderPartnerLogos.map((logo) => (
              <div key={logo.name}>
                <div className={`flex h-28 items-center justify-center rounded-md px-4 ${logo.dark ? "bg-golf-green-dark" : ""}`}><img src={logo.image} alt={logo.name} loading="lazy" className="max-h-24 max-w-full object-contain grayscale" /></div>
                <p className="mt-3 text-xs text-muted-foreground">{logo.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Stats items={[["100%", "Of events include a dedicated rep, free or paid"], ["20+", "Years in the golf industry"], ["10+", "Years managing collegiate golf tournaments"], ["2017", "Trusted by the Black College Golf Coaches Association since"]]} />

    </Layout>
  );
}

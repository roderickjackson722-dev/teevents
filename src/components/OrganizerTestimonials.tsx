import { Quote, User } from "lucide-react";

export const ORGANIZER_TESTIMONIALS = [
  {
    quote:
      "We've trusted the TeeVents team to organize and manage our NCAA-sanctioned golf tournaments for the past 10 years. That trust has only grown stronger — to the point where we wouldn't choose any other organization to work with. Their hard work, preparation, attention to detail, and professionalism are unmatched when it comes to running our multiple college golf tournaments.",
    name: "Leonard Smoot",
    title: "President",
    organization: "Black College Golf Coaches Association",
  },
  {
    quote:
      "We turned over the golf tournament management duties to Roderick and the TeeVents team, and we've been beyond pleased with the service. From the initial setup to the conclusion of the event, everything was handled with the highest level of professionalism. We look forward to a lasting partnership with TeeVents.",
    name: "Merral Jackson",
    title: "Executive Director",
    organization: "National Black College Alumni Hall of Fame",
  },
];

export const TestimonialCards = ({ stacked = false }: { stacked?: boolean }) => (
  <div className={stacked ? "grid gap-8" : "grid gap-8 md:grid-cols-2"}>
    {ORGANIZER_TESTIMONIALS.map((t) => (
      <figure key={t.name} className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-md md:p-10">
        <span className="mb-5 block h-1 w-12 rounded-full bg-secondary" />
        <Quote className="mb-4 h-8 w-8 text-secondary" aria-hidden />
        <blockquote className="flex-1 font-display text-lg italic leading-relaxed text-foreground md:text-xl">
          "{t.quote}"
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-4 border-t border-border pt-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-secondary bg-muted" aria-hidden>
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-bold text-primary">{t.name}</p>
            <p className="text-sm text-muted-foreground">{t.title}, {t.organization}</p>
          </div>
        </figcaption>
      </figure>
    ))}
  </div>
);

const OrganizerTestimonials = () => (
  <section className="founder-trust bg-golf-cream py-20 md:py-24">
    <div className="container mx-auto max-w-6xl px-4">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold text-primary md:text-4xl">
          Trusted by Leaders in Collegiate and HBCU Golf
        </h2>
        <span className="mx-auto mt-4 block h-0.5 w-16 bg-secondary" />
        <p className="mt-4 text-lg text-muted-foreground">Here's what organizers say about working with TeeVents.</p>
      </div>
      <TestimonialCards />
    </div>
  </section>
);

export default OrganizerTestimonials;

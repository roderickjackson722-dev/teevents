import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import hero from "@/assets/sample-event-hero.jpg.asset.json";
import registration from "@/assets/sample-event-registration.jpg.asset.json";
import sponsors from "@/assets/sample-event-sponsors.jpg.asset.json";
import leaderboard from "@/assets/sample-event-leaderboard.jpg.asset.json";

const examples = [
  { asset: hero, alt: "Fairway Charity Classic branded event page", caption: "Your event, your name, your colors. Golfers see a real event page, not a form." },
  { asset: registration, alt: "Sample event registration packages", caption: "Golfers register on the same page, so nothing lives in a separate tool." },
  { asset: sponsors, alt: "Sample event sponsorship packages", caption: "Sponsors get seen on the same page, so their logos work all day, not just at the course." },
  { asset: leaderboard, alt: "Sample event live leaderboard", caption: "Scores update on every golfer's phone, so the competition stays alive until the last putt drops." },
];

export default function SampleEventGallery() {
  return <section aria-labelledby="sample-gallery-title" className="bg-muted/40 px-6 py-14 md:py-24">
    <div className="mx-auto max-w-6xl">
      <h2 id="sample-gallery-title" className="text-center font-display text-3xl font-bold leading-tight text-primary md:text-4xl">See What Your Event Page Can Look Like</h2>
      <div className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2">
        {examples.map(example => <figure key={example.alt} className="min-w-0">
          <img src={example.asset.url} alt={example.alt} width={1477} height={768} loading="lazy" className="block aspect-[1477/768] w-full rounded-lg border border-border object-contain" />
          <figcaption className="mt-4 text-sm leading-relaxed text-foreground md:text-base">{example.caption}</figcaption>
        </figure>)}
      </div>
      <div className="mt-10 text-center"><Link to="/sample-event" className="inline-flex items-center gap-2 font-semibold text-primary underline underline-offset-4">See the full sample event page<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link></div>
    </div>
  </section>;
}
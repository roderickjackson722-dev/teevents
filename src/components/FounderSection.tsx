import portrait from '@/assets/trust/roderick-jackson.jpg.asset.json';

export default function FounderSection() {
  return (
    <section id="founder" className="founder-trust bg-background py-16 md:py-24 border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <p className="text-sm font-semibold text-primary mb-4">Meet the Founder</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground max-w-4xl mb-10 leading-tight">Built by a Tournament Director — For Tournament Directors</h2>
        <div className="grid md:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-14 items-start">
          <figure className="md:sticky md:top-24">
            <img src={portrait.url} alt="Roderick Jackson, founder of TeeVents" width={1200} height={800} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-lg" />
            <figcaption className="border-t-2 border-secondary mt-5 pt-4"><p className="font-display text-xl font-bold text-primary">Roderick Jackson</p><p className="text-sm text-muted-foreground mt-1">Founder · Golfer · Tournament Director</p></figcaption>
          </figure>
          <div className="space-y-5 text-base leading-relaxed text-foreground/85">
            <p>Roderick Jackson has been a golfer since the late 1990s, playing collegiate golf at Alabama A&amp;M University before building a career in the golf industry that spans over two decades.</p>
            <p>He has worked for the top golf management company in the world with Troon Golf, and with one of the top golf equipment companies in the industry with Cleveland Golf. Over the past decade, he has served as a tournament director for some of the largest events in collegiate golf.</p>
            <p>Today, Roderick organizes and manages the largest HBCU Golf Tournament in the world, working alongside organizations including the Golf Channel, PGA, Bridgestone Golf, Arcis Golf, SAS Data and AI Solutions, Farmers Insurance, Octagon Management, Octagon (Global Leadership in Sports, Entertainment, and Culture), the National Black College Alumni Hall of Fame, the Black College Golf Coaches Association, and the 100 Black Men Organization.</p>
            <p>He has managed HBCU collegiate golf tournaments for over a decade, working with celebrities, corporate sponsors, and some of the most respected names in the sport.</p>
            <p className="border-l-2 border-secondary pl-5 font-medium text-primary">TeeVents was built from the experience of knowing what is needed from both sides of the game — as a tournament director and as a golf course coordinator.</p>
            <p className="font-display text-lg text-primary italic">— Roderick Jackson, Founder</p>
          </div>
        </div>
      </div>
    </section>
  );
}
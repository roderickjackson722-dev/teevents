export const eventSetupSteps = [
  { number: "01", title: "Tell Us About Your Event", text: "Share your event details, logo, colors, and goals with your named TeeVents rep." },
  { number: "02", title: "We Build It For You", text: "Your rep sets up your branded site, registration, sponsor page, pairings, and scoring." },
  { number: "03", title: "Run Your Tournament", text: "Everything is ready to go, with your dedicated partner before, during, and after the event." },
];

export default function HomeHowItWorks({ showTurnaroundPromise = false }: { showTurnaroundPromise?: boolean }) {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-20 bg-background py-14 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center md:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">How It Works</p>
          <h2 id="how-it-works-title" className="font-display text-3xl font-bold leading-tight text-primary md:text-4xl">You Tell Us. We Build It. You Run It.</h2>
        </div>
        <ol className="grid gap-8 md:grid-cols-3 md:gap-12">
          {eventSetupSteps.map(step => (
            <li key={step.number} className="flex gap-5 md:block">
              <span className="shrink-0 font-display text-3xl text-secondary md:mb-5 md:block md:text-5xl" aria-hidden="true">{step.number}</span>
              <div>
                <h3 className="mb-3 font-display text-xl font-semibold text-primary">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{step.text}</p>
                {showTurnaroundPromise && step.number === "02" && <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">We build your event page for you. Send us your logo and tournament details, and your page is live in 7 days or less.</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

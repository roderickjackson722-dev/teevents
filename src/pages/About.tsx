import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Target, Heart, Flame, X } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import portrait from "@/assets/trust/roderick-jackson.jpg.asset.json";
import { founderPartnerLogos } from "@/components/FounderPartners";

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.5 } };
const h2 = "font-display text-3xl font-bold text-primary md:text-4xl";

const values = [
  { icon: Target, title: "Attention to Detail", text: "Every event page, every pairings sheet, every leaderboard is built with the same care we would want for our own tournament." },
  { icon: Heart, title: "Passion for Every Event", text: "We do not treat any event like it is small. Whether it is 20 players or 200, your event gets the same level of dedication." },
  { icon: Flame, title: "Determination for Success", text: "We are not done until your event runs smoothly. If something goes wrong, we fix it. If something needs to change, we change it." },
];

const compare = [
  ["You build the event page yourself", "Your rep builds it for you"],
  ["You configure registration and payments", "Your rep sets it all up"],
  ["You figure out the leaderboard settings", "Your rep configures everything"],
  ["You watch tutorials and read FAQs", "You tell us what you want and we do it"],
  ["Generic email support tickets", "A named rep who knows your event"],
  ["You are on your own", "You have a dedicated partner"],
];

const pastEventPhotos = [
  ["Arcis 2026 HBCU Championship", "https://antiondownsfilmsandphotographyllc.pixieset.com/2026arcishbcuchampionship/"],
  ["2025 Thomas W. Dortch Jr. HBCU Collegiate Golf Classic", "https://photos.app.goo.gl/DkwHw8g4v7hPdwrB9"],
  ["2024 SAS HBCU Invitational", "https://photos.app.goo.gl/KFoH2qb7z9nS3Etz7"],
  ["2024 TWD HBCU Collegiate Golf Classic", "https://photos.app.goo.gl/2rbX7rZFrFAVALGMA"],
  ["2023 Thomas W. Dortch, Jr. HBCU Golf Classic", "https://flic.kr/s/aHBqjAWh1A"],
  ["2023 SAS Championship", "https://photos.app.goo.gl/m7z9iNdNmfJJou9Z9"],
  ["2022 SAS Championship", "https://photos.app.goo.gl/7acfwUf4pEBMJdft6"],
  ["2021 HBCU Golf Invitational", "https://photos.app.goo.gl/44BQa5WK628jC4SJ8"],
  ["2021 Father’s Day Outing", "https://flic.kr/s/aHsmXfGerF"],
  ["2020 M.L.K. Golf Tournament", "https://flic.kr/s/aHsmKQP6cE"],
  ["2019 NBCAHOF Annual Golf Tournament", "https://photos.app.goo.gl/qhQD4DxzygeSAhCx5"],
  ["2018 HBCU Invitational", "https://photos.app.goo.gl/tgqdccukguQrhJJ66"],
  ["4th Annual Father's Day Outing", "https://flic.kr/s/aHsmEmTo5Z"],
  ["Inaugural Marcus Brown Golf Fundraiser", "https://flic.kr/s/aHskRfyrxe"],
];

const stats = [
  ["100%", "Of events include a dedicated rep, free or paid"],
  ["20+", "Years in the golf industry"],
  ["10+", "Years as a tournament director"],
  ["2017", "Trusted by the Black College Golf Coaches Association since"],
];

export default function About() {
  return (
    <Layout>
      <SEO title="About TeeVents" description="TeeVents was built by tournament director Roderick Jackson. Every event, free or paid, includes a dedicated rep who builds it for you." path="/about" />

      <section className="bg-primary py-20 text-center text-primary-foreground md:py-28">
        <motion.div {...fade} className="container mx-auto max-w-4xl px-4">
          <p className="text-sm font-semibold tracking-widest text-secondary">ABOUT TEEVENTS</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">Built by a Tournament Director, for Tournament Directors</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/85">TeeVents was created by someone who has spent over two decades in the golf industry, running tournaments, working at courses, and understanding what organizers actually need.</p>
        </motion.div>
      </section>

      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-[2fr_3fr]">
          <motion.div {...fade}>
            <img src={portrait.url} alt="Roderick Jackson, founder of TeeVents" className="mx-auto aspect-[4/5] w-full max-w-sm rounded-2xl object-cover shadow-xl" />
          </motion.div>
          <motion.div {...fade} className="space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            <div>
              <h2 className={h2}>Meet Roderick Jackson</h2>
              <p className="mt-2 font-semibold text-secondary">Founder, Golfer, Tournament Director</p>
            </div>
            <p>Roderick Jackson has been a golfer since the late 1990s, playing collegiate golf at Alabama A&amp;M University before building a career in the golf industry that spans over two decades.</p>
            <p>He has worked for the top golf management company in the world with Troon Golf, and with one of the top golf equipment companies in the industry with Cleveland Golf. Over the past decade, he has served as a tournament director for some of the largest events in collegiate golf.</p>
            <p>Today, Roderick organizes and manages the largest HBCU Golf Tournament in the world, working alongside organizations including the Golf Channel, PGA, Bridgestone Golf, Arcis Golf, SAS Data and AI Solutions, Farmers Insurance, Octagon Management, Octagon (Global Leadership in Sports, Entertainment, and Culture), the National Black College Alumni Hall of Fame, the Black College Golf Coaches Association, and the 100 Black Men Organization.</p>
            <p>He has managed HBCU collegiate golf tournaments for over a decade, working with celebrities, corporate sponsors, and some of the most respected names in the sport.</p>
          </motion.div>
        </div>
      </section>

      <section className="bg-muted/40 py-20 md:py-28">
        <motion.div {...fade} className="container mx-auto max-w-3xl space-y-6 px-4 text-center text-lg leading-relaxed text-muted-foreground">
          <h2 className={h2}>Why TeeVents Exists</h2>
          <p>Roderick built TeeVents because he saw a gap in the market. Most platforms hand you software and wish you luck. He knew from his years as a tournament director that what organizers actually need is a partner. Someone who understands the pressure, the details, and the stakes.</p>
          <p className="font-semibold text-primary">That is why every TeeVents event, free or paid, comes with a dedicated rep who does the work for you.</p>
        </motion.div>
      </section>

      <section className="bg-primary py-20 text-primary-foreground md:py-28">
        <motion.figure {...fade} className="container mx-auto max-w-4xl px-4 text-center">
          <blockquote className="font-display text-2xl leading-snug md:text-4xl">“TeeVents was built from the experience of knowing what is needed from both sides of the game, as a tournament director and as a golf course coordinator.”</blockquote>
          <figcaption className="mt-8 font-semibold text-secondary">Roderick Jackson, Founder</figcaption>
        </motion.figure>
      </section>

      <section className="bg-background py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div {...fade} className="mb-12 text-center"><h2 className={h2}>What Drives Us</h2><p className="mt-3 text-lg text-muted-foreground">Three values behind every event on TeeVents.</p></motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <motion.div {...fade} key={title} className="rounded-xl border border-border bg-card p-7 shadow-sm">
                <div className="mb-4 w-fit rounded-lg bg-secondary/20 p-3 text-primary"><Icon className="h-6 w-6" aria-hidden="true" /></div>
                <h3 className="font-display text-xl font-bold text-primary">{title}</h3>
                <p className="mt-3 text-muted-foreground">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-4 text-center">
          <motion.div {...fade}><h2 className={h2}>Trusted by Leaders in Collegiate and HBCU Golf</h2><p className="mt-3 text-lg text-muted-foreground">Organizations that have worked with TeeVents and our team.</p></motion.div>
          <div className="mt-12 grid grid-cols-2 items-center gap-x-6 gap-y-10 md:grid-cols-4">
            {founderPartnerLogos.map((logo) => (
              <div key={logo.name}>
                <div className={`flex h-28 items-center justify-center rounded-md px-4 ${logo.dark ? "bg-golf-green-dark" : ""}`}>
                  <img src={logo.image} alt={logo.name} loading="lazy" className="max-h-24 max-w-full object-contain grayscale" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{logo.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 md:py-16">
        <motion.div {...fade} className="container mx-auto max-w-2xl px-4">
          <h2 className="font-display text-xl font-bold text-primary md:text-2xl">Photos from Past Events</h2>
          <ul className="mt-5 divide-y divide-border">
            {pastEventPhotos.map(([name, url]) => (
              <li key={name}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-primary md:text-base">
                  <span>{name}</span>
                  <span className="shrink-0 font-semibold text-secondary">View Photos</span>
                </a>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      <section className="bg-muted/40 py-20 md:py-28">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div {...fade} className="mb-12 text-center"><h2 className={h2}>What Makes TeeVents Different</h2><p className="mt-3 text-lg text-muted-foreground">Most platforms sell you software. We deliver a finished event.</p></motion.div>
          <motion.div {...fade} className="grid overflow-hidden rounded-xl border border-border md:grid-cols-2">
            <div className="bg-card p-6 md:p-8">
              <h3 className="mb-5 font-body text-lg font-semibold text-muted-foreground">Typical Tournament Software</h3>
              <ul className="space-y-4">{compare.map(([a]) => <li key={a} className="flex gap-3 text-muted-foreground"><X className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />{a}</li>)}</ul>
            </div>
            <div className="bg-primary p-6 text-primary-foreground md:p-8">
              <h3 className="mb-5 font-body text-lg font-semibold text-secondary">TeeVents</h3>
              <ul className="space-y-4">{compare.map(([a, b]) => <li key={a} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />{b}</li>)}</ul>
            </div>
          </motion.div>
          <motion.p {...fade} className="mx-auto mt-10 max-w-3xl rounded-xl border-l-4 border-secondary bg-muted/50 p-6 text-center text-lg font-medium text-primary">That is why organizers choose TeeVents. Not because the software is better, but because the service is.</motion.p>
        </div>
      </section>

      <section className="bg-primary py-20 text-primary-foreground md:py-24">
        <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 text-center sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([n, d]) => (
            <motion.div {...fade} key={n}><p className="font-display text-5xl font-bold text-secondary md:text-6xl">{n}</p><p className="mx-auto mt-3 max-w-[16rem] text-primary-foreground/85">{d}</p></motion.div>
          ))}
        </div>
      </section>

      <section className="bg-primary py-20 text-center text-primary-foreground">
        <motion.div {...fade} className="container mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-5xl">Ready to Work with a Real Partner?</h2>
          <p className="mt-5 text-lg text-primary-foreground/85">Free for organizers. A dedicated rep builds your event for you.</p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/get-started">GET STARTED<ArrowRight /></Link></Button>
            <Button asChild variant="outline" size="lg" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/request-sample">REQUEST A SAMPLE</Link></Button>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}

import { motion, MotionConfig } from "framer-motion";
import { Calendar, MapPin, Clock, Award, Check, Flag, Trophy, Landmark, House, Route, ShieldCheck, Mountain, Smile, Sprout } from "lucide-react";
import Layout from "@/components/Layout";
import heroImage from "@/assets/golf-course-hero.jpg";
import teeImage from "@/assets/sample-event-tee.jpg";
import foursomeImage from "@/assets/sample-event-foursome.jpg";
import awardsImage from "@/assets/sample-event-awards.jpg";
import panoramaImage from "@/assets/sample-event-panorama.jpg";
import { Button } from "@/components/ui/button";
import "./SampleEvent.css";

/**
 * Static sample event page shown to prospective organizers from sales emails.
 * All content is fictional and hardcoded: no database, no checkout, no live data.
 * Styling mirrors the real public tournament page (classic template).
 */

const scrollToCta = () => {
  document.getElementById("start-your-event")?.scrollIntoView({ behavior: "smooth" });
};

const SectionHeading = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="text-center mb-10">
    <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
      {title.toUpperCase()}
    </h2>
    <div className="w-16 h-0.5 mx-auto mt-3 mb-4 bg-secondary" />
    {sub && <p className="text-sm max-w-xl mx-auto text-muted-foreground">{sub}</p>}
  </div>
);

const goldButtonClass =
  "h-auto py-3 px-8 rounded-lg text-center font-bold text-sm uppercase bg-secondary text-secondary-foreground hover:bg-secondary/90 whitespace-normal";
const outlineButtonClass =
  "h-auto py-3 px-8 rounded-lg text-center font-bold text-sm uppercase border-2 border-primary text-primary bg-transparent hover:bg-primary/5 whitespace-normal";

const registrationTiers = [
  {
    name: "Individual Golfer",
    price: "$200",
    perks: ["Green fees and cart", "Lunch at the turn", "Awards reception"],
    featured: false,
  },
  {
    name: "Foursome",
    price: "$750",
    perks: ["Four golfers", "Everything in the individual package", "Team photo at the first tee"],
    featured: true,
  },
  {
    name: "VIP Foursome",
    price: "$1,000",
    perks: ["Everything in the foursome", "Premium tee gifts", "Recognition at the awards reception"],
    featured: false,
  },
];

const sponsorTiers = [
  {
    name: "Presenting Sponsor",
    price: "$5,000",
    benefits: ["Logo on the event page", "Signage at the course", "Complimentary foursome"],
  },
  {
    name: "Gold Sponsor",
    price: "$3,500",
    benefits: ["Logo on the event page", "Signage at the course", "Complimentary foursome"],
  },
  {
    name: "Silver Sponsor",
    price: "$2,500",
    benefits: ["Logo on the event page", "Signage at the course", "Recognition at the awards reception"],
  },
  {
    name: "Hole Sponsor",
    price: "$500",
    benefits: ["Logo on the event page", "Signage at one hole", "Recognition at the awards reception"],
  },
];

const sampleSponsors = [
  { name: "Desert Ridge Bank", wordmark: "Desert Ridge", descriptor: "Bank", icon: Landmark, treatment: "bank" },
  { name: "Cactus Flower Realty", wordmark: "Cactus Flower", descriptor: "Realty", icon: House, treatment: "realty" },
  { name: "Sonoran Auto Group", wordmark: "SONORAN", descriptor: "Auto Group", icon: Route, treatment: "auto" },
  { name: "Valley View Insurance", wordmark: "Valley View", descriptor: "Insurance", icon: ShieldCheck, treatment: "insurance" },
  { name: "Copper State Roofing", wordmark: "Copper State", descriptor: "Roofing", icon: Mountain, treatment: "roofing" },
  { name: "Mesa Family Dental", wordmark: "Mesa Family", descriptor: "Dental", icon: Smile, treatment: "dental" },
];
const gallery = [
  { src: teeImage, alt: "Golfer teeing off at a sample charity tournament" },
  { src: foursomeImage, alt: "A foursome walking the fairway" },
  { src: awardsImage, alt: "Golfers celebrating at an awards lunch" },
];
const registrationImages = [panoramaImage, foursomeImage, awardsImage];

const leaderboardRows = [
  { pos: 1, player: "Marcus Bell", team: "Team Mulligan", score: "-8", thru: "F" },
  { pos: 2, player: "Dana Whitfield", team: "Albany Auto Group", score: "-6", thru: "F" },
  { pos: 3, player: "Chris Okafor", team: "First Tee Foundation", score: "-5", thru: "F" },
  { pos: 4, player: "Sam Delgado", team: "Coastal Realty", score: "-4", thru: "15" },
  { pos: 5, player: "Jordan Pike", team: "Title Team", score: "-3", thru: "15" },
  { pos: 6, player: "Alex Navarro", team: "Youth Golf Academy", score: "-2", thru: "15" },
  { pos: 7, player: "Pat Sullivan", team: "Smith & Associates", score: "-1", thru: "12" },
  { pos: 8, player: "Riley Chen", team: "Johnson Family", score: "E", thru: "12" },
  { pos: 9, player: "Casey Morales", team: "Team Charity", score: "+1", thru: "12" },
  { pos: 10, player: "Jamie Foster", team: "Birdie Club", score: "+2", thru: "12" },
];

const pairings = [
  { time: "8:00 AM", hole: "Hole 1", players: ["Marcus Bell", "Dana Whitfield", "Chris Okafor", "Sam Delgado"] },
  { time: "8:00 AM", hole: "Hole 2", players: ["Jordan Pike", "Alex Navarro", "Pat Sullivan", "Riley Chen"] },
  { time: "8:00 AM", hole: "Hole 3", players: ["Casey Morales", "Jamie Foster", "Terry Brooks", "Morgan Hale"] },
  { time: "8:00 AM", hole: "Hole 4", players: ["Drew Callahan", "Robin Shea", "Jessie Tran", "Frank Doyle"] },
];

const schedule = [
  { time: "7:00 AM", label: "Check-in and breakfast" },
  { time: "8:00 AM", label: "Shotgun start" },
  { time: "1:00 PM", label: "Lunch and awards reception" },
  { time: "2:00 PM", label: "Raffle and silent auction winners" },
];

const faqs = [
  {
    q: "What does registration include?",
    a: "Every player gets 18 holes with a cart, lunch, and a seat at the awards reception. Foursome packages cover all four golfers.",
  },
  {
    q: "What is the rain policy?",
    a: "We play rain or shine. If the course closes, the event moves to a makeup date and every registration carries over.",
  },
  {
    q: "Do I need a handicap to play?",
    a: "No. This is a scramble, so players of every skill level are welcome. Handicaps are only used for optional side games.",
  },
  {
    q: "How do sponsorships work?",
    a: "Pick a tier and we handle the rest. Your logo goes on the event page, signage is printed for the course, and top tiers include a complimentary foursome.",
  },
];

const SampleEvent = () => {
  return (
    <Layout>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: "easeOut" }}>
      <div className="sample-event-page min-h-screen bg-background" id="top">
        {/* Sample badge */}
        <div className="pt-20 pb-4 text-center bg-card">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full bg-secondary/15 text-primary border border-secondary"
            
          >
            Sample Event Page
          </span>
        </div>

        {/* ===== HERO ===== */}
        <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden bg-primary">
          <img src={heroImage} alt="Desert Ridge Golf Club" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 sample-hero-overlay" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 w-full max-w-4xl mx-auto text-center"
          >
            <div aria-label="FCC golf emblem" className="mb-6 flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-secondary bg-primary/85 text-secondary ring-4 ring-secondary/15">
              <Flag className="h-8 w-8" aria-hidden="true" />
              <span className="mt-1 font-display text-xl font-bold">FCC</span>
            </div>
            <h1
              className="sample-title font-display font-bold leading-tight text-4xl sm:text-5xl md:text-6xl text-primary-foreground"
            >
              Fairway Charity Classic
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-primary-foreground/85">
              Presented by Desert Ridge Bank
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
              <span className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <Calendar className="h-4 w-4 shrink-0" />
                Saturday, March 13, 2027
              </span>
              <span className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <Clock className="h-4 w-4 shrink-0" />
                8:00 AM Shotgun Start
              </span>
              <span className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <MapPin className="h-4 w-4 shrink-0" />
                Desert Ridge Golf Club
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline"
                type="button"
                onClick={scrollToCta}
                className={goldButtonClass}
                
              >
                Register a Foursome
              </Button>
              <Button variant="outline"
                type="button"
                onClick={scrollToCta}
                className={`${outlineButtonClass} border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground`}
              >
                Become a Sponsor
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ===== ABOUT ===== */}
        <section className="py-16 bg-card">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="About the Event" />
              <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  The Fairway Charity Classic is the biggest day of the year for the Fairway Youth Foundation.
                  Every dollar raised stays right here in our community, funding after-school golf programs,
                  tutoring, and summer camps for local kids who need them most.
                </p>
                <p>
                  Whether you come to win, to network, or just to enjoy a beautiful day on the course, you are
                  helping a young person find their swing and their confidence. Grab your clubs, bring your
                  friends, and join us for a day that matters.
                </p>
              </div>
              <div className="sample-stack mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {gallery.map((photo) => <img key={photo.src} src={photo.src} alt={photo.alt} loading="lazy" width={1200} height={800} className="aspect-[3/2] w-full rounded-lg object-cover" />)}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== REGISTRATION ===== */}
        <section className="py-16 bg-golf-cream/50">
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="Registration" sub="Pick the package that fits your group. Every option includes a full day on the course." />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {registrationTiers.map((tier, index) => (
                  <div
                    key={tier.name}
                    className={`sample-card relative bg-card rounded-lg border flex flex-col overflow-hidden ${tier.featured ? "border-2 border-secondary" : "border-border"}`}
                  >
                    <img src={registrationImages[index]} alt={gallery[index].alt} width={1200} height={800} loading="lazy" className="h-32 w-full object-cover" />
                    {tier.featured && <span className="sample-ribbon absolute right-0 top-0">Most Popular</span>}
                    <div className="p-6 text-center bg-primary/[.03]">
                      <Award className="h-8 w-8 mx-auto mb-2 text-secondary" />
                      <h3 className="text-xl font-display font-bold text-foreground">{tier.name}</h3>
                      <p className="text-2xl font-bold mt-1 text-primary">{tier.price}</p>
                    </div>
                    <ul className="flex-1 px-6 py-4 border-t space-y-2" >
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 mt-0.5 shrink-0 text-secondary" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <div className="p-6 pt-2">
                      <Button variant="outline"
                        type="button"
                        onClick={scrollToCta}
                        className={tier.featured ? `${goldButtonClass} w-full` : `${outlineButtonClass} w-full`}
                        
                      >
                        Register
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SPONSORS ===== */}
        <section className="py-16 bg-card">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="Become a Sponsor" sub="Put your business in front of every player, guest, and visitor to this page." />
              <div className="sample-stack grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {sponsorTiers.map((tier) => (
                  <div key={tier.name} className={`sample-card relative bg-card rounded-lg border flex flex-col overflow-hidden ${tier.name === "Presenting Sponsor" ? "border-2 border-secondary" : "border-border"}`}>
                    {tier.name === "Presenting Sponsor" && <span className="sample-ribbon absolute right-0 top-0">Top Tier</span>}
                    <div className="p-6 pt-10 text-center bg-primary/[.03]">
                      <h3 className="text-lg font-display font-bold text-foreground">{tier.name}</h3>
                      <p className="text-2xl font-bold mt-1 text-primary">{tier.price}</p>
                    </div>
                    <ul className="flex-1 px-6 py-4 border-t space-y-2" >
                      {tier.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 mt-0.5 shrink-0 text-secondary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="p-6 pt-2">
                      <Button variant="outline"
                        type="button"
                        onClick={scrollToCta}
                        className={`${outlineButtonClass} w-full`}
                        
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sample-stack mt-12 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {sampleSponsors.map((sponsor) => (
                  <div key={sponsor.name} aria-label={sponsor.name} className={`sample-logo sample-logo-${sponsor.treatment} rounded-lg border border-border bg-card px-3 py-6 flex flex-col items-center justify-center text-center`}>
                    <div className="relative mb-3">
                      <sponsor.icon className="h-9 w-9" strokeWidth={1.5} aria-hidden="true" />
                      {sponsor.treatment === "realty" && <Sprout className="absolute -right-2 bottom-0 h-5 w-5 bg-card" aria-hidden="true" />}
                    </div>
                    <span className={`text-base font-bold leading-tight ${sponsor.treatment === "auto" ? "italic" : "font-display"}`}>{sponsor.wordmark}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase">{sponsor.descriptor}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== LIVE LEADERBOARD ===== */}
        <section className="py-16 bg-golf-cream/50">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="Live Leaderboard" sub="Live scoring updates on every golfer's phone." />
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="sample-leaderboard w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-primary-foreground border-b-2 border-secondary">
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Pos</th>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Player</th>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Team</th>
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-xs">Score</th>
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-xs">Thru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardRows.map((row) => (
                        <tr key={row.pos} className="border-t border-border/60">
                          <td className="px-4 py-2.5 font-bold whitespace-nowrap text-primary">{row.pos <= 3 ? <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">{row.pos}</span> : <span className="inline-flex h-7 w-7 items-center justify-center">{row.pos}</span>}</td>
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap text-foreground"><span className="inline-flex items-center gap-2">{row.pos === 1 && <Trophy className="h-4 w-4 text-secondary" aria-hidden="true" />}{row.player}</span></td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{row.team}</td>
                          <td className="px-4 py-2.5 text-center font-bold whitespace-nowrap text-primary" >{row.score}</td>
                          <td className="px-4 py-2.5 text-center whitespace-nowrap text-muted-foreground">{row.thru}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} className="relative">
          <img src={panoramaImage} alt="Panoramic desert golf course" width={1920} height={640} loading="lazy" className="h-80 sm:h-72 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-primary/90 px-4 py-5">
            <div className="sample-stack mx-auto grid max-w-4xl grid-cols-1 sm:grid-cols-3 gap-4 text-center text-primary-foreground">
              <p><strong className="text-2xl text-secondary">144</strong> Golfers</p>
              <p><strong className="text-2xl text-secondary">36</strong> Teams</p>
              <p><strong className="text-2xl text-secondary">$85,000</strong><span className="block text-sm mt-1">Raised for Youth Programs</span></p>
            </div>
          </div>
        </motion.div>

        {/* ===== PAIRINGS ===== */}
        <section className="py-16 bg-card">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="Pairings" sub="Tee times and starting holes for every group." />
              <div className="sample-stack grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pairings.map((group) => (
                  <div key={group.hole} className="bg-card rounded-lg border border-border shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-primary">{group.time}</span>
                      <span
                        className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary/15 text-primary"
                        
                      >
                        {group.hole}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {group.players.map((p) => (
                        <li key={p} className="text-sm text-muted-foreground">{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SCHEDULE ===== */}
        <section className="py-16 bg-golf-cream/50">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="Schedule" />
              <div className="bg-card rounded-lg border border-border shadow-sm divide-y">
                {schedule.map((item) => (
                  <div key={item.time} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4 px-5 py-4 border-border">
                    <span className="text-sm font-bold w-20 shrink-0 text-primary">{item.time}</span>
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="py-16 bg-card">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <SectionHeading title="FAQ" />
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.q} className="bg-card rounded-lg border border-border shadow-sm p-5">
                    <h3 className="text-base font-bold mb-1.5 text-foreground">{faq.q}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== BOTTOM CTA BAND ===== */}
        <section id="start-your-event" className="py-20 bg-primary">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground leading-tight">
                Want a page like this for your tournament?
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-primary-foreground/85">
                We build your event page for you. Send us your logo and tournament details, and your page is live
                in 7 days or less. Free to start.
              </p>
              <div className="mt-8">
                <Button asChild variant="secondary" className={goldButtonClass}><a href="/get-started">
                  Start Your Event
                </a></Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SAMPLE NOTE ===== */}
        <div className="py-6 px-4 text-center bg-card">
          <p className="text-xs text-muted-foreground">
            This is a sample event page built to show how tournaments look on TeeVents. Names, prices, and results are examples.
          </p>
        </div>
      </div>
      </MotionConfig>
    </Layout>
  );
};

export default SampleEvent;

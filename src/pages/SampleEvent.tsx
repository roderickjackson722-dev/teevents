import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Award, Check } from "lucide-react";
import Layout from "@/components/Layout";
import heroImage from "@/assets/golf-course-hero.jpg";

/**
 * Static sample event page shown to prospective organizers from sales emails.
 * All content is fictional and hardcoded: no database, no checkout, no live data.
 * Styling mirrors the real public tournament page (classic template).
 */

const PRIMARY = "#1a5c38";
const GOLD = "#F5A623";
const HERO_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.5) 100%)";

const scrollToCta = () => {
  document.getElementById("start-your-event")?.scrollIntoView({ behavior: "smooth" });
};

const SectionHeading = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="text-center mb-10">
    <h2 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: "#1a1a1a" }}>
      {title.toUpperCase()}
    </h2>
    <div className="w-16 h-0.5 mx-auto mt-3 mb-4" style={{ backgroundColor: GOLD }} />
    {sub && <p className="text-sm max-w-xl mx-auto" style={{ color: "#666" }}>{sub}</p>}
  </div>
);

const goldButtonClass =
  "inline-block py-3 px-8 rounded-lg text-center font-bold text-sm tracking-wider uppercase transition-opacity hover:opacity-90";
const outlineButtonClass =
  "inline-block py-3 px-8 rounded-lg text-center font-bold text-sm tracking-wider uppercase border-2 transition-colors hover:bg-black/5";

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
  "Desert Ridge Bank",
  "Cactus Flower Realty",
  "Sonoran Auto Group",
  "Valley View Insurance",
  "Copper State Roofing",
  "Mesa Family Dental",
];

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
      <div className="min-h-screen bg-white" id="top">
        {/* Sample badge */}
        <div className="pt-20 pb-4 text-center bg-white">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full"
            style={{ backgroundColor: GOLD + "22", color: PRIMARY, border: `1px solid ${GOLD}` }}
          >
            Sample Event Page
          </span>
        </div>

        {/* ===== HERO ===== */}
        <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: PRIMARY }}>
          <img src={heroImage} alt="Desert Ridge Golf Club" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: HERO_OVERLAY }} />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 w-full max-w-4xl mx-auto text-center"
          >
            <h1
              className="font-display font-bold leading-tight text-4xl sm:text-5xl md:text-6xl"
              style={{ color: "#ffffff", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              Fairway Charity Classic
            </h1>
            <p className="mt-4 text-lg sm:text-xl" style={{ color: "rgba(255,255,255,0.85)" }}>
              Presented by Desert Ridge Bank
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <Calendar className="h-4 w-4 shrink-0" />
                Saturday, March 13, 2027
              </span>
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <Clock className="h-4 w-4 shrink-0" />
                8:00 AM Shotgun Start
              </span>
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                <MapPin className="h-4 w-4 shrink-0" />
                Desert Ridge Golf Club
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToCta}
                className={goldButtonClass}
                style={{ backgroundColor: GOLD, color: PRIMARY }}
              >
                Register a Foursome
              </button>
              <button
                type="button"
                onClick={scrollToCta}
                className={outlineButtonClass}
                style={{ borderColor: "#ffffff", color: "#ffffff" }}
              >
                Become a Sponsor
              </button>
            </div>
          </motion.div>
        </section>

        {/* ===== ABOUT ===== */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="About the Event" />
              <div className="space-y-4 text-base leading-relaxed" style={{ color: "#555" }}>
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
            </motion.div>
          </div>
        </section>

        {/* ===== REGISTRATION ===== */}
        <section className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-5xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="Registration" sub="Pick the package that fits your group. Every option includes a full day on the course." />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {registrationTiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden"
                    style={{ borderColor: tier.featured ? GOLD : "#e5e5e5", borderWidth: tier.featured ? 2 : 1 }}
                  >
                    <div className="p-6 text-center" style={{ backgroundColor: PRIMARY + "08" }}>
                      <Award className="h-8 w-8 mx-auto mb-2" style={{ color: GOLD }} />
                      <h3 className="text-xl font-display font-bold" style={{ color: "#1a1a1a" }}>{tier.name}</h3>
                      <p className="text-2xl font-bold mt-1" style={{ color: PRIMARY }}>{tier.price}</p>
                    </div>
                    <ul className="flex-1 px-6 py-4 border-t space-y-2" style={{ borderColor: "#f0f0f0" }}>
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2 text-sm" style={{ color: "#555" }}>
                          <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <div className="p-6 pt-2">
                      <button
                        type="button"
                        onClick={scrollToCta}
                        className={tier.featured ? `${goldButtonClass} w-full` : `${outlineButtonClass} w-full`}
                        style={
                          tier.featured
                            ? { backgroundColor: GOLD, color: PRIMARY }
                            : { borderColor: PRIMARY, color: PRIMARY }
                        }
                      >
                        Register
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SPONSORS ===== */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="Become a Sponsor" sub="Put your business in front of every player, guest, and visitor to this page." />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {sponsorTiers.map((tier) => (
                  <div key={tier.name} className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden" style={{ borderColor: "#e5e5e5" }}>
                    <div className="p-6 text-center" style={{ backgroundColor: PRIMARY + "08" }}>
                      <h3 className="text-lg font-display font-bold" style={{ color: "#1a1a1a" }}>{tier.name}</h3>
                      <p className="text-2xl font-bold mt-1" style={{ color: PRIMARY }}>{tier.price}</p>
                    </div>
                    <ul className="flex-1 px-6 py-4 border-t space-y-2" style={{ borderColor: "#f0f0f0" }}>
                      {tier.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "#555" }}>
                          <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="p-6 pt-2">
                      <button
                        type="button"
                        onClick={scrollToCta}
                        className={`${outlineButtonClass} w-full`}
                        style={{ borderColor: PRIMARY, color: PRIMARY }}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Placeholder sponsor logos */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {sampleSponsors.map((name) => (
                  <div
                    key={name}
                    className="rounded-lg border bg-white px-3 py-6 flex items-center justify-center text-center"
                    style={{ borderColor: "#e5e5e5" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "#888" }}>{name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== LIVE LEADERBOARD ===== */}
        <section className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="Live Leaderboard" sub="Live scoring updates on every golfer's phone." />
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#e5e5e5" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: PRIMARY, color: "#ffffff" }}>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Pos</th>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Player</th>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs">Team</th>
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-xs">Score</th>
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-xs">Thru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardRows.map((row, i) => (
                        <tr key={row.pos} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa", borderTop: "1px solid #f0f0f0" }}>
                          <td className="px-4 py-2.5 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{row.pos}</td>
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ color: "#1a1a1a" }}>{row.player}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "#555" }}>{row.team}</td>
                          <td className="px-4 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: row.score.startsWith("-") ? "#15803d" : "#1a1a1a" }}>{row.score}</td>
                          <td className="px-4 py-2.5 text-center whitespace-nowrap" style={{ color: "#666" }}>{row.thru}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== PAIRINGS ===== */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="Pairings" sub="Tee times and starting holes for every group." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pairings.map((group) => (
                  <div key={group.hole} className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: "#e5e5e5" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold" style={{ color: PRIMARY }}>{group.time}</span>
                      <span
                        className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: GOLD + "22", color: PRIMARY }}
                      >
                        {group.hole}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {group.players.map((p) => (
                        <li key={p} className="text-sm" style={{ color: "#555" }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SCHEDULE ===== */}
        <section className="py-16" style={{ backgroundColor: "#fafafa" }}>
          <div className="max-w-2xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="Schedule" />
              <div className="bg-white rounded-xl border shadow-sm divide-y" style={{ borderColor: "#e5e5e5" }}>
                {schedule.map((item) => (
                  <div key={item.time} className="flex items-center gap-4 px-5 py-4" style={{ borderColor: "#f0f0f0" }}>
                    <span className="text-sm font-bold w-20 shrink-0" style={{ color: PRIMARY }}>{item.time}</span>
                    <span className="text-sm" style={{ color: "#555" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="py-16 bg-white">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading title="FAQ" />
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.q} className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: "#e5e5e5" }}>
                    <h3 className="text-base font-bold mb-1.5" style={{ color: "#1a1a1a" }}>{faq.q}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== BOTTOM CTA BAND ===== */}
        <section id="start-your-event" className="py-20" style={{ backgroundColor: PRIMARY }}>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">
                Want a page like this for your tournament?
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                We build your event page for you. Send us your logo and tournament details, and your page is live
                in 7 days or less. Free to start.
              </p>
              <div className="mt-8">
                <a href="/get-started" className={goldButtonClass} style={{ backgroundColor: GOLD, color: PRIMARY }}>
                  Start Your Event
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== SAMPLE NOTE ===== */}
        <div className="py-6 px-4 text-center bg-white">
          <p className="text-xs" style={{ color: "#999" }}>
            This is a sample event page built to show how tournaments look on TeeVents. Names, prices, and results are examples.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SampleEvent;

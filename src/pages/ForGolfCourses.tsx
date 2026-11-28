import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroGolf from "@/assets/hero-golf.jpg";
import sampleHero from "@/assets/sample-event-hero.jpg.asset.json";
import sampleLeaderboard from "@/assets/sample-event-leaderboard.jpg.asset.json";

const benefits = [
  ["Less Work", "Your rep builds the events, so your staff never learns tournament setup. Registration, pairings, scoring, and printables come ready, not as a to-do list."],
  ["More Fun", "Your golfers play more formats, watch the leaderboard move on their phones, and stay for the awards, because the competition stays alive all day."],
  ["More Revenue", "Live scoring and sponsor visibility give an outing organizer a reason to pick your course, and registration money lands straight in your Stripe account."],
];
const features = [
  ["Live scoring and leaderboard", "Your golfers enter scores from their phones and watch the leaderboard move, so the competition stays alive all day and the awards ceremony starts on time."],
  ["Clubhouse TV", "Your dashboard gives you a link to your live leaderboard, so you can open it on the clubhouse TV and the whole room follows the action."],
  ["Registration", "Golfers register and pay on your branded event page, so signups stop living in email and paper forms."],
  ["Master Roster", "Import your player list in seconds, so the next event starts with names you already know, not a blank form."],
  ["Handicaps", "Enter a handicap index and TeeVents calculates the course handicap, so you do not need a separate system to work out playing handicaps."],
  ["Formats", "14 formats, from scrambles and best ball to Stableford and Ryder Cup style team events, so the event runs the way your members want to play it."],
  ["Branded event pages", "A branded page for each event and league, with event info, tee times, leaderboards, and season points, so your golfers see one event, not a form."],
  ["Printables", "Scorecards, cart signs, tee sheets, and bag tags print ready to go, so a pairing change means reprinting one sheet, not rebuilding the whole event."],
  ["Communications", "Email and text your players without leaving the event, so nobody misses a tee time change."],
  ["Operations", "Invoices and reports show what every event brought in, so the board gets real numbers, not guesses."],
];
const eventTypes = [
  ["Outings", "Corporate and charity outings with online registration, a shotgun start, and sponsors seen on your event page."],
  ["Leagues", "Weekly stroke play, Stableford, and match play leagues with season standings that update themselves."],
  ["Member Events", "Member-guests, couples events, and Ryder Cup style team matches, with registration you can limit to your members."],
  ["Club Championships", "Multi-round stroke play with flights, each with its own leaderboard, or a bracket for head to head play."],
];
const workflow = [
  ["You tell us once", "Your rep builds the event page, registration, format, pairings, and live scoring, so your staff never touches setup."],
  ["You approve it", "You can open your event any time and change anything with the same dashboard tools we use."],
  ["Your golfers register", "Money goes straight to your Stripe account as they sign up."],
  ["You run the day", "Your rep is on call by phone, email, and text, and your printables are ready before the first tee time."],
];
const questions = [
  ["How much does Enterprise cost?", "Enterprise is $2,999 a year with unlimited events. 0% TeeVents platform fee. Card payments carry the Stripe processing fee of 2.9% plus $0.30, shown on its own line."],
  ["Do our members need to download an app?", "No. Golfers open the event link on their phone and score in the browser. No app to download."],
  ["Does it work with our tee sheet and point of sale?", "TeeVents runs the tournament, not the register. Pairings, scoring, and the leaderboard live in TeeVents, and your pro shop keeps its POS."],
  ["Can several staff members use the same account?", "Yes. Invite your staff with their own sign-ins and roles: Admin, Editor, Scoring Only, and Viewer."],
  ["Can we post scores to GHIN?", "No GHIN sync yet. Enter a handicap index on the roster and TeeVents calculates the course handicap for you."],
  ["What about outside charity events at our course?", "They run as their own customer on TeeVents, with their own Stripe account. They do not count toward your Enterprise events."],
  ["What if we already have tournament software?", "You do not have to learn new software. Your rep builds your events for you, and your staff runs event day from one dashboard. If you run 10 or more events a year, Enterprise is $2,999 a year with 0% platform fees."],
];
const sectionClass = "px-6 py-14 md:py-20";
const headingClass = "font-display text-3xl font-bold leading-tight text-primary md:text-4xl";
function StartAction() {
  return <Button asChild variant="secondary" size="lg" className="h-auto min-h-12 px-6 py-3 font-semibold"><Link to="/get-started">Get Started<ArrowRight aria-hidden="true" /></Link></Button>;
}

/** Public presentation only; address registration awaits approval to protect the Enterprise dashboard. */
export default function ForGolfCourses() {
  return <Layout><div className="golf-course-sales bg-golf-cream text-foreground">
    <section aria-labelledby="course-sales-title" className="relative overflow-hidden bg-primary text-primary-foreground">
      <img src={heroGolf} alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
      <div className="homepage-hero-overlay absolute inset-0" />
      <div className="relative mx-auto max-w-5xl px-6 py-14 text-center md:py-20">
        <p className="mb-4 text-sm font-semibold text-secondary">TeeVents Enterprise for Golf Courses</p>
        <h1 id="course-sales-title" className="font-display text-4xl font-bold leading-tight md:text-5xl">Tournament Software Your Staff Will Actually Use</h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-primary-foreground/95">One account runs your outings, leagues, member events, and championships. Your dedicated rep builds each event for you, and your staff runs event day from one dashboard. No learning curve, no setup to figure out.</p>
        <ul className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-2">{["One dashboard for your whole season", "Your rep builds every event for you", "Live scoring on your golfers' phones", "0% platform fee, money straight to Stripe"].map(text => <li key={text} className="flex gap-2 text-sm leading-relaxed"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />{text}</li>)}</ul>
        <p className="mt-7 font-semibold text-secondary">$2,999 a year. 0% TeeVents platform fee. No per-event fees.</p>
        <p className="mt-2 text-sm text-primary-foreground/85">For courses and clubs running 10 or more events a year.</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-6"><StartAction /><Link to="/pricing" className="font-semibold text-primary-foreground underline underline-offset-4">See pricing</Link></div>
      </div>
    </section>
    <section className={sectionClass} aria-labelledby="course-benefits-title"><div className="mx-auto max-w-6xl">
      <h2 id="course-benefits-title" className={`${headingClass} mx-auto max-w-4xl text-center`}>Less Work for Your Staff. More Fun for Your Golfers. More Revenue for Your Course.</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">{benefits.map(([title, body]) => <article key={title} className="rounded-lg border border-border bg-card p-6"><h3 className="font-display text-2xl font-bold text-primary">{title}.</h3><p className="mt-4 leading-relaxed text-muted-foreground">{body}</p></article>)}</div>
    </div></section>
    <section className={`${sectionClass} bg-background`} aria-labelledby="course-anywhere-title"><div className="mx-auto max-w-3xl"><h2 id="course-anywhere-title" className={headingClass}>Open Anywhere, Change Anything</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">TeeVents runs in the browser, so your staff opens the dashboard from the pro shop, the office, or the course. You can open your event any time and change anything. When something comes up on event day, your rep is one call away.</p></div></section>
    <section className={sectionClass} aria-labelledby="course-features-title"><div className="mx-auto max-w-6xl"><h2 id="course-features-title" className={headingClass}>Everything Your Tournament Needs, in One Place</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">Registration, pairings, scoring, sponsors, printables, and reports. One account, one dashboard, one place your staff looks.</p>
      <div className="mt-10 divide-y divide-border">{features.map(([title, body], index) => <article key={title} className={`py-7 ${index === 0 || index === 6 ? "grid items-center gap-6 md:grid-cols-2" : "max-w-3xl"}`}><div><h3 className="font-display text-2xl font-bold text-primary">{title}.</h3><p className="mt-3 leading-relaxed text-muted-foreground">{body}</p></div>{(index === 0 || index === 6) && <img src={index === 0 ? sampleLeaderboard.url : sampleHero.url} alt={index === 0 ? "Sample event live leaderboard" : "Sample branded event page"} width={1477} height={768} loading="lazy" className="aspect-[1477/768] w-full rounded-lg border border-border object-contain" />}</article>)}</div>
    </div></section>
    <section className={`${sectionClass} bg-background`} aria-labelledby="course-types-title"><div className="mx-auto max-w-6xl"><h2 id="course-types-title" className={headingClass}>Outings, Leagues, Member Events, and Championships</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">One account, no limit on events. The same software runs your Tuesday league and your member-guest.</p><div className="mt-10 grid gap-6 sm:grid-cols-2">{eventTypes.map(([title, body]) => <article key={title} className="rounded-lg border border-border bg-card p-6"><h3 className="font-display text-2xl font-bold text-primary">{title}.</h3><p className="mt-4 leading-relaxed text-muted-foreground">{body}</p></article>)}</div></div></section>
    <section className={sectionClass} aria-labelledby="course-leagues-title"><div className="mx-auto max-w-3xl"><h2 id="course-leagues-title" className={headingClass}>Leagues That Keep Players Coming Back</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">Weekly leagues run all season in one place, with online signups, pairings, live scoring, and season points your players can follow. Your league gets its own page, so standings live where your players already look.</p></div></section>
    <section className={`${sectionClass} bg-primary text-primary-foreground`} aria-labelledby="course-workflow-title"><div className="mx-auto max-w-6xl"><h2 id="course-workflow-title" className="font-display text-3xl font-bold leading-tight md:text-4xl">From the First Call to the Shotgun</h2><ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{workflow.map(([title, body], i) => <li key={title}><span className="font-display text-4xl text-secondary">0{i + 1}</span><h3 className="mt-4 font-display text-xl font-bold">{title}.</h3><p className="mt-3 leading-relaxed text-primary-foreground/85">{body}</p></li>)}</ol></div></section>
    <section className={sectionClass} aria-labelledby="course-time-title"><div className="mx-auto max-w-3xl"><h2 id="course-time-title" className={headingClass}>Built to Give Your Staff Time Back</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">Your staff opens one dashboard and sees the whole season. No new software to learn, no setup to figure out, no scores to chase down after the round. Your team spends its time with players, not with paperwork.</p><ul className="mt-7 space-y-3">{["A dedicated rep on every event", "Live scoring on any phone, no app to download", "Your POS stays in place", "Real-time updates across the whole event"].map(text => <li key={text} className="flex gap-3"><CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />{text}</li>)}</ul></div></section>
    <section className={`${sectionClass} bg-background`} aria-labelledby="course-founder-title"><div className="mx-auto max-w-3xl"><h2 id="course-founder-title" className={headingClass}>Built by a Tournament Director</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">TeeVents was founded by Rod Jackson, a tournament director since 2018. We run at least 10 events a year, including NCAA-sanctioned HBCU college golf tournaments (SWAC, MEAC, SIAC; Division I and II) and celebrity fundraising events. TeeVents was built for the work we were doing by hand, so your staff gets the easy version.</p><p className="mt-6 font-semibold leading-relaxed text-primary">On November 7, 2026, the ATL 2-Person Team Shamble ran 48 players on TeeVents live scoring.</p><Link to="/sample-event" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary underline underline-offset-4">See a finished event page<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div></section>
    <section className={sectionClass} aria-labelledby="course-cost-title"><div className="mx-auto max-w-3xl"><h2 id="course-cost-title" className={headingClass}>What It Costs</h2><div className="mt-6 space-y-4 text-lg leading-relaxed"><p className="font-semibold text-primary">$2,999 a year. 0% TeeVents platform fee. Billed annually. No per-event fees.</p><p>Card payments carry the Stripe processing fee of 2.9% plus $0.30, shown on its own line.</p><p>Eight events at $399 a tournament is $3,192. Enterprise is $2,999. Ten events at $399 is $3,990. Enterprise is $2,999, a $991 saving.</p><p>Registration money goes straight to your Stripe account as golfers sign up. TeeVents never holds your money.</p><p>Your pro shop and food and beverage keep the POS they already use. TeeVents runs the tournament, not the register.</p></div></div></section>
    <section className={`${sectionClass} bg-background`} aria-labelledby="course-faq-title"><div className="mx-auto max-w-3xl"><h2 id="course-faq-title" className={headingClass}>Questions From Golf Courses</h2><Accordion type="single" collapsible className="mt-7">{questions.map(([question, answer], i) => <AccordionItem key={question} value={`course-faq-${i}`}><AccordionTrigger className="gap-4 py-6 text-left text-base font-semibold">{question}</AccordionTrigger><AccordionContent className="text-base leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion></div></section>
    <section className={`${sectionClass} bg-primary text-center text-primary-foreground`} aria-labelledby="course-close-title"><div className="mx-auto max-w-3xl"><h2 id="course-close-title" className="font-display text-3xl font-bold leading-tight md:text-4xl">Ready to See Your Season on TeeVents?</h2><p className="mt-5 text-lg leading-relaxed text-primary-foreground/85">Your rep builds your events, and stays on call on event day, so your season runs on your plan.</p><div className="mt-8"><StartAction /></div></div></section>
  </div></Layout>;
}
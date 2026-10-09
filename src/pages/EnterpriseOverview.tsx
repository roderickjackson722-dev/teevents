import { Link } from "react-router-dom";
import { Check, Trophy, Users, CalendarDays, Smartphone, Printer, Mail, ShieldCheck, Flag, BarChart3, UserCog, Headphones } from "lucide-react";
import Layout from "@/components/Layout";
import { DedicatedRepBadge, EnterpriseRepSection } from "@/components/DedicatedRep";
import SEO from "@/components/SEO";
import EnterpriseInquiryDialog from "@/components/pricing/EnterpriseInquiryDialog";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { icon: Headphones, title: "A dedicated TeeVents representative", items: ["Your rep builds every tournament and league page for you", "Event setup, pairings and leaderboard configured before event day", "Priority support for your staff"] },
  { icon: Trophy, title: "Unlimited tournaments", items: ["Run as many events as you want each year", "Single-round and multi-round events, 9 or 18 holes", "Stroke play, scramble, best ball, alternate shot, Stableford, match play and more", "Duplicate a past event in one click"] },
  { icon: CalendarDays, title: "Leagues", items: ["Seasons, weekly events and season standings", "Team and individual leagues", "Member scoring codes and league leaderboards"] },
  { icon: Users, title: "Club roster & handicaps", items: ["One reusable member list for every event", "Spreadsheet import with column matching", "Handicap Index per player with Course Handicap worked out using the USGA formula", "Saved courses and tee sets"] },
  { icon: Flag, title: "Pairings & registration", items: ["Auto-assign groups by handicap or at random, then drag and drop", "Shotgun A/B groups and tee times", "Shareable registration link and QR code", "Custom questions, waitlist, player limits and close dates", "Free or paid sign-ups, with payments going straight to your account"] },
  { icon: Smartphone, title: "Live scoring & leaderboard", items: ["Players score from their phones with a QR code or a short code", "Live leaderboard with gross and net", "TV display mode for the clubhouse", "Skins and deuces, gross and net"] },
  { icon: Printer, title: "Printables", items: ["Scorecards for every format, with QR sign-in", "Cart signs, alpha lists and name badges"] },
  { icon: Mail, title: "Communications", items: ["Email and text your players", "Editable confirmation, reminder and receipt emails"] },
  { icon: UserCog, title: "Staff accounts", items: ["Multiple staff logins under one club account", "Role-based permissions for each staff member"] },
  { icon: BarChart3, title: "Your own branded course page", items: ["A club page that lists all your upcoming events", "Your logo and colors"] },
  { icon: ShieldCheck, title: "Payments you can trust", items: ["0% TeeVents transaction fees on Enterprise", "Payments handled by Stripe, a PCI Level 1 processor", "Money settles to your club's own account"] },
];

export default function EnterpriseOverview() {
  return (
    <Layout>
      <SEO title="TeeVents Enterprise for Golf Courses & Clubs" description="Everything included in TeeVents Enterprise for golf courses and organizations running 10 or more events a year." path="/enterprise-overview" noIndex />
      <DedicatedRepBadge />
      <section className="bg-primary px-4 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">TeeVents Enterprise · $2,999 per year</p>
        <h1 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold text-primary-foreground md:text-5xl">Built for golf courses and clubs running 10+ events a year</h1>
        <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/80">Unlimited tournaments and leagues. Live scoring on every event. 0% transaction fees. And a dedicated rep who builds every event for you.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <EnterpriseInquiryDialog><Button variant="secondary" size="lg">Request Enterprise</Button></EnterpriseInquiryDialog>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"><Link to="/enterprise-demo">Try the live demo</Link></Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 grid gap-4 text-center sm:grid-cols-3">
          {[["Unlimited", "tournaments & leagues"], ["0%", "TeeVents transaction fees"], ["1", "dedicated representative"]].map(([a, b]) => (
            <div key={b} className="rounded-xl border border-border bg-card p-6"><p className="font-display text-4xl font-bold text-primary">{a}</p><p className="text-sm text-muted-foreground">{b}</p></div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-6">
              <s.icon className="h-6 w-6 text-secondary" />
              <h2 className="mt-3 font-display text-lg font-bold text-foreground">{s.title}</h2>
              <ul className="mt-3 space-y-2">
                {s.items.map((i) => <li key={i} className="flex gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted px-4 py-14 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Run 10 events and it pays for itself</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Per-event pricing is $299 each. At 10 events a year, Enterprise costs about the same and adds unlimited events, leagues, staff logins and 0% fees.</p>
        <EnterpriseInquiryDialog><Button size="lg" variant="secondary" className="mt-6">Talk to us about your club</Button></EnterpriseInquiryDialog>
        <p className="mt-3 text-xs text-muted-foreground">Questions? info@teevents.golf</p>
      </section>
      <EnterpriseRepSection />
    </Layout>
  );
}

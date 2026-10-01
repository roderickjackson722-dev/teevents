import { Link } from "react-router-dom";
import { Paintbrush, Globe, DollarSign, Flag, Megaphone, Users, Check, X } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

const cards = [
  { icon: Users, title: "We Build It For You", body: "Every paid event includes a dedicated TeeVents representative who builds your event page, custom leaderboard, and pairings." },
  { icon: Paintbrush, title: "Your Brand. Your Colors. Your Leaderboard.", body: "Most platforms give you a generic green and white leaderboard. TeeVents lets you customize your leaderboard to match your event's branding—your logo, your colors, your identity. Whether it's school colors, Greek organization colors, or your company's palette, your leaderboard will look like it was built just for you." },
  { icon: Globe, title: "Event Pages That Look Like Real Websites", body: "Other platforms give you a basic form. TeeVents creates a fully branded, professional event page with hero images, sponsor logos, and custom colors. Your players will think you hired a web designer—when really, you built it in minutes." },
  { icon: DollarSign, title: "Free for Organizers. Player-Funded.", body: "Most platforms charge you upfront—before you've sold a single ticket. TeeVents is free for organizers. A small service fee is included in each player's registration total, so you keep 100% of your event revenue. You only pay when your players pay." },
  { icon: Flag, title: "Built for Golf. Not Generic Events.", body: "Other platforms are built for concerts, conferences, and generic ticketing. TeeVents is built exclusively for golf. Live leaderboards, mobile scoring, pairings, tee sheets, skins, deuces, and GHIN handicap integration—all built in, not bolted on." },
  { icon: Megaphone, title: "Sponsor Highlights That Actually Get Seen", body: "Most platforms bury sponsor logos in a PDF. TeeVents puts your sponsors front and center—on the live leaderboard, the event page, and the mobile scoring app. Clickable logos, digital signage, and a built-in sponsor package you can resell for $5k-$10k." },
];

const rows: [string, string, string][] = [
  ["Dedicated rep who builds everything for you", "Self-serve only", "Included"],
  ["Custom leaderboard colors", "Generic template", "Full customization"],
  ["Event pages that look like websites", "Basic form", "Custom microsite"],
  ["Upfront cost", "$4,200/year", "$0 to start"],
  ["Who pays the fee?", "The organizer", "The players (typically)"],
  ["Sponsor highlights", "Basic or none", "Clickable logos + digital signage"],
  ["White-label branding", "Platform branding shows", "Remove our branding entirely"],
  ["League management", "Limited", "Full season tracking"],
  ["Auction dashboard", "Extra cost", "Built-in"],
  ["Custom domain", "Generic URL", "Your own domain"],
  ["Built for golf", "Generic events", "Golf-specific"],
];

const No = ({ t }: { t: string }) => (
  <span className="inline-flex items-start gap-2 text-muted-foreground"><X className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />{t}</span>
);
const Yes = ({ t }: { t: string }) => (
  <span className="inline-flex items-start gap-2 font-medium text-foreground"><Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />{t}</span>
);

export default function WhyTeeVents() {
  return (
    <Layout>
      <SEO title="Why TeeVents?" description="Branded leaderboards, event pages that look like real websites, and zero upfront cost. See why organizers choose TeeVents." path="/why-teevents" />

      <section className="bg-primary text-primary-foreground py-20 px-4 text-center">
        <h1 className="font-display text-4xl md:text-6xl font-bold">Why <span className="text-secondary">TeeVents?</span></h1>
        <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-primary-foreground/90">Most platforms give you a generic tool. TeeVents gives you a complete, branded event experience—with zero upfront cost.</p>
        <p className="mt-4 text-secondary font-medium">See why organizers are choosing TeeVents over other platforms.</p>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-secondary">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4"><Icon className="h-6 w-6 text-secondary" /></div>
              <h2 className="font-display text-xl font-bold text-primary mb-3">{title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/40">
        <div className="container mx-auto max-w-4xl rounded-2xl border-2 border-secondary bg-card p-6 md:p-10 shadow-md">
          <h2 className="font-display text-3xl font-bold text-primary text-center mb-8">How We Compare to Other Platforms</h2>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="py-3 pr-4">Feature</th>
                  <th className="py-3 pr-4 text-muted-foreground">Most Platforms</th>
                  <th className="py-3 bg-secondary/15 px-3 text-primary">TeeVents</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([f, a, b]) => (
                  <tr key={f} className="border-b border-border">
                    <td className="py-3 pr-4 font-medium">{f}</td>
                    <td className="py-3 pr-4"><No t={a} /></td>
                    <td className="py-3 px-3 bg-secondary/10"><Yes t={b} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {rows.map(([f, a, b]) => (
              <div key={f} className="rounded-lg border border-border p-4 space-y-2 text-sm">
                <p className="font-semibold text-primary">{f}</p>
                <No t={a} />
                <div><Yes t={b} /></div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground italic text-center">Competitor features based on publicly available information. Actual features may vary.</p>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to see the difference?</h2>
        <p className="mt-4 text-primary-foreground/90">Build your first event for free. No upfront cost. No commitment.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup" className="bg-secondary text-primary px-8 py-3 rounded-md font-semibold hover:bg-secondary/90 transition-colors">Get Started — Free for Organizers</Link>
          <Link to="/enterprise-demo" className="border-2 border-secondary text-secondary px-8 py-3 rounded-md font-semibold hover:bg-secondary hover:text-primary transition-colors">See a Live Demo</Link>
        </div>
      </section>
    </Layout>
  );
}

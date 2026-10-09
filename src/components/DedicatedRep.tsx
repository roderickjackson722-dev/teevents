import { Check, Globe, Smartphone, Trophy, Wrench } from "lucide-react";

export const repComparisonRows: [string, string, string][] = [
  ["Dedicated rep who builds your event", "You handle the setup", "Included on every plan — even free"],
  ["Custom event page built for you", "You build it", "We build it"],
  ["Leaderboard set up with your branding", "You configure the template", "Custom-built by your rep"],
  ["Sponsor page", "You arrange your sponsor display", "Built for you"],
  ["Pre-configured mobile scoring", "You set it up", "We set it up"],
];

export function DedicatedRepBadge() {
  return <div className="rep-service border-y border-secondary/30 bg-background px-4 py-4 text-center"><p className="mx-auto flex max-w-4xl items-center justify-center gap-3 text-sm font-semibold text-primary"><Wrench className="h-5 w-5 shrink-0" aria-hidden="true" /><span>Every tournament — free or paid — includes a dedicated TeeVents rep who builds it for you.</span></p></div>;
}

export function DedicatedRepSection() {
  const columns = [
    { icon: Globe, title: "We Build Your Custom Website Page", text: "Your rep designs a fully branded event page with your logo, colors, hero image, and sponsor logos. It looks like you hired a web designer — because we did the work for you." },
    { icon: Smartphone, title: "We Set Up Registration, Payments & Mobile Scoring", text: "We configure your registration form, connect your Stripe account, set up payment tiers, and activate mobile scoring so players can enter scores from their phones." },
    { icon: Trophy, title: "We Set Up Pairings, Leaderboard & Sponsor Page", text: "We build your pairings, set up your live leaderboard with custom branding, and create a sponsor page that highlights your partners. Everything is ready before event day." },
  ];
  return <section className="rep-service bg-background py-16 md:py-20 border-b border-border"><div className="container mx-auto max-w-6xl px-4"><div className="mx-auto max-w-4xl text-center"><p className="mb-3 text-sm font-semibold text-primary">A real person. A named partner. Your event.</p><h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Your Own Dedicated TeeVents Rep — Included With Every Event</h2><p className="mt-5 text-lg text-muted-foreground">You don't learn software. You don't watch tutorials. You don't build anything. You just tell us about your event — and we handle the rest.</p></div><div className="mt-12 grid gap-8 md:grid-cols-3">{columns.map(({icon: Icon, title, text}) => <div key={title} className="border-t-2 border-secondary pt-6"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-4 font-display text-xl font-bold">{title}</h3><p className="mt-3 text-muted-foreground leading-relaxed">{text}</p></div>)}</div><p className="mt-12 border-l-4 border-secondary pl-6 text-xl font-display font-semibold text-primary">This isn't software you have to figure out. This is a service you get to use.</p></div></section>;
}

export function WhyServiceMatters() {
  const rows = [
    ["You build the event page yourself", "Your rep builds it for you"],
    ["You configure registration and payments", "Your rep sets it all up"],
    ["You figure out the leaderboard settings", "Your rep configures everything"],
    ["You watch tutorials and read FAQs", "You tell us what you want — we do it"],
    ["Generic email support tickets", "A named rep who knows your event"],
    ["You're on your own", "You have a dedicated partner"],
  ];
  return <section className="rep-service bg-muted/40 py-16 md:py-20"><div className="container mx-auto max-w-5xl px-4"><h2 className="text-center font-display text-3xl md:text-4xl font-bold">Most Platforms Sell You Software. We Deliver a Finished Event.</h2><p className="mt-4 text-center text-muted-foreground">Here's the difference.</p><div className="mt-10"><div className="grid grid-cols-2 gap-4 border-b-2 border-secondary pb-4 font-semibold"><p>Typical Tournament Software</p><p className="text-primary">TeeVents</p></div>{rows.map(([them, us]) => <div key={them} className="grid grid-cols-2 gap-4 border-b border-border py-5 text-sm md:text-base"><p className="text-muted-foreground">{them}</p><p className="font-medium text-primary">{us}</p></div>)}</div><p className="mt-8 font-display text-xl font-semibold text-primary">That's why organizers choose TeeVents — not because the software is better, but because the service is.</p></div></section>;
}

export function RepMeaningSection() {
  return <section className="rep-service bg-background py-16 border-y border-border"><div className="container mx-auto max-w-5xl px-4"><h2 className="font-display text-3xl md:text-4xl font-bold">What 'Dedicated Rep' Actually Means</h2><p className="mt-5 text-lg text-primary">Whether you start on the free plan or go Enterprise, you get the same level of hands-on support. A dedicated rep builds your event, sets up your leaderboard, and configures your scoring — no matter which tier you choose.</p><p className="mt-5 text-muted-foreground">You're not left to figure it out. You're assigned a named TeeVents rep who:</p><ul className="mt-6 grid gap-4 sm:grid-cols-2">{["Builds your branded event page", "Configures your registration and payment flow", "Sets up your live leaderboard with your colors", "Activates mobile scoring for your players", "Creates your sponsor page", "Builds your pairings and tee times", "Is available before, during, and after your event"].map(item => <li key={item} className="flex gap-3"><Check className="h-5 w-5 shrink-0 text-primary" />{item}</li>)}</ul><p className="mt-8 border-l-4 border-secondary pl-5 text-muted-foreground leading-relaxed">That's why our pricing is what it is. You're paying for expertise, attention to detail, and a partner who cares about your event as much as you do. That hands-on care is included on every plan.</p></div></section>;
}

export function EnterpriseRepSection() {
  const rows = [
    ["Builds your branded club page", "Your club looks professional online"],
    ["Sets up every tournament and league", "You don't touch the software"],
    ["Configures pairings, handicaps, and tee sets", "Accurate Course Handicaps using the USGA formula"],
    ["Activates live scoring and mobile scoring", "Players score from their phones"],
    ["Sets up your sponsor page and leaderboard", "Sponsors get maximum visibility"],
    ["Prepares print-ready scorecards and cart signs", "Everything is ready for event day"],
    ["Provides priority support during events", "You're never left waiting"],
  ];
  return <section className="rep-service bg-background py-16 border-y border-border"><div className="container mx-auto max-w-5xl px-4"><h2 className="font-display text-3xl md:text-4xl font-bold">What Your Dedicated Enterprise Rep Does</h2><div className="mt-8"><div className="grid grid-cols-2 gap-4 border-b-2 border-secondary pb-4 font-semibold"><p>What We Handle</p><p>Why It Matters</p></div>{rows.map(([task, benefit]) => <div key={task} className="grid grid-cols-2 gap-4 border-b border-border py-4"><p className="font-medium text-primary">{task}</p><p className="text-muted-foreground">{benefit}</p></div>)}</div><p className="mt-8 font-display text-xl font-semibold text-primary">Enterprise isn't just unlimited software access. It's unlimited hands-on support from a dedicated team.</p></div></section>;
}
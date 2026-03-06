import {
  Globe,
  Users,
  Trophy,
  DollarSign,
  QrCode,
  MessageSquare,
  ShoppingBag,
  Gavel,
  Camera,
  Heart,
  ClipboardList,
  UserCheck,
  BarChart3,
  Shield,
  Link2,
  Check,
} from "lucide-react";
import logoBlack from "@/assets/logo-black.png";
import logoWhite from "@/assets/logo-white.png";
import salesHero from "@/assets/sales-hero.jpg";

const features = [
  { icon: Globe, title: "Website Builder", desc: "3 pro templates, custom branding, one-click publish & custom domain support" },
  { icon: Users, title: "Registration & Payments", desc: "Online signups, Stripe payments, auto confirmations & guest checkout" },
  { icon: Trophy, title: "Live Scoring & Leaderboard", desc: "Players score on mobile — no app needed. Real-time public leaderboard" },
  { icon: QrCode, title: "QR Code Check-In", desc: "Print QR badges, scan on any device, real-time attendance counter" },
  { icon: BarChart3, title: "Pairings & Groups", desc: "Drag-and-drop foursomes, auto-assign, CSV import/export" },
  { icon: DollarSign, title: "Budget Tracking", desc: "Income & expenses by category, paid/unpaid status at a glance" },
  { icon: Shield, title: "Sponsor Management", desc: "Tiered sponsors (Title–Bronze), payment tracking & website display" },
  { icon: MessageSquare, title: "Email & SMS Messaging", desc: "Blast communications, scheduled sends & delivery tracking" },
  { icon: ShoppingBag, title: "Merchandise Store", desc: "Create products, set prices & sell via Stripe checkout" },
  { icon: Gavel, title: "Auction & Raffle", desc: "Silent auction, raffle tickets, buy-now & winner tracking" },
  { icon: Camera, title: "Photo Gallery", desc: "Upload event photos with captions to your tournament site" },
  { icon: Heart, title: "Donations Page", desc: "Fundraising goals, progress bar & Stripe payment processing" },
  { icon: ClipboardList, title: "Planning Guide", desc: "30-item checklist from 12 months out to post-event" },
  { icon: UserCheck, title: "Volunteer Coordination", desc: "Define roles, time slots & track volunteer signups" },
];

const plans = [
  { name: "Base", price: "Free", fee: "5%", note: "1 tournament" },
  { name: "Starter", price: "$499", fee: "3%", note: "All templates + SMS" },
  { name: "Pro", price: "$999", fee: "2%", note: "Store, auction & more", popular: true },
  { name: "Enterprise", price: "Custom", fee: "1%", note: "Unlimited everything" },
];

export default function Flyer() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 print:p-0">
      {/* Print button - hidden in print */}
      <button
        onClick={() => window.print()}
        className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold shadow-lg hover:opacity-90 transition-opacity print:hidden"
      >
        Download / Print PDF
      </button>

      {/* Flyer - single page, 8.5x11 ratio */}
      <div className="w-full max-w-[850px] bg-card shadow-2xl print:shadow-none print:max-w-none print:w-full">

        {/* Hero Header */}
        <div className="relative overflow-hidden" style={{ height: "180px" }}>
          <img src={salesHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(152,45%,22%)] via-[hsl(152,45%,22%,0.85)] to-[hsl(152,45%,22%,0.7)]" />
          <div className="relative z-10 h-full flex items-center px-10">
            <div className="flex items-center gap-5">
              <img src={logoWhite} alt="TeeVents" className="h-14 w-auto" />
              <div>
                <h1 className="text-3xl font-bold text-white font-display tracking-tight">TeeVents</h1>
                <p className="text-white/80 text-sm mt-0.5">The All-In-One Golf Tournament Management Platform</p>
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-white/90 text-lg font-semibold">Plan. Promote. Play.</p>
              <p className="text-secondary text-sm font-medium mt-0.5">www.teevents.golf</p>
            </div>
          </div>
        </div>

        {/* Tagline bar */}
        <div className="bg-secondary/10 border-b border-border px-10 py-3">
          <p className="text-center text-foreground text-sm font-medium">
            Everything your golf tournament needs — from website creation to live scoring — in one powerful dashboard.
          </p>
        </div>

        {/* Features Grid */}
        <div className="px-8 pt-5 pb-4">
          <h2 className="text-lg font-bold text-foreground font-display mb-4 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-secondary rounded" />
            Platform Features
            <span className="w-8 h-0.5 bg-secondary rounded" />
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">{f.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Strip */}
        <div className="px-8 pb-4">
          <h2 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-secondary rounded" />
            Simple Pricing
            <span className="w-8 h-0.5 bg-secondary rounded" />
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-center border ${
                  p.popular
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-muted/30 border-border"
                }`}
              >
                <p className={`text-xs font-bold ${p.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.name}</p>
                <p className="text-xl font-bold mt-0.5">{p.price}</p>
                <p className={`text-[10px] mt-0.5 ${p.popular ? "text-primary-foreground/70" : "text-primary font-semibold"}`}>+ {p.fee} per txn</p>
                <p className={`text-[10px] mt-1 ${p.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Selling Points */}
        <div className="px-8 pb-4">
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <div className="grid grid-cols-3 gap-3">
              {[
                "Free to start — no credit card required",
                "Organizers keep full control of payments via Stripe Connect",
                "Mobile-first — scoring, check-in & registration on any device",
                "Custom domains — your brand, your URL",
                "Scale from free to enterprise as you grow",
                "Purpose-built for golf — not a generic event tool",
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] text-foreground leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-primary px-10 py-5 flex items-center justify-between">
          <div>
            <p className="text-primary-foreground text-lg font-bold font-display">Ready to Elevate Your Tournament?</p>
            <p className="text-primary-foreground/70 text-xs mt-0.5">Start free today — no credit card required</p>
          </div>
          <div className="text-right">
            <p className="text-secondary font-bold text-sm">www.teevents.golf</p>
            <p className="text-primary-foreground/60 text-xs mt-0.5">info@teevents.golf</p>
          </div>
        </div>
      </div>
    </div>
  );
}

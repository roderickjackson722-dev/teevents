import { useState } from "react";
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
  Check,
  Timer,
  Printer,
  FileText,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import logoWhite from "@/assets/logo-white.png";
import salesHero from "@/assets/sales-hero.jpg";

const features = [
  { icon: Globe, title: "Website Builder", desc: "6 pro templates, custom branding, one-click publish & custom domain support" },
  { icon: Users, title: "Registration & Payments", desc: "Online signups, add-ons, promo codes, Stripe payments & auto confirmations" },
  { icon: Trophy, title: "Live Scoring & Leaderboard", desc: "8 formats: Scramble, Best Ball, Stableford, Alternate Shot, Shamble & more" },
  { icon: QrCode, title: "QR Code Check-In", desc: "Print QR badges, scan on any device, real-time attendance counter" },
  { icon: BarChart3, title: "Pairings & Groups", desc: "Drag-and-drop foursomes, auto-assign, CSV import/export" },
  { icon: DollarSign, title: "Budget Tracking", desc: "Income & expenses by category, paid/unpaid status at a glance" },
  { icon: Shield, title: "Sponsor Management", desc: "Tiered sponsors (Title–Bronze), payment tracking & website display" },
  { icon: MessageSquare, title: "Email & SMS Messaging", desc: "Blast communications, scheduled sends & delivery tracking" },
  { icon: ShoppingBag, title: "Merchandise Store", desc: "Create products, set prices & sell via Stripe checkout" },
  { icon: Gavel, title: "Auction & Raffle", desc: "Silent auction, raffle tickets, buy-now & winner tracking" },
  { icon: Camera, title: "Photo Gallery", desc: "Upload event photos with captions to your tournament site" },
  { icon: Heart, title: "Donations Page", desc: "Fundraising goals, progress bar & Stripe payment processing" },
  { icon: Printer, title: "6 Printable Types", desc: "Scorecards, cart signs, name badges, sponsor signs, alpha list & hole assignments" },
  { icon: Timer, title: "Countdown Styles", desc: "4 timer designs: Glass, Solid, Minimal & Circle on your event page" },
  { icon: ClipboardList, title: "Planning Guide", desc: "30-item checklist from 12 months out to post-event" },
  { icon: UserCheck, title: "Volunteers & Surveys", desc: "Define roles, track signups & collect post-event feedback" },
];

const plans = [
  { name: "Free", price: "$0", fee: "5%", note: "Core features to get started" },
  { name: "Base", price: "$249", fee: "0%", note: "Zero platform fees" },
  { name: "Starter", price: "$499", fee: "0%", note: "We build it for you + leaderboard & sponsors", popular: true },
  { name: "Premium", price: "$1,999", fee: "0%", note: "$25K hole-in-one insurance + auction" },
];

function DetailedFlyer() {
  return (
    <div className="w-full max-w-[850px] bg-card shadow-2xl print:shadow-none print:max-w-none print:w-full">
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ height: "170px" }}>
        <img src={salesHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(152,45%,22%)] via-[hsl(152,45%,22%,0.85)] to-[hsl(152,45%,22%,0.7)]" />
        <div className="relative z-10 h-full flex items-center px-10">
          <div className="flex items-center gap-4 flex-shrink-0">
            <img src={logoWhite} alt="TeeVents" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-white font-display tracking-tight leading-none">TeeVents</h1>
              <p className="text-white/80 text-xs mt-1">The All-In-One Golf Tournament<br />Management Platform</p>
            </div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <p className="text-white/90 text-base font-semibold">Plan. Promote. Play.</p>
            <p className="text-secondary text-sm font-medium mt-0.5">www.teevents.golf</p>
          </div>
        </div>
      </div>

      {/* Tagline bar */}
      <div className="bg-secondary/10 border-b border-border px-10 py-2.5">
        <p className="text-center text-foreground text-sm font-medium">
          Everything your golf tournament needs — from website creation to live scoring — in one powerful dashboard.
        </p>
      </div>

      {/* Features Grid */}
      <div className="px-8 pt-4 pb-3">
        <h2 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
          <span className="w-8 h-0.5 bg-secondary rounded" />
          Platform Features
          <span className="w-8 h-0.5 bg-secondary rounded" />
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground leading-tight">{f.title}</p>
                  <p className="text-[9px] text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Strip */}
      <div className="px-8 pb-3">
        <h2 className="text-lg font-bold text-foreground font-display mb-2.5 flex items-center gap-2">
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
      <div className="px-8 pb-3">
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              "Free to start — no credit card required",
              "Organizers keep full control of payments via Stripe Connect",
              "Mobile-first — scoring, check-in & registration on any device",
              "Custom domains — your brand, your URL",
              "Hole-by-hole par customization for accurate scorecards",
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
      <div className="bg-primary px-10 py-4 flex items-center justify-between">
        <div>
          <p className="text-primary-foreground text-lg font-bold font-display">Ready to Elevate Your Tournament?</p>
          <p className="text-primary-foreground/70 text-xs mt-0.5">Start free today — no credit card required</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-secondary font-bold text-sm">www.teevents.golf</p>
            <p className="text-primary-foreground/60 text-xs mt-0.5">info@teevents.golf</p>
          </div>
          <div className="bg-white rounded-lg p-1.5">
            <QRCodeSVG value="https://teevents.golfarted" size={48} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickFlyer() {
  return (
    <div className="w-full max-w-[850px] bg-card shadow-2xl print:shadow-none print:max-w-none print:w-full" style={{ pageBreakBefore: "always" }}>
      {/* Hero - compact */}
      <div className="relative overflow-hidden" style={{ height: "200px" }}>
        <img src={salesHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-8">
          <img src={logoWhite} alt="TeeVents" className="h-12 w-auto mb-3" />
          <h1 className="text-4xl font-bold text-white font-display tracking-tight">Manage Your Golf Tournament Like a Pro</h1>
          <p className="text-white/80 text-base mt-2">One platform. Every tool. Zero headaches.</p>
        </div>
      </div>

      {/* 3-Column Feature Highlights */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Tournament Website</h3>
            <p className="text-[10px] text-muted-foreground mt-1">6 templates, custom domain, mobile-responsive. Publish in minutes.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Live Scoring</h3>
            <p className="text-[10px] text-muted-foreground mt-1">8 formats including Scramble, Best Ball & Stableford. Real-time leaderboard.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Registration & Payments</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Online signups, Stripe payments, QR check-in on any device.</p>
          </div>
        </div>
      </div>

      {/* Feature List - 2 columns */}
      <div className="px-8 pb-5">
        <div className="bg-muted/30 rounded-xl p-5 border border-border">
          <h2 className="text-base font-bold text-foreground font-display mb-3 text-center">Everything You Need, Built In</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              "Drag-and-drop player pairings",
              "Email & SMS messaging",
              "Sponsor management & tiered recognition",
              "Budget tracking (income & expenses)",
              "Merchandise store with Stripe checkout",
              "Silent auction & raffle management",
              "Photo gallery on your event site",
              "Donation page with fundraising goals",
              "6 printable types: scorecards, cart signs, badges & more",
              "Registration add-ons & tournament promo codes",
              "Volunteer coordination & signups",
              "Post-event surveys & feedback",
              "30-item planning checklist",
              "Custom registration fields & hole-by-hole pars",
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-[11px] text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing - horizontal */}
      <div className="px-8 pb-5">
        <div className="grid grid-cols-4 gap-3">
          {plans.map((p, i) => (
            <div
              key={i}
              className={`rounded-xl p-3.5 text-center border-2 ${
                p.popular
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]"
                  : "bg-card border-border"
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider ${p.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{p.name}</p>
              <p className="text-2xl font-bold mt-1">{p.price}</p>
              <p className={`text-[10px] mt-0.5 ${p.popular ? "text-primary-foreground/70" : "text-primary font-semibold"}`}>+ {p.fee} per txn</p>
              <p className={`text-[9px] mt-1.5 ${p.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.note}</p>
              {p.popular && <p className="text-[9px] font-bold mt-1 text-secondary">★ Most Popular</p>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="bg-primary px-10 py-5 flex items-center justify-between">
        <div>
          <p className="text-primary-foreground text-xl font-bold font-display">Start Free Today</p>
          <p className="text-primary-foreground/70 text-xs mt-0.5">No credit card required · 5 minute setup</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-secondary font-bold text-lg">www.teevents.golf</p>
            <p className="text-primary-foreground/60 text-xs mt-0.5">info@teevents.golf</p>
          </div>
          <div className="bg-white rounded-lg p-1.5">
            <QRCodeSVG value="https://teevents.lovablegolfarted" size={56} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Flyer() {
  const [view, setView] = useState<"detailed" | "quick">("detailed");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 print:p-0 gap-8">
      {/* Controls - hidden in print */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
        <div className="bg-card border border-border rounded-lg flex overflow-hidden shadow-lg">
          <button
            onClick={() => setView("detailed")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === "detailed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Detailed
          </button>
          <button
            onClick={() => setView("quick")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === "quick" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Quick
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow-lg hover:opacity-90 transition-opacity"
        >
          Print / PDF
        </button>
      </div>

      {view === "detailed" ? <DetailedFlyer /> : <QuickFlyer />}
    </div>
  );
}

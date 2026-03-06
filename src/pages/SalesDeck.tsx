import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Globe,
  Users,
  Trophy,
  DollarSign,
  BarChart3,
  QrCode,
  MessageSquare,
  ShoppingBag,
  Gavel,
  Camera,
  ClipboardList,
  Heart,
  UserCheck,
  Zap,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";
import logoBlack from "@/assets/logo-black.png";
import heroGolf from "@/assets/hero-golf.jpg";
import demoWebsite from "@/assets/demo-website-builder.jpg";
import demoRegistration from "@/assets/demo-registration.jpg";
import demoPairings from "@/assets/demo-pairings.jpg";
import demoBudget from "@/assets/demo-budget.jpg";
import demoMessaging from "@/assets/demo-messaging.jpg";
import demoSponsors from "@/assets/demo-sponsors.jpg";

// ── Slide Data ──────────────────────────────────────────────
const slides = [
  {
    id: "title",
    type: "title" as const,
    heading: "TeeEvents",
    subheading: "The All-In-One Golf Tournament Management Platform",
    tagline: "Plan. Promote. Play. — Everything your tournament needs in one place.",
  },
  {
    id: "problem",
    type: "bullets" as const,
    heading: "The Problem",
    icon: BarChart3,
    color: "hsl(var(--destructive))",
    bullets: [
      "Managing golf tournaments involves dozens of disconnected tools",
      "Spreadsheets for players, email for comms, separate payment processors",
      "No single platform built specifically for golf tournament organizers",
      "Hours wasted on manual coordination instead of building your event",
    ],
  },
  {
    id: "solution",
    type: "bullets" as const,
    heading: "The Solution: TeeEvents",
    icon: Zap,
    color: "hsl(var(--primary))",
    bullets: [
      "Purpose-built platform for golf tournament management",
      "From website creation to live scoring — everything in one dashboard",
      "Start free, scale as you grow with tiered pricing",
      "Organizers collect payments directly with Stripe Connect",
    ],
  },
  {
    id: "website",
    type: "feature" as const,
    heading: "Tournament Website Builder",
    description: "Create a beautiful, branded tournament website in minutes. Choose from 3 professional templates, customize colors and content, and publish with one click.",
    image: demoWebsite,
    highlights: ["3 Pro Templates", "Custom Branding", "One-Click Publish", "Mobile Responsive"],
  },
  {
    id: "registration",
    type: "feature" as const,
    heading: "Online Registration & Payments",
    description: "Accept player registrations and payments online. Automated email confirmations, payment tracking, and roster management — all built in.",
    image: demoRegistration,
    highlights: ["Stripe Payments", "Auto Confirmations", "Payment Tracking", "Guest Checkout"],
  },
  {
    id: "pairings",
    type: "feature" as const,
    heading: "Player Pairings & Groups",
    description: "Drag-and-drop player assignments into groups. Auto-assign players, create foursomes, and manage the entire roster with CSV import/export.",
    image: demoPairings,
    highlights: ["Drag & Drop", "Auto-Assign", "CSV Import/Export", "Group Management"],
  },
  {
    id: "scoring",
    type: "iconGrid" as const,
    heading: "Live Scoring & Leaderboard",
    icon: Trophy,
    description: "Players enter their own scores via a mobile-friendly scoring page. Real-time leaderboard updates automatically. Share the scoring link with your entire field.",
    gridItems: [
      { icon: Trophy, label: "Live Leaderboard" },
      { icon: Users, label: "Group-Based Login" },
      { icon: Globe, label: "Public Scoring Page" },
      { icon: QrCode, label: "Shareable Link" },
    ],
  },
  {
    id: "checkin",
    type: "iconGrid" as const,
    heading: "QR Code Check-In",
    icon: QrCode,
    description: "Print QR codes for every player. Staff scan at check-in using any device. Dedicated scan station page with real-time status updates and manual search fallback.",
    gridItems: [
      { icon: QrCode, label: "QR Code Generation" },
      { icon: UserCheck, label: "Scan Station" },
      { icon: Users, label: "Real-Time Count" },
      { icon: ClipboardList, label: "Manual Fallback" },
    ],
  },
  {
    id: "sponsors",
    type: "feature" as const,
    heading: "Sponsor Management",
    description: "Track sponsors by tier (Title, Gold, Silver, Bronze), manage payments, display logos on your tournament website, and generate sponsor reports.",
    image: demoSponsors,
    highlights: ["Tiered Sponsorships", "Payment Tracking", "Website Display", "Logo Management"],
  },
  {
    id: "budget",
    type: "feature" as const,
    heading: "Budget Tracking",
    description: "Track every dollar — income and expenses — with categorized budget items. See paid vs. unpaid status at a glance and keep your financials organized.",
    image: demoBudget,
    highlights: ["Income & Expenses", "Categories", "Paid/Unpaid Status", "Real-Time Totals"],
  },
  {
    id: "messaging",
    type: "feature" as const,
    heading: "Email & SMS Messaging",
    description: "Send targeted communications to your entire player roster. Schedule messages in advance, track delivery, and keep everyone informed with email and SMS.",
    image: demoMessaging,
    highlights: ["Email Blasts", "SMS Texting", "Scheduled Sends", "Delivery Tracking"],
  },
  {
    id: "advanced",
    type: "iconGrid" as const,
    heading: "Advanced Features",
    icon: Zap,
    description: "Unlock powerful tools to elevate your tournament experience and maximize fundraising.",
    gridItems: [
      { icon: ShoppingBag, label: "Merchandise Store" },
      { icon: Gavel, label: "Auction & Raffle" },
      { icon: Camera, label: "Photo Gallery" },
      { icon: Heart, label: "Donation Page" },
      { icon: ClipboardList, label: "Post-Event Surveys" },
      { icon: UserCheck, label: "Volunteer Coordination" },
    ],
  },
  {
    id: "planning",
    type: "bullets" as const,
    heading: "Built-In Planning Guide",
    icon: ClipboardList,
    color: "hsl(var(--primary))",
    bullets: [
      "30-item tournament planning checklist auto-generated for each event",
      "Organized by timeline: 12 months out → Post-event",
      "Track completion, set due dates, and never miss a detail",
      "Industry best practices baked into every new tournament",
    ],
  },
  {
    id: "pricing",
    type: "pricing" as const,
    heading: "Simple, Transparent Pricing",
    plans: [
      { name: "Base", price: "Free", fee: "5%", highlights: ["1 tournament", "Registration & payments", "Website (1 template)", "Leaderboard & scoring"] },
      { name: "Starter", price: "$499", fee: "3%", highlights: ["All templates + custom colors", "Sponsors & budget tracking", "Donations page", "SMS messaging (500)"] },
      { name: "Pro", price: "$999", fee: "2%", popular: true, highlights: ["Merchandise store", "Auction & raffle", "Surveys & analytics", "Priority support"] },
      { name: "Enterprise", price: "Custom", fee: "1%", highlights: ["Unlimited tournaments", "Unlimited SMS", "White-label branding", "API access"] },
    ],
  },
  {
    id: "security",
    type: "bullets" as const,
    heading: "Enterprise-Grade Infrastructure",
    icon: Shield,
    color: "hsl(var(--primary))",
    bullets: [
      "Stripe Connect for secure, PCI-compliant payment processing",
      "Row-Level Security on all database tables",
      "Organizers manage their own Stripe accounts — full control",
      "Cloud-native architecture that scales with your event",
    ],
  },
  {
    id: "cta",
    type: "cta" as const,
    heading: "Ready to Elevate Your Tournament?",
    subheading: "Join organizers who save 20+ hours per event with TeeEvents.",
    cta: "Get Started Free",
    url: "/get-started",
  },
];

// ── Slide Components ────────────────────────────────────────
function TitleSlide({ data }: { data: typeof slides[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-[120px]"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)` }}>
      <motion.img src={logoBlack} alt="TeeEvents" className="h-[80px] mb-[40px] brightness-0 invert" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} />
      <motion.h1 className="text-[72px] font-bold text-white leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {data.heading}
      </motion.h1>
      <motion.p className="text-[36px] text-white/80 mt-[16px] font-light" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {"subheading" in data ? (data as any).subheading : ""}
      </motion.p>
      <motion.p className="text-[22px] text-white/60 mt-[24px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        {"tagline" in data ? (data as any).tagline : ""}
      </motion.p>
    </div>
  );
}

function BulletsSlide({ data }: { data: any }) {
  const Icon = data.icon;
  return (
    <div className="flex flex-col justify-center h-full px-[160px] bg-card">
      <div className="flex items-center gap-[20px] mb-[48px]">
        <div className="w-[64px] h-[64px] rounded-[16px] flex items-center justify-center" style={{ background: `${data.color}15` }}>
          <Icon className="w-[32px] h-[32px]" style={{ color: data.color }} />
        </div>
        <h2 className="text-[56px] font-bold text-foreground">{data.heading}</h2>
      </div>
      <ul className="space-y-[28px]">
        {data.bullets.map((b: string, i: number) => (
          <motion.li key={i} className="flex items-start gap-[16px]" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
            <ArrowRight className="w-[24px] h-[24px] mt-[4px] flex-shrink-0" style={{ color: data.color }} />
            <span className="text-[28px] text-muted-foreground">{b}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function FeatureSlide({ data }: { data: any }) {
  return (
    <div className="flex h-full bg-card">
      <div className="flex-1 flex flex-col justify-center px-[100px]">
        <motion.h2 className="text-[48px] font-bold text-foreground mb-[20px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {data.heading}
        </motion.h2>
        <motion.p className="text-[22px] text-muted-foreground mb-[36px] leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {data.description}
        </motion.p>
        <div className="grid grid-cols-2 gap-[12px]">
          {data.highlights.map((h: string, i: number) => (
            <motion.div key={i} className="flex items-center gap-[10px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <Check className="w-[20px] h-[20px] text-primary flex-shrink-0" />
              <span className="text-[20px] text-foreground">{h}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="w-[880px] flex items-center justify-center p-[40px]">
        <motion.img src={data.image} alt={data.heading} className="max-w-full max-h-full rounded-[16px] shadow-2xl object-contain" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} />
      </div>
    </div>
  );
}

function IconGridSlide({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-[160px] bg-card text-center">
      <motion.h2 className="text-[52px] font-bold text-foreground mb-[16px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {data.heading}
      </motion.h2>
      <motion.p className="text-[22px] text-muted-foreground mb-[56px] max-w-[900px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {data.description}
      </motion.p>
      <div className={`grid ${data.gridItems.length > 4 ? "grid-cols-3" : "grid-cols-4"} gap-[32px]`}>
        {data.gridItems.map((item: any, i: number) => {
          const Icon = item.icon;
          return (
            <motion.div key={i} className="flex flex-col items-center gap-[12px] bg-muted/30 rounded-[16px] p-[32px] min-w-[200px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
              <Icon className="w-[40px] h-[40px] text-primary" />
              <span className="text-[20px] font-semibold text-foreground">{item.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PricingSlide({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-[80px] bg-card">
      <motion.h2 className="text-[48px] font-bold text-foreground mb-[48px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {data.heading}
      </motion.h2>
      <div className="grid grid-cols-4 gap-[24px] w-full max-w-[1600px]">
        {data.plans.map((plan: any, i: number) => (
          <motion.div key={i} className={`rounded-[16px] p-[32px] border ${plan.popular ? "border-primary bg-primary text-primary-foreground shadow-xl" : "border-border bg-card"}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <h3 className="text-[28px] font-bold">{plan.name}</h3>
            <p className="text-[40px] font-bold mt-[8px]">{plan.price}</p>
            <p className={`text-[16px] font-semibold mt-[4px] ${plan.popular ? "text-primary-foreground/70" : "text-primary"}`}>+ {plan.fee} transaction fee</p>
            <ul className="mt-[24px] space-y-[12px]">
              {plan.highlights.map((h: string, j: number) => (
                <li key={j} className="flex items-start gap-[8px]">
                  <Check className={`w-[16px] h-[16px] mt-[3px] flex-shrink-0 ${plan.popular ? "text-primary-foreground/70" : "text-primary"}`} />
                  <span className={`text-[16px] ${plan.popular ? "text-primary-foreground/90" : "text-muted-foreground"}`}>{h}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CTASlide({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-[120px]"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)` }}>
      <motion.h2 className="text-[60px] font-bold text-white mb-[20px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {data.heading}
      </motion.h2>
      <motion.p className="text-[28px] text-white/70 mb-[48px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {data.subheading}
      </motion.p>
      <motion.a href={data.url} className="inline-flex items-center gap-[12px] bg-white text-primary px-[48px] py-[20px] rounded-full text-[24px] font-bold hover:bg-white/90 transition-colors" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
        {data.cta} <ArrowRight className="w-[24px] h-[24px]" />
      </motion.a>
    </div>
  );
}

function SlideRenderer({ slide }: { slide: typeof slides[number] }) {
  switch (slide.type) {
    case "title": return <TitleSlide data={slide} />;
    case "bullets": return <BulletsSlide data={slide} />;
    case "feature": return <FeatureSlide data={slide} />;
    case "iconGrid": return <IconGridSlide data={slide} />;
    case "pricing": return <PricingSlide data={slide} />;
    case "cta": return <CTASlide data={slide} />;
    default: return null;
  }
}

// ── Main Deck ───────────────────────────────────────────────
export default function SalesDeck() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, slides.length - 1)), []);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F5") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "Escape" && isFullscreen) document.exitFullscreen?.();
    };
    window.addEventListener("keydown", handler);
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fsHandler);
    return () => { window.removeEventListener("keydown", handler); document.removeEventListener("fullscreenchange", fsHandler); };
  }, [next, prev, isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center select-none">
      {/* Slide container */}
      <div className="relative w-full" style={{ maxWidth: "min(100vw, 177.78vh)", aspectRatio: "16/9" }}>
        <div className="absolute inset-0 overflow-hidden rounded-none md:rounded-lg shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div key={current} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <SlideRenderer slide={slides[current]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation overlay */}
        <div className="absolute inset-0 flex">
          <button onClick={prev} className="w-1/3 h-full cursor-w-resize opacity-0" aria-label="Previous" />
          <div className="w-1/3 h-full" />
          <button onClick={next} className="w-1/3 h-full cursor-e-resize opacity-0" aria-label="Next" />
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-4 mt-4 text-white/60">
        <button onClick={prev} disabled={current === 0} className="p-2 hover:text-white disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-mono">{current + 1} / {slides.length}</span>
        <button onClick={next} disabled={current === slides.length - 1} className="p-2 hover:text-white disabled:opacity-30 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button onClick={toggleFullscreen} className="p-2 hover:text-white transition-colors ml-4">
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Slide thumbnails */}
      {!isFullscreen && (
        <div className="flex gap-2 mt-4 px-4 overflow-x-auto max-w-full pb-4">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => setCurrent(i)} className={`flex-shrink-0 w-16 h-9 rounded border-2 text-[6px] font-bold flex items-center justify-center transition-all ${i === current ? "border-primary bg-primary/20 text-white" : "border-white/20 text-white/40 hover:border-white/40"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

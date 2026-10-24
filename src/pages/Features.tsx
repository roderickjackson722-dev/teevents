import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Globe, Layout as LayoutIcon, Link2, FileText, Eye, Unlock, Smartphone,
  Users, ClipboardList, FileSignature, CalendarClock, ListOrdered, ShoppingBag, UserPlus, Mail, RotateCcw, ShieldCheck, Landmark, Receipt,
  Hash, Zap, Monitor, Palette, Layers, UsersRound, Trophy, Coins, Flag, QrCode, KeyRound,
  Clock, Move, Grid3x3, Shuffle, Building2, CalendarDays, Printer, PencilLine, Repeat,
  Send, MessageSquare, Timer, MailCheck, Inbox, History, BadgeCheck,
  Award, Megaphone, Image, MonitorSmartphone, HeartHandshake, Gavel, Ticket, Star,
  PiggyBank, FileSpreadsheet, FileDown, BarChart3, Calculator, FileStack, Scale, RefreshCw, FileCheck,
  LayoutDashboard, Lock, Network, Database, Bell, Compass, ListChecks, Activity, Archive, CreditCard, ShieldAlert,
  CheckCircle2, LineChart, Home, ListTree, Dumbbell, CalendarRange, Map, Settings2,
  type LucideIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

type Item = [LucideIcon, string, string];
type Category = { id: string; nav: string; title: string; subtitle: string; items: Item[]; callout?: string };

const categories: Category[] = [
  { id: "website", nav: "Website and Event Pages", title: "Custom Website and Event Pages", subtitle: "Your event deserves a site that looks like you hired a designer. We build it for you.", items: [
    [Globe, "Hosted Event Websites", "Fully hosted event pages with multiple layout templates."],
    [LayoutIcon, "Visual Site Builder", "Logo, hero imagery, brand colors, section content, and page ordering."],
    [Link2, "Custom Domain Support", "Brand your URL with your own domain (example: golfyourclub.com)."],
    [FileText, "Program-Specific Pages", "Schedule, information, sponsors, results, documents, and contact."],
    [Eye, "Publish and Preview", "Preview your site privately before making it live."],
    [Unlock, "Public Resource Access", "Schedules, documents, and results available without a login."],
    [Smartphone, "Mobile Responsive", "Every page looks great on phones and tablets."],
  ], callout: "Your dedicated rep designs a fully branded event page with your logo, colors, hero image, and sponsor logos. It looks like you hired a web designer because we did the work for you." },
  { id: "registration", nav: "Registration and Payments", title: "Registration and Payments", subtitle: "Online registration, secure payments, and instant payouts to your account.", items: [
    [Users, "Individual and Team Registration", "Configurable capacity limits for individuals, teams, and foursomes."],
    [ClipboardList, "Configurable Registration Forms", "Custom fields including roster details and apparel sizing."],
    [FileSignature, "Waiver and Consent Capture", "Electronic waivers and consent acknowledgements captured at registration."],
    [CalendarClock, "Registration Open and Close Scheduling", "Set open and close dates with automatic cutoffs."],
    [ListOrdered, "Automated Waitlist", "Queued offers with a timed claim window when spots open."],
    [ShoppingBag, "Add-On Purchases", "Optional add-ons and donations during checkout."],
    [UserPlus, "Manual and Offline Registration", "Administrators can enter registrations for phone, mail, and walk-in signups."],
    [Mail, "Automated Confirmation Emails", "Confirmation emails sent to the registrant and all listed group members."],
    [RotateCcw, "Refund Handling", "Full and partial refunds issued from the administrative dashboard."],
    [ShieldCheck, "PCI-Compliant Checkout", "Card, Apple Pay, and Google Pay accepted. No card data touches TeeVents."],
    [Landmark, "Direct-to-Organizer Settlement", "Funds land in your Stripe account. TeeVents never holds your money."],
    [Receipt, "Tax-Exempt Receipting", "501(c)(3) receipting support for qualifying organizations."],
  ], callout: "On the No Cost to Start plan, a 5% platform fee is included in each player's registration total. You keep 100% of your event revenue. Your players cover the fee." },
  { id: "scoring", nav: "Live Scoring and Leaderboards", title: "Live Scoring and Leaderboards", subtitle: "Real-time scores, custom leaderboards, and mobile scoring from any phone. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up.", items: [
    [Smartphone, "Mobile Live Scoring", "Players score from any phone browser. No app download required."],
    [Hash, "Hole-by-Hole and Per-Round Entry", "Score entry with validation and correction."],
    [Zap, "Fast Bulk Score Entry", "Designed for large fields of 100 or more participants."],
    [Monitor, "Real-Time Public Leaderboards", "Auto-updating leaderboards with a large-format display mode for on-site monitors. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
    [Palette, "Custom Leaderboard Colors", "Your rep matches every leaderboard to your event colors and logo. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
    [Layers, "Multi-Division and Multi-Round", "Support for 9, 18, 27, 36, and 54-hole competitions."],
    [UsersRound, "Team Scoring", "Configurable team size with best-of-N counting scores."],
    [Trophy, "Multiple Scoring Formats", "Scramble, Stroke Play, Stableford, Best Ball, Alternate Shot, and more."],
    [Coins, "Skins and Deuces", "Gross and net skins with automatic winner calculation."],
    [Flag, "Closest-to-the-Pin", "Track and display side-game winners."],
    [QrCode, "QR Code Access", "Participants can access scoring and leaderboard pages via QR code. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
    [KeyRound, "Short Numeric Access Codes", "Score without creating an account."],
  ], callout: "Display your live leaderboard on a TV monitor at the clubhouse. It updates in real time as scores are entered. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up." },
  { id: "pairings", nav: "Pairings and Scheduling", title: "Pairings and Scheduling", subtitle: "Drag-and-drop pairings, tee times, and facility management.", items: [
    [Clock, "Start-Time and Mass-Start Scheduling", "Group and heat assignment for shotgun starts and tee times."],
    [Move, "Drag-and-Drop Pairings", "Assign participants to groups, times, and locations in seconds."],
    [Grid3x3, "Group Sizes of 2, 3, or 4", "Pairing templates for repeatable setups."],
    [Shuffle, "Auto-Assign Pairings", "Auto-generate groups by handicap or random."],
    [Building2, "Facility and Venue Records", "Booking records with double-booking conflict detection."],
    [CalendarDays, "Drag-to-Move Calendar", "Games, practices, and meetings with reschedule and cancel states."],
    [Printer, "Printable Operational Materials", "Scorecards, signage, pairing sheets, and rosters."],
    [PencilLine, "Editable Content Overrides", "Customize printed materials on the fly."],
    [Repeat, "League Scheduling", "Season-long scheduling with recurring weekly events."],
  ] },
  { id: "communication", nav: "Communication", title: "Communication Tools", subtitle: "Bulk email, SMS, and automated reminders. All from one dashboard.", items: [
    [Send, "Bulk Email", "Send to all participants, coaches, or a selected team or group."],
    [MessageSquare, "Bulk SMS and Text Messaging", "Text the same audience groups directly from the platform."],
    [Timer, "Scheduled Sends", "Schedule messages for future delivery."],
    [MailCheck, "Automated Transactional Email", "Confirmations, reminders, waitlist offers, and receipts."],
    [Inbox, "Two-Way Support Messaging", "Participant and organizer messages routed to an administrative inbox."],
    [History, "Communication History", "Complete log of every message sent for recordkeeping."],
    [BadgeCheck, "Verified Sending Domain", "Email delivered reliably with verified sending configuration."],
  ] },
  { id: "sponsorship", nav: "Sponsorship and Fundraising", title: "Sponsorship and Fundraising", subtitle: "Put your sponsors in front of every player and raise more for your cause.", items: [
    [Award, "Tiered Sponsor Packages", "Create packages at different price points."],
    [Megaphone, "Public Sponsor Pages", "Dedicated sponsor pages on your event site."],
    [Image, "Logo Placement", "Sponsor logos on your event page and live leaderboard. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
    [MonitorSmartphone, "Digital Signage", "Clickable sponsor logos on leaderboard and mobile scoring pages. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
    [HeartHandshake, "Donation Widgets", "Collect donations at checkout and on your event page."],
    [Gavel, "Silent Auctions", "Mobile bidding with auto-draw at close."],
    [Ticket, "50/50 Raffles", "Digital raffle sales with automatic winner selection."],
    [Receipt, "501(c)(3) Receipting", "Tax-exempt receipting for qualifying organizations."],
    [Star, "Donor Recognition Wall", "Thank your donors publicly on your event page."],
  ] },
  { id: "reporting", nav: "Reporting and Financials", title: "Reporting and Financials", subtitle: "Real-time visibility into every dollar that moves through your event.", items: [
    [PiggyBank, "Live Budget Tracking", "Track every dollar of revenue and expense as it happens."],
    [FileSpreadsheet, "CSV Exports", "Export registrations, participants, rosters, schedules, results, and transactions."],
    [FileDown, "PDF Reports", "Print or save schedules, reports, and invoices as PDF."],
    [BarChart3, "Post-Event Summary Reports", "Participation and revenue reports after every event."],
    [Calculator, "Financial Reports", "Line-item detail suitable for reconciliation."],
    [FileStack, "Invoice Generation", "Multiple line items with purchase-order reference and status tracking."],
    [Scale, "GAAP and GASB Views", "Government accounting-standard views with CSV and PDF export."],
    [RefreshCw, "Stripe Payout Sync", "Every payout synced with your Stripe account."],
    [FileCheck, "1099-K Friendly Exports", "Tax-ready exports for your accountant."],
  ] },
  { id: "security", nav: "Admin and Security", title: "Admin and Security", subtitle: "Enterprise-grade security and role-based access for your whole team.", items: [
    [LayoutDashboard, "Central Admin Dashboard", "Categorized navigation with everything in one place."],
    [Lock, "Role-Based Access Control", "Granular per-permission assignment for staff and volunteers."],
    [Network, "Multi-Organization Support", "Separate data for each organization or tenant."],
    [Database, "Row-Level Database Security", "Participant and financial data secured at the database layer."],
    [Bell, "Administrator Activity Notifications", "Alerts for new programs, registrations, and transactions."],
    [Compass, "Guided Setup Walkthrough", "Step-by-step setup for new programs."],
    [ListChecks, "Interactive Operational Checklist", "Ensures nothing is missed before event day."],
    [Activity, "Automated Daily Health Monitoring", "Public pages checked daily with email alerts on failure."],
    [Archive, "Program Archival", "Historical record retention with double-confirmation deletion."],
    [CreditCard, "PCI Level 1 Payments", "Bank-level Stripe security. We never hold your money."],
    [ShieldCheck, "256-bit SSL Encryption", "Encrypted in transit and at rest."],
    [ShieldAlert, "Stripe Radar Fraud Protection", "Built-in fraud protection on every payment."],
  ] },
  { id: "players", nav: "Player Experience", title: "For Your Players", subtitle: "A simple, modern experience that keeps golfers coming back.", items: [
    [CheckCircle2, "Easy Registration", "Register online in minutes with a clean, mobile-friendly form."],
    [QrCode, "QR Check-In", "Check in on event day by scanning a QR code."],
    [Smartphone, "Mobile Scoring", "Score from any phone. No app download required."],
    [LineChart, "Live Leaderboard Access", "Follow the leaderboard in real time. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
    [Mail, "Instant Email Confirmations", "Confirmation emails with calendar invites."],
    [Home, "Player Hub", "One place for schedule, pairings, scoring, and results."],
    [Trophy, "Public Results", "View final leaderboards and standings after the event. Live leaderboard: $99 one-time add-on on the free plan, included with Per-Event and up."],
  ] },
];

const multiSport: Item[] = [
  [ListTree, "Sport Type Designation", "Every program can be assigned a sport type."],
  [CalendarRange, "Season Records Independent of Sport", "Recurring seasonal programs supported."],
  [Users, "Team Records with Rosters", "Rosters, coach assignment, and per-season standings."],
  [Map, "Facility Records Across Sports", "Shared facility records for fields, courts, and courses."],
  [Dumbbell, "Sport-Agnostic Registration and Payments", "The same core platform supports any sport."],
  [Settings2, "Per-Sport Form Configuration", "Custom registration forms per sport."],
];

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.5 } };

function Section({ id, title, subtitle, items, callout, muted }: { id: string; title: string; subtitle: string; items: Item[]; callout?: string; muted?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-32 py-16 md:py-20 ${muted ? "bg-muted/40" : "bg-background"}`}>
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div {...fade} className="mx-auto mb-10 max-w-3xl text-center">
          <h2 id={`${id}-title`} className="font-display text-3xl font-bold text-primary md:text-4xl">{title}</h2>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">{subtitle}</p>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([Icon, name, desc], i) => (
            <motion.div key={name} {...fade} transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.3) }} className="flex gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="h-fit rounded-lg bg-secondary/20 p-2 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <div><h3 className="font-body text-base font-semibold text-foreground">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{desc}</p></div>
            </motion.div>
          ))}
        </div>
        {callout && (
          <motion.div {...fade} className="mx-auto mt-8 max-w-4xl rounded-xl border-l-4 border-secondary bg-primary p-6 text-primary-foreground">
            <p className="text-base md:text-lg">{callout}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default function Features() {
  const slot = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck((slot.current?.getBoundingClientRect().top ?? 1) <= 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);
  return (
    <Layout>
      <SEO title="Golf Tournament Software Features" description="Every TeeVents feature: event websites, registration and payments, live scoring, pairings, communication, sponsorship, reporting, security, and player tools." path="/features" />

      <section className="bg-primary py-20 text-center text-primary-foreground md:py-28">
        <motion.div {...fade} className="container mx-auto max-w-4xl px-4">
          <p className="text-sm font-semibold tracking-widest text-secondary">PLATFORM FEATURES</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">Everything You Need to Run a Professional Golf Tournament</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/85">From registration to payouts, TeeVents handles every part of your event. And every event includes a dedicated rep who builds it for you.</p>
          <Button asChild variant="secondary" size="lg" className="mt-9 font-bold"><Link to="/get-started">GET STARTED<ArrowRight /></Link></Button>
        </motion.div>
      </section>

      <div ref={slot} className="h-[61px]">
      <nav aria-label="Feature categories" className={`${stuck ? "fixed inset-x-0 top-16" : "relative"} z-30 border-b border-border bg-background/95 backdrop-blur`}>
        <div className="container mx-auto flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {[...categories.map((c) => [c.id, c.nav]), ["multi-sport", "Multi-Sport"]].map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} className="shrink-0 whitespace-nowrap rounded-full border border-border px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:border-secondary hover:bg-secondary/15">{label}</a>
          ))}
        </div>
      </nav>
      </div>

      {categories.map((c, i) => <Section key={c.id} {...c} muted={i % 2 === 1} />)}

      <Section id="multi-sport" title="Built for Golf. Ready for Multi-Sport." subtitle="TeeVents was built for golf and is architected to handle any sport your organization runs." items={multiSport} muted />

      <section className="bg-primary py-20 text-center text-primary-foreground">
        <motion.div {...fade} className="container mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-5xl">Ready to See Every Feature in Action?</h2>
          <p className="mt-5 text-lg text-primary-foreground/85">Free for organizers. A dedicated rep builds it for you.</p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/get-started">GET STARTED<ArrowRight /></Link></Button>
            <Button asChild variant="outline" size="lg" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/request-sample">REQUEST A SAMPLE</Link></Button>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}

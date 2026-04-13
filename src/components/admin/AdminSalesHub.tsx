import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Play, ChevronLeft, ChevronRight, Copy, ExternalLink,
  Users, LayoutDashboard, Globe, CreditCard, Trophy, DollarSign, Tag, HelpCircle,
  Clock, CheckCircle2, MessageSquare, Mail, Check, Download, BookOpen, Shield,
  Zap, BarChart3, FileText, Image, Edit, Trash2, Plus, Link2, QrCode, FolderOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { downloadHtmlAsPdf } from "@/components/printables/printUtils";

// ── Demo Steps ──
const STEPS = [
  { num: 1, title: "Welcome & Quick Overview", minutes: 2, icon: MessageSquare, hero: "In just 25 minutes I'll show you how TeeVents replaces spreadsheets and lets you run a professional golf tournament in minutes.", keyMessage: "Zero upfront cost on Base plan • 5% platform fee per transaction • Payments split automatically — we never hold your money", bullets: ["Introduce yourself and thank them for their time.", 'Ask: "Tell me about your tournament — how many players, is it a fundraiser, how do you manage it today?"', "Listen for pain points: spreadsheets, manual check-in, no website, payment headaches.", 'Transition: "Let me show you exactly how TeeVents solves all of that."'], route: null },
  { num: 2, title: "Onboarding in 60 Seconds", minutes: 3, icon: Users, hero: "Enter your organization name → pick a template → your branded tournament site is ready.", keyMessage: null, bullets: ["Show the Onboarding flow live (organization name + template picker).", "Highlight how fast it is — under 60 seconds to a fully branded site.", '"No design skills needed. Pick a template, upload your logo, done."'], route: "/onboarding" },
  { num: 3, title: "Dashboard Tour", minutes: 3, icon: LayoutDashboard, hero: "Everything in one place – no more Google Sheets or multiple tools.", keyMessage: null, bullets: ["Show the main dashboard — highlight at-a-glance stats (players, revenue, check-ins).", 'Point out the sidebar: "Everything you need lives right here."', "Mention the Planning Guide checklist: 30-item checklist from 12 months out to post-event.", "Show PlanGate badges — features clearly labeled by tier."], route: "/dashboard" },
  { num: 4, title: "Build Your Custom Tournament Website", minutes: 4, icon: Globe, hero: "Drag-and-drop your branded site in minutes – fully mobile responsive.", keyMessage: null, bullets: ["Show the 3 templates: Classic Green, Modern Navy, Charity Warmth.", '"Pick a template, upload your logo, set your colors — publish with one click."', "Preview the public site — show mobile-responsive design.", "Mention 8 built-in pages: Home, Contests, Registration, Photos, Location, Agenda, Donation, Contact.", "Call out custom domain support for Starter+ plans."], route: "/dashboard/tournaments" },
  { num: 5, title: "Registration, Payments & Fees", minutes: 5, icon: CreditCard, hero: "5% TeeVents platform fee + Stripe fee shown clearly • Default = passed to players so you keep 100% of advertised price • Toggle to absorb fees if you want.", keyMessage: "$150 registration example → Golfer pays $162.15 (fees passed) or Organizer nets $142.50 (fees absorbed).", bullets: ["Show Registration page with tiers, group sizes, and checkout breakdown.", "Walk through the fee breakdown: Base Price → 5% TeeVents Fee → Stripe Fee → Total.", '"You keep 100% of your advertised price by default."', "Show the toggle in Settings to absorb fees instead.", "Mention promo codes, group registration (up to 4 players), and waitlist."], route: "/dashboard/registration" },
  { num: 6, title: "Live Scoring, Pairings & Check-In", minutes: 5, icon: Trophy, hero: "Real-time mobile scoring, drag-and-drop pairings, instant leaderboards.", keyMessage: null, bullets: ["Show the admin leaderboard — real-time scores, group-by-group.", "Navigate to Printables → Scorecards tab — show QR codes.", '"Players scan this code with their phone — no app download, no login."', "Explain: Scan → phone opens scoring page → enter scores → leaderboard updates live.", "Show Tee Sheet with shotgun/sequential start options.", "Show QR Check-In: print badges, open Scan Station on any tablet."], route: "/dashboard/leaderboard" },
  { num: 7, title: "Budget, Sponsors, Auctions & Payouts", minutes: 5, icon: DollarSign, hero: "Real-time budget tracking • Payments split automatically at checkout • TeeVents never holds your money • Funds go directly to your Stripe account.", keyMessage: null, bullets: ["Show sponsor tiers: Title, Gold, Silver, Bronze — logos auto-display on tournament site.", "Show budget tracking: income vs. expenses by category, paid/unpaid status.", "Show Finances page — emphasize automatic payment splitting.", "Show Auction page — silent auction, raffle, buy-now items.", '"Your money goes directly to your Stripe account. We never touch it."'], route: "/dashboard/budget" },
  { num: 8, title: "Pricing & Upgrade Options", minutes: 2, icon: Tag, hero: "Start for $0 • Upgrade only when you need unlimited players or white-glove service.", keyMessage: "Base ($0, 72 players) → Starter ($299, unlimited) → Premium ($999, white-glove + reduced reserve)", bullets: ["Show the 3-tier comparison: Base $0 / Starter $299 / Premium $999.", 'Base highlight: 1 tournament, 72 players max, all core features.', '"Unlimited tournaments and players + custom domain."', '"White-glove consulting, 10% reserve, faster payouts."', "All plans: 5% platform fee per transaction."], route: "/dashboard/upgrade" },
  { num: 9, title: "Q&A & Next Steps", minutes: 3, icon: HelpCircle, hero: "What questions do you have? Let's get your tournament set up today.", keyMessage: null, bullets: ['"What stood out to you? Which features would make the biggest difference?"', "Address any questions or concerns.", '"I can set up your tournament right now — takes just a few minutes."', "Share the sign-up link: teevents.golf/get-started", "If nonprofit: mention tax-deductible donation receipts and EIN verification.", "Follow up within 24 hours with a recap email."], route: null },
];


// ── Flyer Templates ──
const FLYER_TEMPLATES = [
  { id: "eventbrite", title: "Eventbrite isn't built for golf", headline: "Eventbrite isn't built for golf", items: ["✖️ No live leaderboard", "✖️ No hole sponsors", "✖️ No volunteer check-in", "✖️ No automatic payout holds"], cta: "Start free trial →" },
  { id: "cash-app", title: "Still collecting fees via Cash App?", headline: "Still collecting fees via Cash App?", items: ["✖️ No receipts for players", "✖️ No financial dashboard", "✖️ No automatic tax reporting", "✖️ No chargeback protection"], cta: "Switch to TeeVents →" },
  { id: "spreadsheets", title: "Your spreadsheet can't do this", headline: "Your spreadsheet can't do this", items: ["✅ Branded tournament website", "✅ Online registration & payment", "✅ Live leaderboard & scoring", "✅ Automated payouts"], cta: "Try it free →" },
  { id: "40-carts", title: "40+ carts. 144 golfers. One platform.", headline: "40+ carts. 144 golfers. One platform.", items: ["✅ Registration & payments", "✅ QR check-in & pairings", "✅ Live scoring & leaderboard", "✅ Sponsors & volunteers"], cta: "Learn more →" },
  { id: "nonprofit", title: "Raise more. Spend less time planning.", headline: "Raise more. Spend less time planning.", items: ["✅ 501(c)(3) donation receipts", "✅ Sponsor management", "✅ Budget tracking", "✅ Automated payouts"], cta: "Start fundraising →" },
  { id: "fees", title: "5% platform fee per transaction", headline: "5% platform fee per transaction", items: ["✅ Simple percentage", "✅ No setup fees", "✅ No hidden costs", "✅ 2.9% + $0.30 Stripe fee separate"], cta: "See pricing →" },
  { id: "mobile", title: "Your golfers' phones are the scorecards", headline: "Your golfers' phones are the scorecards", items: ["📱 Scan QR code", "📱 Enter scores on mobile", "📱 Live leaderboard updates", "📱 No app download required"], cta: "See it in action →" },
  { id: "checkin", title: "Check in 144 golfers in 20 minutes", headline: "Check in 144 golfers in 20 minutes", items: ["✅ QR code scanning", "✅ Name badge printing", "✅ Cart sign assignments", "✅ Real-time headcount"], cta: "Try TeeVents →" },
  { id: "payout", title: "Get paid automatically", headline: "Get paid automatically. Every 2 weeks.", items: ["💰 Bi-weekly direct deposits", "💰 15% reserve for chargebacks", "💰 Complete financial dashboard", "💰 1099-K tax reporting"], cta: "Connect your bank →" },
  { id: "compare", title: "TeeVents vs. the old way", headline: "TeeVents vs. the old way", items: ["Old: Spreadsheets → New: Dashboard", "Old: Venmo → New: Stripe", "Old: Paper scorecards → New: Mobile", "Old: Manual payouts → New: Automatic"], cta: "Upgrade your game →" },
];

// ── Study Sheet Sections ──
const studySections = [
  { id: "overview", label: "Platform Overview", icon: BookOpen },
  { id: "organizer", label: "Organizer Features", icon: Users },
  { id: "golfer", label: "Golfer Experience", icon: Zap },
  { id: "payments", label: "Payment & Money Flow", icon: CreditCard },
  { id: "technical", label: "Technical Architecture", icon: FileText },
  { id: "security", label: "Security & Compliance", icon: Shield },
  { id: "support", label: "Support & Resources", icon: HelpCircle },
  { id: "metrics", label: "Key Metrics & Limits", icon: BarChart3 },
  { id: "glossary", label: "Glossary", icon: BookOpen },
];

// ── Shared Components ──
const SectionHeader = ({ num, title }: { num: number; title: string }) => (
  <h2 className="text-xl font-display font-bold text-foreground border-b border-border pb-2 mb-4">{num}. {title}</h2>
);
const FeatureBlock = ({ title, items }: { title: string; items: string[] }) => (
  <div><h3 className="font-semibold text-foreground mb-2">{title}</h3><ul className="list-disc list-inside space-y-1 ml-2">{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
);
const SimpleTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{headers.map((h, i) => <th key={i} className="text-left p-2 bg-muted/50 border border-border font-medium text-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="p-2 border border-border">{cell}</td>)}</tr>)}</tbody></table></div>
);

// ── Email Template Component ──
function EmailTemplate() {
  const [copied, setCopied] = useState(false);
  const [meetingLink, setMeetingLink] = useState("https://calendly.com/teevents-golf/demo");
  const template = `Subject: Your TeeVents Demo Agenda – [Date]\n\nHi [Name],\n\nThanks for scheduling your TeeVents demo! I'm excited to show you how we help tournament organizers streamline registration, payments, and payouts.\n\nHere's our agenda for the 30-minute call:\n\n✅ Platform Overview (5 min)\n✅ Tournament Setup (10 min)\n✅ Payment Flow & Fees (10 min)\n✅ Organizer Payouts (10 min)\n✅ Q&A (5-10 min)\n\nView the full agenda with screenshots here:\n${window.location.origin}/sales/demo-agenda\n\nBook your demo: ${meetingLink}\n\nTo make the most of our time, please:\n• Come with your tournament details (name, date, expected players)\n• Think about your current pain points with registration/payments\n\nSee you soon!\n\nBest,\n[Your Name]\nTeeVents Golf\ninfo@teevents.golf`;
  const handleCopy = () => { navigator.clipboard.writeText(template); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Template for Prospects</CardTitle><CardDescription>Copy and send to prospects before the demo</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div><label className="text-sm font-medium">Meeting Booking Link</label><Input value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://calendly.com/..." /></div>
        <Textarea value={template} readOnly rows={20} className="font-mono text-xs" />
        <Button onClick={handleCopy} className="w-full">{copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Email Template</>}</Button>
      </CardContent>
    </Card>
  );
}

// ── Demo Tab ──
function DemoTab() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [openAccordion, setOpenAccordion] = useState<string>("step-0");

  const goTo = useCallback((idx: number) => { setCurrentStep(idx); setOpenAccordion(`step-${idx}`); }, []);
  const next = () => { if (currentStep < STEPS.length - 1) goTo(currentStep + 1); };
  const prev = () => { if (currentStep > 0) goTo(currentStep - 1); };
  const step = STEPS[currentStep];

  return (
    <div className="space-y-8">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => goTo(i)} className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${i === currentStep ? "bg-primary text-primary-foreground" : i < currentStep ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{s.num}</button>
        ))}
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><step.icon className="h-6 w-6 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground font-mono">Step {step.num} of {STEPS.length} • {step.minutes} min</p><h2 className="text-xl font-bold text-foreground">{step.title}</h2></div>
          </div>
          <p className="text-base text-foreground/90 leading-relaxed">{step.hero}</p>
          {step.keyMessage && <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 text-sm text-foreground/80"><strong>Key message:</strong> {step.keyMessage}</div>}
          <ul className="space-y-2 pt-2">{step.bullets.map((b, j) => <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" /><span>{b}</span></li>)}</ul>
          <div className="flex items-center gap-3 pt-4 flex-wrap">
            <Button variant="outline" onClick={prev} disabled={currentStep === 0}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
            <Button onClick={next} disabled={currentStep === STEPS.length - 1}>Next Step <ChevronRight className="h-4 w-4 ml-1" /></Button>
            {step.route && <Button variant="secondary" onClick={() => navigate(step.route!)}><ExternalLink className="h-4 w-4 mr-1" /> Open in App</Button>}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Full Agenda</h3>
        <Accordion type="single" collapsible value={openAccordion} onValueChange={setOpenAccordion}>
          {STEPS.map((s, i) => (
            <AccordionItem key={i} value={`step-${i}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === currentStep ? "bg-primary text-primary-foreground" : i < currentStep ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{s.num}</span>
                  <span className="font-medium">{s.title}</span>
                  <Badge variant="outline" className="text-xs font-mono ml-auto mr-2">{s.minutes} min</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-10 space-y-2">
                <p className="text-foreground/90">{s.hero}</p>
                {s.keyMessage && <p className="text-sm text-muted-foreground italic">{s.keyMessage}</p>}
                <ul className="space-y-1">{s.bullets.map((b, j) => <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span>{b}</span></li>)}</ul>
                {s.route && <Button size="sm" variant="link" onClick={() => navigate(s.route!)} className="px-0">Open {s.title} →</Button>}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Reference — Fee & Reserve FAQ</h3>
        <Accordion type="multiple">
          <AccordionItem value="fee"><AccordionTrigger>What is the 5% TeeVents platform fee?</AccordionTrigger><AccordionContent>TeeVents charges a 5% platform fee on every transaction. This is separate from Stripe's processing fee (~2.9% + $0.30). By default, fees are passed to participants so organizers keep 100% of their advertised price.</AccordionContent></AccordionItem>
          <AccordionItem value="reserve"><AccordionTrigger>What is the 15% reserve?</AccordionTrigger><AccordionContent>TeeVents holds 15% of net proceeds as a reserve for refunds and chargebacks. This reserve is automatically released 15 days after your event ends. Premium plan customers receive a reduced 10% reserve rate.</AccordionContent></AccordionItem>
          <AccordionItem value="payouts"><AccordionTrigger>When do organizers get paid?</AccordionTrigger><AccordionContent>Payouts are processed automatically every two weeks. The net amount is deposited directly into the organizer's connected bank account.</AccordionContent></AccordionItem>
        </Accordion>
      </div>

      <EmailTemplate />
    </div>
  );
}

// ── Study Sheet Tab ──
function StudySheetTab() {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!contentRef.current) return;
    try { await navigator.clipboard.writeText(contentRef.current.innerText); setCopied(true); toast.success("Copied to clipboard"); setTimeout(() => setCopied(false), 2000); } catch { toast.error("Copy failed"); }
  };

  const handleDownloadPdf = () => {
    downloadHtmlAsPdf("TeeVents Platform Study Sheet", `
      <style>body{font-family:'Georgia',serif;color:#1a1a1a;max-width:800px;margin:0 auto}h1{font-size:28px;color:#1a5c38;border-bottom:3px solid #1a5c38;padding-bottom:8px}h2{font-size:20px;color:#1a5c38;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:16px;color:#333;margin-top:20px}p,li{font-size:13px;line-height:1.7}ul{padding-left:20px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f0f7f3;color:#1a5c38;font-weight:600}.page-break{page-break-before:always}</style>
      <h1>🏌️ TeeVents — Platform Study Sheet</h1>
      <p style="color:#666;font-size:12px;">Internal Training & Reference Guide · Last Updated: ${new Date().toLocaleDateString()}</p>
      <h2>1. Platform Overview</h2><p>TeeVents is an all-in-one golf tournament management platform.</p>
      <h2>2. Organizer Features</h2><p>Tournament creation, registration, payments, volunteers, sponsors, leaderboard, auction, and more.</p>
      <h2>3. Golfer Experience</h2><p>Registration → QR check-in → Mobile scoring → Leaderboard</p>
      <h2>4. Payment Flow</h2><p>Golfer pays → Stripe processes → 5% platform fee → 15% hold → Available balance → Bi-weekly payout</p>
      <h2>5. Technical Stack</h2><p>React + TypeScript + Supabase + Stripe Connect + Resend + Twilio</p>
      <h2>6. Security</h2><p>PCI via Stripe, RLS policies, JWT auth, audit logging, 1099-K reporting</p>
      <h2>7. Support</h2><p>Help Center at /help, Email: info@teevents.golf</p>
      <h2>8. Limits</h2><p>5% platform fee, 15% hold, $25 min payout, bi-weekly payouts, Base/Starter/Premium plans</p>
      <h2>9. Glossary</h2><p>Chargeback, Hold, Platform Fee, Stripe Connect, Express Account, RLS, Edge Function, Cron Job</p>
      <p style="text-align:center;margin-top:40px;color:#999;font-size:11px;">© ${new Date().getFullYear()} TeeVents Golf. Confidential.</p>
    `);
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <Button onClick={handleCopy} variant="outline" className="gap-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied!" : "Copy to Clipboard"}</Button>
        <Button onClick={handleDownloadPdf} className="gap-2"><Download className="h-4 w-4" /> Download PDF</Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-semibold text-lg mb-3">Table of Contents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {studySections.map((s, i) => <a key={s.id} href={`#study-${s.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-1"><s.icon className="h-4 w-4" /><span>{i + 1}. {s.label}</span></a>)}
        </div>
      </div>

      <div ref={contentRef} className="space-y-10">
        <section id="study-overview">
          <SectionHeader num={1} title="Platform Overview" />
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div><h3 className="font-semibold text-foreground mb-1">What is TeeVents?</h3><p>All-in-one golf tournament management platform handling registration, payments, communications, and day-of logistics.</p></div>
            <div><h3 className="font-semibold text-foreground mb-1">Who is it for?</h3><ul className="list-disc list-inside space-y-1 ml-2"><li><strong>Nonprofits</strong> — Fundraising tournaments</li><li><strong>Corporate Planners</strong> — Company outings</li><li><strong>Golf Clubs</strong> — Member events</li><li><strong>Independent Organizers</strong> — Anyone running a tournament</li></ul></div>
          </div>
        </section>

        <section id="study-organizer">
          <SectionHeader num={2} title="Tournament Organizer Features" />
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <FeatureBlock title="2.1 Tournament Creation" items={["Set registration fee ($1–$10,000)", "Choose fee model: Pass to Golfer or Absorb Fees", "Set event date, location, max players", "Publish/unpublish, customize site"]} />
            <FeatureBlock title="2.2 Registration" items={["Real-time registrations", "Edit player details, manual registration", "CSV export, bulk emails, promo codes, waitlist"]} />
            <FeatureBlock title="2.3 Finances" items={["Balance cards, transaction history, payout history", "CSV exports: transactions, payouts, summary, tax"]} />
            <div><h3 className="font-semibold text-foreground mb-2">2.4 Payout Methods</h3><SimpleTable headers={["Feature", "Stripe Connect", "PayPal"]} rows={[["Setup", "2-3 min", "1 min"], ["Speed", "1-3 days", "5-7 days"], ["Auto payouts", "✅ Bi-weekly", "❌ Manual"], ["Min withdrawal", "$25", "$25"]]} /></div>
            <FeatureBlock title="2.5 More Features" items={["Volunteers, Sponsors, Leaderboard, Auction/Raffle", "Printables, Photo Gallery, Surveys, Budget, Donations", "Planning Checklist, Site Builder, Custom Domains"]} />
          </div>
        </section>

        <section id="study-golfer">
          <SectionHeader num={3} title="Golfer Experience" />
          <div className="space-y-4 text-sm text-muted-foreground">
            <div><h3 className="font-semibold text-foreground mb-2">Registration Flow</h3><ol className="list-decimal list-inside space-y-1 ml-2"><li>Visit tournament URL</li><li>Enter player details</li><li>Group registration (up to 4)</li><li>Checkout with Stripe</li><li>Receive confirmation email with QR code</li></ol></div>
            <FeatureBlock title="Day-of & Post-Event" items={["QR check-in, live scoring, leaderboard", "Survey, photo gallery, final results"]} />
          </div>
        </section>

        <section id="study-payments">
          <SectionHeader num={4} title="Payment & Money Flow" />
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono">Golfer pays → Stripe → 5% platform fee → 15% hold → Available balance → Bi-weekly payout</div>
            <SimpleTable headers={["Model", "Golfer Pays", "Organizer Gets", "Best For"]} rows={[["Pass to Golfer", "$100 + ~$8.20", "$100 (minus hold)", "Premium events"], ["Absorb Fees", "$100", "~$91.80 (minus hold)", "Nonprofits"]]} />
            <FeatureBlock title="Hold & Chargeback Protection" items={["15% held for 15 days post-event", "Organizer never pays out of pocket", "Chargebacks are rare (<0.5%)"]} />
          </div>
        </section>

        <section id="study-technical">
          <SectionHeader num={5} title="Technical Architecture" />
          <SimpleTable headers={["Layer", "Technology"]} rows={[["Frontend", "React, TypeScript, Tailwind, shadcn/ui"], ["Backend", "Supabase (PostgreSQL, Auth, Storage)"], ["Payments", "Stripe Connect"], ["Emails", "Resend"], ["SMS", "Twilio"], ["Hosting", "Lovable Cloud"]]} />
        </section>

        <section id="study-security">
          <SectionHeader num={6} title="Security & Compliance" />
          <ul className="list-disc list-inside space-y-2 ml-2 text-sm text-muted-foreground">
            <li><strong>PCI:</strong> Stripe handles all card data</li><li><strong>Encryption:</strong> TLS 1.2+, data at rest</li>
            <li><strong>Auth:</strong> JWT + RLS policies</li><li><strong>Audit:</strong> All payout changes logged</li>
            <li><strong>Tax:</strong> 1099-K via Stripe for &gt;$600/yr</li>
          </ul>
        </section>

        <section id="study-support">
          <SectionHeader num={7} title="Support & Resources" />
          <SimpleTable headers={["Resource", "Location"]} rows={[["Help Center", "/help (7 articles)"], ["Email", "info@teevents.golf"], ["How It Works", "/how-it-works"], ["Pricing", "/pricing"], ["FAQ", "/faq"]]} />
        </section>

        <section id="study-metrics">
          <SectionHeader num={8} title="Key Metrics & Limits" />
          <SimpleTable headers={["Metric", "Value"]} rows={[["Platform fee", "5%"], ["Hold", "15%"], ["Hold release", "15 days post-event"], ["Min payout", "$25"], ["Payout freq", "Bi-weekly"], ["Base plan", "$0, 1 tournament, 72 players"], ["Starter", "$299, unlimited"], ["Premium", "$999, white-glove"]]} />
        </section>

        <section id="study-glossary">
          <SectionHeader num={9} title="Glossary" />
          <SimpleTable headers={["Term", "Definition"]} rows={[["Chargeback", "Cardholder disputes a charge"], ["Hold", "15% set aside for 15 days"], ["Platform Fee", "5% on all registrations"], ["Stripe Connect", "Marketplace payment platform"], ["RLS", "Row Level Security"], ["Edge Function", "Serverless backend function"], ["Cron Job", "Scheduled automated task"]]} />
        </section>
      </div>
    </div>
  );
}

// ── Flyer Studio Tab ──
function FlyerStudioTab() {
  const [editingFlyer, setEditingFlyer] = useState<string | null>(null);
  const [editedHeadline, setEditedHeadline] = useState("");
  const [editedItems, setEditedItems] = useState<string[]>([]);
  const [editedCta, setEditedCta] = useState("");

  const startEdit = (flyer: typeof FLYER_TEMPLATES[0]) => {
    setEditingFlyer(flyer.id);
    setEditedHeadline(flyer.headline);
    setEditedItems([...flyer.items]);
    setEditedCta(flyer.cta);
  };

  const downloadFlyer = (flyer: typeof FLYER_TEMPLATES[0]) => {
    const headline = editingFlyer === flyer.id ? editedHeadline : flyer.headline;
    const items = editingFlyer === flyer.id ? editedItems : flyer.items;
    const cta = editingFlyer === flyer.id ? editedCta : flyer.cta;

    const html = `
      <div style="width:1080px;height:1080px;background-color:#1a5c38;font-family:'Inter',sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:60px;">
        <div style="position:absolute;top:40px;left:40px;color:white;font-size:20px;font-weight:700;">TeeVents</div>
        <h1 style="color:white;font-size:52px;font-weight:800;line-height:1.2;margin-bottom:40px;">${headline}</h1>
        <ul style="color:white;font-size:28px;list-style:none;padding:0;margin:0;">
          ${items.map(i => `<li style="margin-bottom:16px;">${i}</li>`).join("")}
        </ul>
        <div style="background-color:#c8a84e;padding:16px 32px;border-radius:50px;display:inline-block;margin-top:50px;width:fit-content;">
          <span style="color:#1a5c38;font-weight:700;font-size:24px;">${cta}</span>
        </div>
        <div style="position:absolute;bottom:30px;left:40px;color:rgba(255,255,255,0.5);font-size:16px;">TeeVents.golf</div>
      </div>
    `;

    downloadHtmlAsPdf(`TeeVents-Flyer-${flyer.id}`, `<style>body{margin:0;padding:0;}</style>${html}`);
    toast.success(`Flyer "${flyer.title}" downloaded`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sales Flyers</h3>
          <p className="text-sm text-muted-foreground">10 ready-to-use flyer templates. Click Edit to customize, then Download.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FLYER_TEMPLATES.map((flyer) => (
          <Card key={flyer.id} className="overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground min-h-[200px] flex flex-col justify-center">
              {editingFlyer === flyer.id ? (
                <div className="space-y-2">
                  <Input value={editedHeadline} onChange={e => setEditedHeadline(e.target.value)} className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 text-lg font-bold" />
                  {editedItems.map((item, i) => (
                    <Input key={i} value={item} onChange={e => { const n = [...editedItems]; n[i] = e.target.value; setEditedItems(n); }} className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 text-sm" />
                  ))}
                  <Input value={editedCta} onChange={e => setEditedCta(e.target.value)} className="bg-secondary/80 border-secondary text-secondary-foreground font-bold text-sm" />
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold mb-3">{flyer.headline}</h3>
                  <ul className="space-y-1 text-sm opacity-90">{flyer.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  <div className="mt-4"><Badge className="bg-secondary text-secondary-foreground">{flyer.cta}</Badge></div>
                </>
              )}
            </div>
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{flyer.title}</p>
              <div className="flex gap-2">
                {editingFlyer === flyer.id ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingFlyer(null)}>Done</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => startEdit(flyer)}><Edit className="h-4 w-4" /></Button>
                )}
                <Button size="sm" variant="outline" onClick={() => downloadFlyer(flyer)}><Download className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Eventbrite Comparison Script Tab ──
function EventbriteScriptTab() {
  const [copied, setCopied] = useState(false);
  const script = `EVENTBRITE VS. TEEVENTS — SALES SCRIPT

OPENING (30 seconds)
"Are you currently using Eventbrite for your golf tournament? I hear this a lot — Eventbrite is great for concerts and conferences, but it wasn't designed for golf. Let me show you why organizers are switching to TeeVents."

KEY DIFFERENTIATOR #1: GOLF-SPECIFIC FEATURES (45 seconds)
"With Eventbrite, you don't get live leaderboards, hole sponsor management, or volunteer check-in. With TeeVents, all of that is built in. Your golfers scan a QR code to enter scores, your sponsors get a branded portal, and your volunteers check in with their phone."

KEY DIFFERENTIATOR #2: PRICING TRANSPARENCY (45 seconds)
"Let's talk fees. On a $100 registration, Eventbrite charges about $8.49 — that's 3.5% + $1.79 platform fee PLUS 2.9% + $0.30 processing fee. TeeVents charges a 5% platform fee plus Stripe's standard 2.9% + $0.30 — that's $8.20 total. Similar cost on $100, but on higher registrations we stay competitive. Plus you get live leaderboards, sponsor management, and automatic payouts that Eventbrite simply doesn't offer."

KEY DIFFERENTIATOR #3: PAYOUT SPEED (30 seconds)
"With Eventbrite, you wait until after your event to get paid. With TeeVents, you receive automatic bi-weekly payouts. We hold 15% for 15 days as chargeback protection, then release it automatically."

HANDLING OBJECTIONS

"Eventbrite has a built-in audience."
→ "That's true for concerts and meetups. But golf tournament players don't browse Eventbrite looking for tournaments. They find you through your club, charity, or social media. TeeVents gives you a branded website you can share directly."

"I'm already using Eventbrite."
→ "I understand. The good news is you can run your next tournament on TeeVents side-by-side and compare. Start with our free Base plan — no commitment, no credit card. Most organizers switch after seeing the leaderboard and fee savings."

CLOSING (30 seconds)
"I can set you up in under 60 seconds. Would you like to start with the free plan today, or would you prefer to book a 25-minute demo so I can walk you through everything?"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success("Script copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Eventbrite vs. TeeVents — Sales Script</CardTitle>
          <CardDescription>Use during calls when a prospect mentions Eventbrite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={script} readOnly rows={30} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="gap-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied!" : "Copy Script"}</Button>
            <Button variant="outline" onClick={() => window.open("/compare/eventbrite-vs-teevents", "_blank")} className="gap-2"><ExternalLink className="h-4 w-4" /> View Comparison Page</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── PDF Library Tab ──
const PDF_ASSETS = [
  { id: "comparison", name: "Eventbrite vs. TeeVents Comparison", description: "One-page side-by-side comparison chart", route: "/compare/eventbrite-vs-teevents/pdf" },
  { id: "study-sheet", name: "TeeVents Platform Study Sheet", description: "Complete platform documentation for internal training", route: null },
  { id: "pricing-guide", name: "TeeVents Pricing Guide", description: "Pricing tiers, fee breakdown, and fee model explanation", route: null },
  { id: "demo-agenda", name: "TeeVents Demo Agenda", description: "Sales call agenda with screenshots and talking points", route: "/sales/demo-agenda" },
  { id: "organizer-onboarding", name: "Organizer Onboarding Guide", description: "Step-by-step setup guide for new tournament organizers", route: null },
];

function PdfLibraryTab() {
  const handleDownloadPdf = (asset: typeof PDF_ASSETS[0]) => {
    if (asset.route) {
      window.open(asset.route, "_blank");
    } else {
      toast.info(`"${asset.name}" — PDF generation coming soon`);
    }
  };

  const handleCopyLink = (asset: typeof PDF_ASSETS[0]) => {
    const url = asset.route ? `${window.location.origin}${asset.route}` : `${window.location.origin}/admin`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">PDF Library</h3>
          <p className="text-sm text-muted-foreground">{PDF_ASSETS.length} sales PDFs available for download and sharing</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PDF_ASSETS.map((asset) => (
          <Card key={asset.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">{asset.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{asset.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(asset)} className="gap-1.5">
                      <Download className="h-3 w-3" /> Download
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleCopyLink(asset)} className="gap-1.5">
                      <Copy className="h-3 w-3" /> Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Email Templates Library Tab ──
const EMAIL_TEMPLATES = [
  {
    id: "comparison-cold",
    name: "Eventbrite Comparison Cold Email",
    subject: "Eventbrite vs. TeeVents – Which one saves you money?",
    body: `Hi [Name],\n\nI noticed you're using Eventbrite for your upcoming golf tournament. While Eventbrite is great for general events, golf tournaments have unique needs that Eventbrite simply doesn't address.\n\nHere's a quick comparison:\n\n• Live Leaderboard: Eventbrite ❌ | TeeVents ✅\n• Hole Sponsor Management: Eventbrite ❌ | TeeVents ✅\n• Fees on $100 registration: Eventbrite ~$8.49 | TeeVents $8.20\n• Payouts: Eventbrite waits until after event | TeeVents bi-weekly\n\nWould you be open to a quick 15-minute call to see if TeeVents could save you time and money?\n\nBook a time here: https://calendly.com/teevents-golf/demo\n\nBest,\nRod Jackson\nTeeVents Golf\ninfo@teevents.golf`,
  },
  {
    id: "fee-breakdown",
    name: "Fee Breakdown Follow-up",
    subject: "Where your registration fees are actually going",
    body: `Hi [Name],\n\nI wanted to follow up with a quick breakdown of what happens to your registration fees:\n\nOn a $100 registration:\n• TeeVents platform fee: 5% = $5.00\n• Stripe processing: 2.9% + $0.30 = $3.20\n• Total fees: $8.20\n• You keep: $91.80 (with option to pass fees to golfers)\n\nCompare that to Eventbrite:\n• Platform fee: 3.5% + $1.79 = $5.29\n• Processing: 2.9% + $0.30 = $3.20\n• Total fees: $8.49\n\nPlus, TeeVents includes live leaderboards, sponsor management, and QR check-in — features you'd need separate tools for with Eventbrite.\n\nWant to see it in action? Book a demo: https://calendly.com/teevents-golf/demo\n\nBest,\nRod Jackson\nTeeVents Golf`,
  },
  {
    id: "feature-gap",
    name: "Feature Gap Email",
    subject: "3 features Eventbrite doesn't have for golf tournaments",
    body: `Hi [Name],\n\nRunning a golf tournament on Eventbrite? Here are 3 things you're missing:\n\n1. Live Leaderboard — Players scan a QR code to enter scores. Leaderboard updates in real-time.\n\n2. Sponsor Portal — Upload logos, assign hole sponsorships, track deliverables. Your sponsors get professional treatment.\n\n3. Automatic Payouts — Get paid every two weeks. No waiting until after the event.\n\nThese aren't add-ons or integrations — they're built into TeeVents from day one.\n\nCurious? Take a look: https://teevents.golf/compare/eventbrite-vs-teevents\n\nOr book a demo: https://calendly.com/teevents-golf/demo\n\nBest,\nRod Jackson\nTeeVents Golf`,
  },
  {
    id: "onboarding-welcome",
    name: "Onboarding Welcome",
    subject: "Welcome to TeeVents – Here's what to do next",
    body: `Hi [Name],\n\nWelcome to TeeVents! I'm excited to help you run your best tournament yet.\n\nHere are your next steps:\n\n1. Log in at teevents.golf/login\n2. Create your first tournament\n3. Set your registration fee and customize your site\n4. Share your tournament link with golfers\n\nNeed help? Reply to this email or call (602) 413-1338.\n\nHere are some helpful resources:\n• How It Works: teevents.golf/how-it-works\n• Help Center: teevents.golf/help\n• FAQ: teevents.golf/faq\n\nLet's make your tournament a success!\n\nBest,\nRod Jackson\nTeeVents Golf\ninfo@teevents.golf`,
  },
  {
    id: "demo-followup",
    name: "Demo Follow-up",
    subject: "Thanks for your demo – Here's what's next",
    body: `Hi [Name],\n\nThanks for taking the time to see TeeVents in action today! I hope you can see how it would simplify your tournament management.\n\nHere's a recap of what we covered:\n• Tournament setup and branding\n• Registration and payment flow\n• Live leaderboard and scoring\n• Sponsor and volunteer management\n• Fee structure and payouts\n\nReady to get started? Sign up here: teevents.golf/get-started\n\nWant to compare with Eventbrite? teevents.golf/compare/eventbrite-vs-teevents\n\nI'm here to help with setup — just reply to this email.\n\nBest,\nRod Jackson\nTeeVents Golf\ninfo@teevents.golf`,
  },
];

function EmailTemplatesTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (template: typeof EMAIL_TEMPLATES[0]) => {
    const text = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(text);
    setCopiedId(template.id);
    toast.success("Email template copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTest = (template: typeof EMAIL_TEMPLATES[0]) => {
    const mailto = `mailto:?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    window.open(mailto);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Email Templates</h3>
        <p className="text-sm text-muted-foreground">{EMAIL_TEMPLATES.length} ready-to-send email templates for sales outreach</p>
      </div>
      <div className="space-y-4">
        {EMAIL_TEMPLATES.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> {template.name}</CardTitle>
              <CardDescription>Subject: {template.subject}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={template.body} readOnly rows={8} className="font-mono text-xs" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleCopy(template)} className="gap-1.5">
                  {copiedId === template.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedId === template.id ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleSendTest(template)} className="gap-1.5">
                  <Mail className="h-3 w-3" /> Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Links & QR Codes Tab ──
const SALES_LINKS = [
  { name: "Comparison Page", url: "/compare/eventbrite-vs-teevents", useCase: "Share in emails & social" },
  { name: "Get Started", url: "/get-started", useCase: "Direct signups" },
  { name: "Demo Calendly", url: "https://calendly.com/teevents-golf/demo", useCase: "Booking link", external: true },
  { name: "Sample Organizer", url: "/sample-organizer", useCase: "Share with prospects (noindex)" },
  { name: "Pricing Page", url: "/pricing", useCase: "Fee explanation" },
  { name: "How It Works", url: "/how-it-works", useCase: "Platform overview" },
  { name: "Help Center", url: "/help", useCase: "Support resources" },
  { name: "Demo Agenda", url: "/sales/demo-agenda", useCase: "Pre-call prep" },
];

function LinksQrTab() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const getFullUrl = (link: typeof SALES_LINKS[0]) => {
    if (link.external) return link.url;
    return `https://teevents.golf${link.url}`;
  };

  const handleCopy = (link: typeof SALES_LINKS[0], idx: number) => {
    navigator.clipboard.writeText(getFullUrl(link));
    setCopiedIdx(idx);
    toast.success("Link copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Links & QR Codes</h3>
        <p className="text-sm text-muted-foreground">Quick-copy links for sales emails, social media, and presentations</p>
      </div>
      <div className="grid gap-3">
        {SALES_LINKS.map((link, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{link.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{getFullUrl(link)}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{link.useCase}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => handleCopy(link, idx)} className="gap-1.5">
                  {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedIdx === idx ? "Copied!" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(link.external ? link.url : link.url, "_blank")} className="gap-1.5">
                  <ExternalLink className="h-3 w-3" /> Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Props for integration ──
interface AdminSalesHubProps {
  prospects: any[];
  activities: any[];
  outreachTemplates: any[];
  onRefresh: () => void;
  callAdminApi: (action: string, payload?: any) => Promise<any>;
  ProspectsComponent: React.ComponentType<any>;
  StatsComponent: React.ComponentType<any>;
  EmailScriptsComponent: React.ComponentType<any>;
  DemoScriptComponent: React.ComponentType<any>;
}

export default function AdminSalesHub({ prospects, activities, outreachTemplates, onRefresh, callAdminApi, ProspectsComponent, StatsComponent, EmailScriptsComponent, DemoScriptComponent }: AdminSalesHubProps) {

  return (
    <div className="space-y-6">
      <Tabs defaultValue="demo" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="demo" className="gap-2"><Play className="h-4 w-4" /> Live Demo</TabsTrigger>
          <TabsTrigger value="prospects" className="gap-2"><Users className="h-4 w-4" /> Prospects</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><BarChart3 className="h-4 w-4" /> Stats</TabsTrigger>
          <TabsTrigger value="email-scripts" className="gap-2"><Mail className="h-4 w-4" /> Outreach Scripts</TabsTrigger>
          <TabsTrigger value="email-templates" className="gap-2"><Mail className="h-4 w-4" /> Email Templates</TabsTrigger>
          <TabsTrigger value="demo-script" className="gap-2"><FileText className="h-4 w-4" /> Demo Script</TabsTrigger>
          <TabsTrigger value="eventbrite" className="gap-2"><Shield className="h-4 w-4" /> vs Eventbrite</TabsTrigger>
          <TabsTrigger value="study" className="gap-2"><BookOpen className="h-4 w-4" /> Study Sheet</TabsTrigger>
          <TabsTrigger value="flyers" className="gap-2"><Image className="h-4 w-4" /> Flyer Studio</TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-2"><FolderOpen className="h-4 w-4" /> PDF Library</TabsTrigger>
          <TabsTrigger value="links" className="gap-2"><Link2 className="h-4 w-4" /> Links & QR</TabsTrigger>
        </TabsList>
        <TabsContent value="demo"><DemoTab /></TabsContent>
        <TabsContent value="prospects">
          <ProspectsComponent prospects={prospects} activities={activities} outreachTemplates={outreachTemplates} onRefresh={onRefresh} callAdminApi={callAdminApi} />
        </TabsContent>
        <TabsContent value="stats">
          <StatsComponent prospects={prospects} activities={activities} callAdminApi={callAdminApi} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="email-scripts">
          <EmailScriptsComponent templates={outreachTemplates} callAdminApi={callAdminApi} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="email-templates"><EmailTemplatesTab /></TabsContent>
        <TabsContent value="demo-script"><DemoScriptComponent /></TabsContent>
        <TabsContent value="eventbrite"><EventbriteScriptTab /></TabsContent>
        <TabsContent value="study"><StudySheetTab /></TabsContent>
        <TabsContent value="flyers"><FlyerStudioTab /></TabsContent>
        <TabsContent value="pdfs"><PdfLibraryTab /></TabsContent>
        <TabsContent value="links"><LinksQrTab /></TabsContent>
      </Tabs>
    </div>
  );
}

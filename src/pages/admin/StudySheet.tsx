import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Copy, Check, ChevronRight, BookOpen, Shield, CreditCard, Users, Zap, HelpCircle, BarChart3, FileText, Trophy, Award, Search } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadHtmlAsPdf } from "@/components/printables/printUtils";

const sections = [
  { id: "overview", label: "Platform Overview", icon: BookOpen },
  { id: "organizer", label: "Organizer Features", icon: Users },
  { id: "golfer", label: "Golfer Experience", icon: Zap },
  { id: "payments", label: "Payment & Money Flow", icon: CreditCard },
  { id: "payouts", label: "Payout Methods", icon: BarChart3 },
  { id: "handicap", label: "Handicap System", icon: Trophy },
  { id: "course", label: "Course Details", icon: FileText },
  { id: "leaderboard", label: "Live Leaderboard & Scoring", icon: Trophy },
  { id: "sponsors", label: "Sponsor Management", icon: Award },
  { id: "team", label: "Team Management", icon: Users },
  { id: "search", label: "Public Tournament Search", icon: Search },
  { id: "technical", label: "Technical Architecture", icon: FileText },
  { id: "security", label: "Security & Compliance", icon: Shield },
  { id: "support", label: "Support & Resources", icon: HelpCircle },
  { id: "metrics", label: "Key Metrics & Limits", icon: BarChart3 },
  { id: "glossary", label: "Glossary", icon: BookOpen },
];

const StudySheet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin-login"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!data) { navigate("/"); return; }
      setLoading(false);
    };
    check();
  }, [navigate]);

  const handleCopy = async () => {
    if (!contentRef.current) return;
    try {
      await navigator.clipboard.writeText(contentRef.current.innerText);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  const handleDownloadPdf = () => {
    downloadHtmlAsPdf("TeeVents Platform Study Sheet — 2026 Edition", buildPdfHtml());
  };

  if (loading) {
    return <Layout><div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading study sheet…</div></div></Layout>;
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">📚 TeeVents Platform Study Sheet</h1>
            <p className="text-muted-foreground mt-1">2026 Edition · Complete reference for organizers, sales team, and support staff</p>
          </div>
          <div className="flex gap-2 self-start">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={handleDownloadPdf} className="gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Table of Contents */}
        <nav className="bg-muted/40 border border-border rounded-xl p-5 mb-10">
          <h2 className="font-semibold text-foreground mb-3">Table of Contents</h2>
          <ol className="grid sm:grid-cols-2 gap-y-1 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="h-3 w-3" />
                  <span>{i + 1}. {s.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div ref={contentRef} className="space-y-12">
          <Section id="overview" num={1} title="Platform Overview">
            <h3 className="font-semibold text-foreground">What is TeeVents?</h3>
            <p>All-in-one golf tournament management platform handling registration, payments, communications, live scoring, handicaps, and day-of logistics.</p>
            <h3 className="font-semibold text-foreground mt-4">Who is it for?</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Nonprofits</strong> — Fundraising tournaments with donation tracking, auctions, raffles</li>
              <li><strong>Corporate Planners</strong> — Company outings with branded websites and sponsor management</li>
              <li><strong>Golf Clubs</strong> — Member events with custom URLs and public search visibility</li>
              <li><strong>Independent Organizers</strong> — Anyone running a tournament from 10 to 500+ players</li>
            </ul>
            <p className="mt-3"><strong>Core Promise:</strong> Run your tournament like a pro — no spreadsheets, no manual payments, no stress.</p>
          </Section>

          <Section id="organizer" num={2} title="Tournament Organizer Features">
            <SubHeader>2.1 Tournament Creation</SubHeader>
            <SimpleTable headers={["Feature", "Description"]} rows={[
              ["Registration Fee", "Set any amount ($1–$10,000)"],
              ["Fee Model", "Pass to Golfer or Absorb Fees"],
              ["Event Details", "Date, location, max players, description"],
              ["Custom URL", "Editable /tournament/{custom-slug} (3 edits max, 301 redirects)"],
              ["Public Search", "Opt-in to appear on /tournaments/search"],
            ]} />
            <SubHeader>2.2 Registration Management</SubHeader>
            <SimpleTable headers={["Feature", "Description"]} rows={[
              ["Real-time registrations", "Live counter and player list"],
              ["Player details", "Edit name, email, handicap, shirt size, dietary needs"],
              ["Manual registration", "Add players offline"],
              ["CSV export", "Download full player list"],
              ["Group registration", "Foursomes (up to 4 players)"],
              ["Promo codes", "Discount codes for early bird, sponsors, etc."],
              ["Waitlist", "Auto-notify when spots open"],
            ]} />
            <SubHeader>2.3 Additional Features</SubHeader>
            <SimpleTable headers={["Feature", "Description"]} rows={[
              ["Volunteers", "Shift scheduling, QR check-in, automated reminders"],
              ["Auction & Raffle", "Silent auction, 50/50 raffle, auto-draw"],
              ["Add On Store", "Sell branded merchandise with Stripe checkout"],
              ["Donations", "Fundraising page with progress bar"],
              ["Flyer Studio", "Canva-integrated template gallery"],
              ["Director Shop", "Premium add-ons (consulting, signage, insurance)"],
              ["Printables", "Scorecards, cart signs, name badges, sponsor signs"],
              ["Photo Gallery", "Upload event photos to public site"],
              ["Surveys", "Post-event feedback with ratings and comments"],
              ["Planning Guide", "30-item checklist from 12 months out"],
              ["QR Check-in", "Scan QR codes on any tablet, manual search fallback"],
              ["Messages & Email Templates", "Email/SMS blasts, scheduled delivery"],
            ]} />
          </Section>

          <Section id="golfer" num={3} title="Golfer Experience">
            <SubHeader>Registration Flow</SubHeader>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Visit tournament URL (<code>/tournament/{"{slug}"}</code> or custom URL)</li>
              <li>Enter player details (name, email, handicap, shirt size, dietary needs)</li>
              <li>Group registration for foursomes</li>
              <li>Checkout with Stripe (credit card, Apple Pay, Google Pay, Cash App Pay)</li>
              <li>Receive confirmation email with QR code</li>
            </ol>
            <SubHeader>Day-of-Event</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>QR code check-in at registration desk</li>
              <li>View live leaderboard (gross/net)</li>
              <li>Enter scores using unique player code (scan QR on scorecard)</li>
            </ul>
            <SubHeader>Post-Event</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Post-event survey</li>
              <li>Photo gallery</li>
              <li>Final results and leaderboard</li>
            </ul>
          </Section>

          <Section id="payments" num={4} title="Payment & Money Flow">
            <p>Standard flow uses Stripe Connect destination charges. The 5% platform fee is split automatically at checkout — TeeVents never holds organizer funds.</p>
            <SimpleTable headers={["Step", "What Happens"]} rows={[
              ["1. Golfer registers", "Pays via Stripe Checkout (card, Apple Pay, Google Pay, Cash App Pay)"],
              ["2. Stripe processes", "Charges golfer's card; deducts 2.9% + $0.30 processing fee"],
              ["3. Funds split", "5% application fee → TeeVents; remainder → organizer's connected Stripe account"],
              ["4. Organizer payout", "Stripe pays organizer per their Stripe payout schedule (1-3 days)"],
            ]} />
            <p className="mt-3"><strong>Pass to Golfer (default):</strong> Golfer sees registration + 5% + Stripe fees as a single line item; organizer keeps 100% of advertised price.</p>
            <p><strong>Absorb Fees:</strong> Golfer pays only the registration fee; organizer receives the registration minus 5% and Stripe processing fees.</p>
          </Section>

          <Section id="payouts" num={5} title="Payout Methods">
            <SimpleTable headers={["Feature", "Stripe Connect", "PayPal", "Check"]} rows={[
              ["Setup Time", "2-3 min", "1 min", "Enter address"],
              ["Payout Speed", "1-3 days", "5-7 days", "Upon request"],
              ["Automatic", "✅ Bi-weekly", "❌ Manual", "❌ Manual"],
              ["Additional Fee", "None", "1% (min $0.50)", "None"],
              ["Default Method", "Recommended", "Backup", "Default (escrow)"],
            ]} />
            <p className="mt-3">New organizers default to <strong>Check</strong> until they configure a payout method. Funds are held in TeeVents escrow until payout is configured or manually requested.</p>
          </Section>

          <Section id="handicap" num={6} title="Handicap System">
            <SubHeader>USGA Course Handicap Formula</SubHeader>
            <p><code>Course Handicap = Index × (Slope ÷ 113) + (Course Rating − Par)</code></p>
            <p><code>Playing Handicap = Course Handicap × Allowance</code></p>
            <SubHeader>Default Allowances by Format</SubHeader>
            <SimpleTable headers={["Format", "Allowance"]} rows={[
              ["Individual Stroke Play", "95%"],
              ["Four-Ball (Best Ball)", "85% per player"],
              ["Scramble", "25-35% combined"],
              ["Match Play", "100%"],
            ]} />
            <SubHeader>Stroke Allocation (Dots/Pops)</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Strokes are allocated to holes based on Stroke Index (1=hardest)</li>
              <li>A player with Playing Handicap 12 receives one stroke on holes ranked 1-12</li>
              <li>Displayed as dots (●) on scorecards and scoring interface</li>
            </ul>
          </Section>

          <Section id="course" num={7} title="Course Details">
            <SubHeader>Required Fields</SubHeader>
            <SimpleTable headers={["Field", "Example", "Used For"]} rows={[
              ["Course Name", "Pebble Beach Golf Links", "Scorecards, public display"],
              ["Tee Set", "Blue Tees", "Different flights"],
              ["Par", "72", "Handicap formula, scorecards"],
              ["Course Rating", "72.5", "Handicap formula"],
              ["Slope Rating", "135", "Handicap formula"],
              ["Hole Pars (1-18)", "[4,5,3,4,4,4,5,3,4,…]", "Scorecards, scoring"],
              ["Stroke Indexes (1-18)", "[5,11,17,3,7,15,1,13,9,…]", "Stroke allocation"],
              ["Distances (optional)", "[380,520,180,…]", "Scorecards"],
            ]} />
            <SubHeader>Validation</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Par total must match sum of hole pars</li>
              <li>Stroke Indexes must include each number 1-18 exactly once</li>
              <li>Course Rating typically 60-80, Slope 55-155</li>
            </ul>
          </Section>

          <Section id="leaderboard" num={8} title="Live Leaderboard & Scoring">
            <SubHeader>Public Routes</SubHeader>
            <SimpleTable headers={["Route", "Purpose"]} rows={[
              ["/t/{slug}", "Public tournament page (info, registration, leaderboard tab)"],
              ["/live/{slug}", "Dedicated TV/display leaderboard (dark mode, large fonts, auto-refresh)"],
              ["/tournament/{custom-slug}", "Custom URL (if organizer sets one)"],
            ]} />
            <SubHeader>Leaderboard Features</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Real-time score updates (polling every 10 seconds or Supabase Realtime)</li>
              <li>Gross/Net toggle</li>
              <li>Sponsor logos (rotating banner or sidebar)</li>
              <li>Gallery slideshow (uploaded event photos)</li>
              <li>Fullscreen mode (<code>?display=1</code> hides navigation)</li>
            </ul>
            <SubHeader>Player Score Entry</SubHeader>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Player receives unique code at registration</li>
              <li>Scan QR code on scorecard → opens scoring page</li>
              <li>Enter gross scores hole-by-hole</li>
              <li>System calculates net score using handicap</li>
              <li>Leaderboard updates instantly</li>
            </ol>
            <SubHeader>Test Scoring Simulator</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Organizer can enable test mode to practice scoring before live event</li>
              <li>Add mock participants with handicaps</li>
              <li>Simulate scores and verify leaderboard behavior</li>
              <li>Real golfers never see test data</li>
            </ul>
          </Section>

          <Section id="sponsors" num={9} title="Sponsor Management">
            <SubHeader>Sponsor Tiers</SubHeader>
            <p>Organizers create tiers with name, price, description, benefits, and display order.</p>
            <SubHeader>Base Templates</SubHeader>
            <SimpleTable headers={["Template", "Tiers"]} rows={[
              ["Nonprofit Charity", "Presenting ($5k), Platinum ($2.5k), Gold ($1k), Silver ($500), Bronze ($250)"],
              ["Corporate Outing", "Title ($10k), Eagle ($5k), Birdie ($2.5k), Friend ($1k)"],
              ["Club Championship", "Major ($3k), Supporting ($1.5k), Patron ($500)"],
            ]} />
            <SubHeader>Sponsor Registration Flow</SubHeader>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Sponsor visits <code>/sponsor/{"{tournament_slug}"}</code> or scans QR code</li>
              <li>Selects tier, fills out company info</li>
              <li>Uploads logo (PNG, JPG, SVG, max 5MB)</li>
              <li>Proceeds to Stripe Checkout</li>
              <li>Pays full tier amount (5% platform fee + Stripe fee deducted)</li>
              <li>Net proceeds go to organizer's Stripe account</li>
              <li>Sponsor appears in organizer's Sponsor Management dashboard</li>
            </ol>
            <SubHeader>Live Leaderboard Integration</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Organizer can toggle which sponsors appear on leaderboard</li>
              <li>Placement options: top banner, sidebar, rotating footer</li>
              <li>Display order configurable</li>
            </ul>
          </Section>

          <Section id="team" num={10} title="Team Management">
            <SubHeader>Adding Team Members</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Organizer enters name and email</li>
              <li>Selects role: Admin, Editor, or Viewer</li>
              <li>System sends magic link invitation (no password required)</li>
            </ul>
            <SubHeader>Roles & Permissions</SubHeader>
            <SimpleTable headers={["Role", "Access"]} rows={[
              ["Admin", "Full access – everything the tournament organizer can do"],
              ["Editor", "Manage players, scores, sponsors, volunteers; cannot change payout settings"],
              ["Viewer", "Read-only: view registrations, leaderboard, finances (no edits)"],
            ]} />
            <SubHeader>Activity Log</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Every login and action is logged</li>
              <li>Organizer can see who made changes and when</li>
              <li>Admin can view logs across all organizers</li>
            </ul>
          </Section>

          <Section id="search" num={11} title="Public Tournament Search">
            <p>URL: <code>/tournaments/search</code></p>
            <SubHeader>Features</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Search by tournament name, location, date</li>
              <li>Filters: location, date range, tournament type</li>
              <li>Results show opted-in tournaments only</li>
            </ul>
            <SubHeader>Organizer Opt-in</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Tournament Settings → "List on public TeeVents search"</li>
              <li>Default: OFF (opt-in required)</li>
              <li>Once opted in, tournament appears in search results</li>
            </ul>
            <SubHeader>Admin Controls</SubHeader>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Global toggle to enable/disable public search</li>
              <li>Admin can feature specific tournaments</li>
            </ul>
          </Section>

          <Section id="technical" num={12} title="Technical Architecture">
            <SimpleTable headers={["Layer", "Technology"]} rows={[
              ["Frontend", "React, TypeScript, Tailwind CSS, shadcn/ui"],
              ["Backend", "Supabase (PostgreSQL, Auth, Storage, Realtime)"],
              ["Payments", "Stripe Connect (destination charges, 5% application fee)"],
              ["Emails", "Resend (transactional, magic links, notifications)"],
              ["SMS", "Twilio (optional)"],
              ["Hosting", "Lovable Cloud / Vercel"],
              ["Edge Functions", "Deno (Supabase Edge Functions)"],
            ]} />
            <SubHeader>Key Edge Functions</SubHeader>
            <SimpleTable headers={["Function", "Purpose"]} rows={[
              ["create-registration-checkout", "Golfer registration payment"],
              ["create-sponsor-checkout", "Sponsor registration payment"],
              ["stripe-connect-onboard", "Organizer Stripe onboarding"],
              ["stripe-webhook", "Handle Stripe events"],
              ["calculate-course-handicap", "USGA handicap calculation"],
              ["generate-scorecard-pdf", "Printable scorecard generation"],
              ["search-tournaments", "Public tournament search"],
            ]} />
          </Section>

          <Section id="security" num={13} title="Security & Compliance">
            <SimpleTable headers={["Area", "Implementation"]} rows={[
              ["PCI Compliance", "Stripe handles all card data; TeeVents never touches PANs"],
              ["Data Encryption", "TLS 1.2+ in transit, encrypted at rest (Supabase)"],
              ["Authentication", "Supabase Auth with JWT + Row Level Security (RLS)"],
              ["Audit Logging", "All payout changes and admin actions logged"],
              ["Tax Forms", "Stripe provides 1099-K for organizers earning >$600/year"],
              ["PII Handling", "No sensitive data stored (Stripe tokens only)"],
            ]} />
          </Section>

          <Section id="support" num={14} title="Support & Resources">
            <SimpleTable headers={["Resource", "Location"]} rows={[
              ["Help Center", "/help (12+ articles)"],
              ["How It Works", "/plans"],
              ["Pricing", "/plans"],
              ["FAQ", "/faq"],
              ["Comparison", "/compare/eventbrite-vs-teevents"],
              ["Email Support", "info@teevents.golf"],
              ["Demo Request", "Calendly link (in sales hub)"],
            ]} />
            <SubHeader>Help Center Articles</SubHeader>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>How to Connect Your Bank Account for Payouts</li>
              <li>Understanding TeeVents Fees & Hold</li>
              <li>Payout Schedule & Timing</li>
              <li>Tax Information for Organizers</li>
              <li>Setting Up Your Tournament Payment Settings</li>
              <li>Refunds & Chargebacks</li>
              <li>How to Use the Handicap System</li>
              <li>Setting Up Course Details</li>
              <li>Live Leaderboard Display Mode</li>
              <li>Sponsor Registration & Payment</li>
              <li>Team Management & Roles</li>
              <li>Public Tournament Search</li>
            </ol>
          </Section>

          <Section id="metrics" num={15} title="Key Metrics & Limits">
            <SimpleTable headers={["Metric", "Value"]} rows={[
              ["Platform Fee", "5% per transaction"],
              ["Stripe Processing Fee", "2.9% + $0.30"],
              ["Hold Percentage", "0% (no hold – direct payout via Stripe Connect)"],
              ["Minimum Payout", "$25"],
              ["Payout Speed (Stripe)", "1-3 business days"],
              ["Payout Speed (PayPal)", "5-7 business days"],
              ["Payout Speed (Check)", "Upon request (mailing time)"],
              ["Custom URL Edits", "3 max per tournament"],
              ["Team Members", "Unlimited (by plan)"],
              ["Player Capacity (Base)", "72 players"],
              ["Player Capacity (Starter)", "Unlimited"],
              ["Player Capacity (Premium)", "Unlimited"],
            ]} />
            <SubHeader>Plan Comparison</SubHeader>
            <SimpleTable headers={["Feature", "Base (Free)", "Starter ($299/event)", "Premium ($999/event)"]} rows={[
              ["Tournaments", "1", "Unlimited", "Unlimited"],
              ["Players", "72", "Unlimited", "Unlimited"],
              ["Live Leaderboard", "❌", "✅", "✅"],
              ["Handicap System", "❌", "✅", "✅"],
              ["Sponsor Management", "❌", "✅", "✅"],
              ["Volunteer Coordination", "❌", "✅", "✅"],
              ["Auction & Raffle", "❌", "❌", "✅"],
              ["Add On Store", "❌", "❌", "✅"],
              ["Flyer Studio", "❌", "❌", "✅"],
              ["Public Search Opt-in", "❌", "✅", "✅"],
              ["Custom URL", "❌", "✅", "✅"],
              ["Priority Support", "❌", "❌", "✅"],
            ]} />
          </Section>

          <Section id="glossary" num={16} title="Glossary">
            <SimpleTable headers={["Term", "Definition"]} rows={[
              ["Chargeback", "When a cardholder disputes a charge with their bank"],
              ["Course Handicap", "Number of strokes a player receives based on course difficulty (USGA formula)"],
              ["Course Rating", "USGA measure of difficulty for a scratch golfer"],
              ["Destination Charge", "Stripe Connect flow where funds go to platform account first then split"],
              ["Edge Function", "Serverless Deno function running on Supabase"],
              ["Handicap Index", "Player's demonstrated ability (e.g., 12.4)"],
              ["Hold", "(Legacy – no longer used) Previously 15% held for 15 days"],
              ["Magic Link", "Passwordless authentication link sent via email"],
              ["Net Score", "Gross score minus Playing Handicap"],
              ["Platform Fee", "5% fee on all transactions (TeeVents revenue)"],
              ["Playing Handicap", "Course Handicap × Allowance (used for competition)"],
              ["RLS", "Row Level Security (Supabase)"],
              ["Slope Rating", "USGA measure of difficulty for a bogey golfer (113 = average)"],
              ["Stripe Connect", "Stripe's marketplace payment platform"],
              ["Stroke Index", "Ranking of holes by difficulty (1=hardest)"],
              ["USGA", "United States Golf Association (handicap authority)"],
            ]} />
          </Section>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12">
          © {new Date().getFullYear()} TeeVents Golf · Confidential — For internal use only
        </p>
      </section>
    </Layout>
  );
};

const Section = ({ id, num, title, children }: { id: string; num: number; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-xl font-display font-bold text-foreground border-b border-border pb-2 mb-4">{num}. {title}</h2>
    <div className="text-sm text-muted-foreground space-y-3">{children}</div>
  </section>
);

const SubHeader = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-semibold text-foreground mt-4 mb-1">{children}</h3>
);

const SimpleTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="text-left p-2 bg-muted/50 border border-border font-medium text-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="p-2 border border-border align-top">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── PDF Builder ──
function buildPdfHtml(): string {
  const t = (headers: string[], rows: string[][]) =>
    `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  return `
    <style>
      body { font-family: 'Georgia', serif; color: #1a1a1a; max-width: 820px; margin: 0 auto; }
      h1 { font-size: 26px; color: #1a5c38; border-bottom: 3px solid #1a5c38; padding-bottom: 8px; margin-bottom: 8px; }
      h2 { font-size: 18px; color: #1a5c38; margin-top: 26px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      h3 { font-size: 14px; color: #333; margin-top: 16px; }
      p, li, td, th { font-size: 12px; line-height: 1.55; }
      ul, ol { padding-left: 22px; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11.5px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #f0f7f3; color: #1a5c38; font-weight: 600; }
      code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
      .toc ol { columns: 2; -webkit-columns: 2; -moz-columns: 2; }
      .page-break { page-break-before: always; }
      section { page-break-inside: avoid; }
    </style>
    <h1>📚 TeeVents Platform Study Sheet — 2026 Edition</h1>
    <p style="color:#666;font-size:11px;">Complete reference guide for tournament organizers, sales team, and support staff · ${new Date().toLocaleDateString()}</p>

    <h2>Table of Contents</h2>
    <div class="toc"><ol>${sections.map((s) => `<li>${s.label}</li>`).join("")}</ol></div>

    <div class="page-break"></div>

    <section><h2>1. Platform Overview</h2>
      <h3>What is TeeVents?</h3>
      <p>All-in-one golf tournament management platform handling registration, payments, communications, live scoring, handicaps, and day-of logistics.</p>
      <h3>Who is it for?</h3>
      <ul>
        <li><strong>Nonprofits</strong> — Fundraising tournaments with donation tracking, auctions, raffles</li>
        <li><strong>Corporate Planners</strong> — Company outings with branded websites and sponsor management</li>
        <li><strong>Golf Clubs</strong> — Member events with custom URLs and public search visibility</li>
        <li><strong>Independent Organizers</strong> — Anyone running a tournament from 10 to 500+ players</li>
      </ul>
      <p><strong>Core Promise:</strong> Run your tournament like a pro — no spreadsheets, no manual payments, no stress.</p>
    </section>

    <section><h2>2. Tournament Organizer Features</h2>
      <h3>2.1 Tournament Creation</h3>
      ${t(["Feature", "Description"], [
        ["Registration Fee", "Set any amount ($1–$10,000)"],
        ["Fee Model", "Pass to Golfer or Absorb Fees"],
        ["Event Details", "Date, location, max players, description"],
        ["Custom URL", "Editable /tournament/{custom-slug} (3 edits max, 301 redirects)"],
        ["Public Search", "Opt-in to appear on /tournaments/search"],
      ])}
      <h3>2.2 Registration Management</h3>
      ${t(["Feature", "Description"], [
        ["Real-time registrations", "Live counter and player list"],
        ["Player details", "Edit name, email, handicap, shirt size, dietary needs"],
        ["Manual registration", "Add players offline"],
        ["CSV export", "Download full player list"],
        ["Group registration", "Foursomes (up to 4 players)"],
        ["Promo codes", "Discount codes for early bird, sponsors, etc."],
        ["Waitlist", "Auto-notify when spots open"],
      ])}
      <h3>2.3 Additional Features</h3>
      ${t(["Feature", "Description"], [
        ["Volunteers", "Shift scheduling, QR check-in, automated reminders"],
        ["Auction & Raffle", "Silent auction, 50/50 raffle, auto-draw"],
        ["Add On Store", "Sell branded merchandise with Stripe checkout"],
        ["Donations", "Fundraising page with progress bar"],
        ["Flyer Studio", "Canva-integrated template gallery"],
        ["Director Shop", "Premium add-ons (consulting, signage, insurance)"],
        ["Printables", "Scorecards, cart signs, name badges, sponsor signs"],
        ["Photo Gallery", "Upload event photos to public site"],
        ["Surveys", "Post-event feedback with ratings and comments"],
        ["Planning Guide", "30-item checklist from 12 months out"],
        ["QR Check-in", "Scan QR codes on any tablet, manual search fallback"],
        ["Messages & Email Templates", "Email/SMS blasts, scheduled delivery"],
      ])}
    </section>

    <section><h2>3. Golfer Experience</h2>
      <h3>Registration Flow</h3>
      <ol>
        <li>Visit tournament URL (<code>/tournament/{slug}</code> or custom URL)</li>
        <li>Enter player details (name, email, handicap, shirt size, dietary needs)</li>
        <li>Group registration for foursomes</li>
        <li>Checkout with Stripe (credit card, Apple Pay, Google Pay, Cash App Pay)</li>
        <li>Receive confirmation email with QR code</li>
      </ol>
      <h3>Day-of-Event</h3>
      <ul>
        <li>QR code check-in at registration desk</li>
        <li>View live leaderboard (gross/net)</li>
        <li>Enter scores using unique player code (scan QR on scorecard)</li>
      </ul>
      <h3>Post-Event</h3>
      <ul>
        <li>Post-event survey</li>
        <li>Photo gallery</li>
        <li>Final results and leaderboard</li>
      </ul>
    </section>

    <section><h2>4. Payment & Money Flow</h2>
      ${t(["Step", "What Happens"], [
        ["1. Golfer registers", "Pays via Stripe Checkout (card, Apple Pay, Google Pay, Cash App Pay)"],
        ["2. Stripe processes", "Charges golfer's card; deducts 2.9% + $0.30 processing fee"],
        ["3. Funds split", "5% application fee → TeeVents; remainder → organizer's connected Stripe account"],
        ["4. Organizer payout", "Stripe pays organizer per their Stripe payout schedule (1-3 days)"],
      ])}
      <p><strong>Pass to Golfer (default):</strong> Golfer sees registration + 5% + Stripe fees as a single line item; organizer keeps 100% of advertised price.</p>
      <p><strong>Absorb Fees:</strong> Golfer pays only the registration fee; organizer receives the registration minus 5% and Stripe processing fees.</p>
    </section>

    <section><h2>5. Payout Methods</h2>
      ${t(["Feature", "Stripe Connect", "PayPal", "Check"], [
        ["Setup Time", "2-3 min", "1 min", "Enter address"],
        ["Payout Speed", "1-3 days", "5-7 days", "Upon request"],
        ["Automatic", "✅ Bi-weekly", "❌ Manual", "❌ Manual"],
        ["Additional Fee", "None", "1% (min $0.50)", "None"],
        ["Default Method", "Recommended", "Backup", "Default (escrow)"],
      ])}
      <p>New organizers default to <strong>Check</strong> until they configure a payout method. Funds are held in TeeVents escrow until payout is configured or manually requested.</p>
    </section>

    <section><h2>6. Handicap System</h2>
      <h3>USGA Course Handicap Formula</h3>
      <p><code>Course Handicap = Index × (Slope ÷ 113) + (Course Rating − Par)</code></p>
      <p><code>Playing Handicap = Course Handicap × Allowance</code></p>
      <h3>Default Allowances by Format</h3>
      ${t(["Format", "Allowance"], [
        ["Individual Stroke Play", "95%"],
        ["Four-Ball (Best Ball)", "85% per player"],
        ["Scramble", "25-35% combined"],
        ["Match Play", "100%"],
      ])}
      <h3>Stroke Allocation (Dots/Pops)</h3>
      <ul>
        <li>Strokes are allocated to holes based on Stroke Index (1=hardest)</li>
        <li>A player with Playing Handicap 12 receives one stroke on holes ranked 1-12</li>
        <li>Displayed as dots (●) on scorecards and scoring interface</li>
      </ul>
    </section>

    <section><h2>7. Course Details</h2>
      <h3>Required Fields</h3>
      ${t(["Field", "Example", "Used For"], [
        ["Course Name", "Pebble Beach Golf Links", "Scorecards, public display"],
        ["Tee Set", "Blue Tees", "Different flights"],
        ["Par", "72", "Handicap formula, scorecards"],
        ["Course Rating", "72.5", "Handicap formula"],
        ["Slope Rating", "135", "Handicap formula"],
        ["Hole Pars (1-18)", "[4,5,3,4,4,4,5,3,4,…]", "Scorecards, scoring"],
        ["Stroke Indexes (1-18)", "[5,11,17,3,7,15,1,13,9,…]", "Stroke allocation"],
        ["Distances (optional)", "[380,520,180,…]", "Scorecards"],
      ])}
      <h3>Validation</h3>
      <ul>
        <li>Par total must match sum of hole pars</li>
        <li>Stroke Indexes must include each number 1-18 exactly once</li>
        <li>Course Rating typically 60-80, Slope 55-155</li>
      </ul>
    </section>

    <section><h2>8. Live Leaderboard & Scoring</h2>
      <h3>Public Routes</h3>
      ${t(["Route", "Purpose"], [
        ["/t/{slug}", "Public tournament page (info, registration, leaderboard tab)"],
        ["/live/{slug}", "Dedicated TV/display leaderboard (dark mode, large fonts, auto-refresh)"],
        ["/tournament/{custom-slug}", "Custom URL (if organizer sets one)"],
      ])}
      <h3>Leaderboard Features</h3>
      <ul>
        <li>Real-time score updates (polling every 10 seconds or Supabase Realtime)</li>
        <li>Gross/Net toggle</li>
        <li>Sponsor logos (rotating banner or sidebar)</li>
        <li>Gallery slideshow (uploaded event photos)</li>
        <li>Fullscreen mode (<code>?display=1</code> hides navigation)</li>
      </ul>
      <h3>Player Score Entry</h3>
      <ol>
        <li>Player receives unique code at registration</li>
        <li>Scan QR code on scorecard → opens scoring page</li>
        <li>Enter gross scores hole-by-hole</li>
        <li>System calculates net score using handicap</li>
        <li>Leaderboard updates instantly</li>
      </ol>
      <h3>Test Scoring Simulator</h3>
      <ul>
        <li>Organizer can enable test mode to practice scoring before live event</li>
        <li>Add mock participants with handicaps</li>
        <li>Simulate scores and verify leaderboard behavior</li>
        <li>Real golfers never see test data</li>
      </ul>
    </section>

    <section><h2>9. Sponsor Management</h2>
      <h3>Sponsor Tiers</h3>
      <p>Organizers create tiers with name, price, description, benefits, and display order.</p>
      <h3>Base Templates</h3>
      ${t(["Template", "Tiers"], [
        ["Nonprofit Charity", "Presenting ($5k), Platinum ($2.5k), Gold ($1k), Silver ($500), Bronze ($250)"],
        ["Corporate Outing", "Title ($10k), Eagle ($5k), Birdie ($2.5k), Friend ($1k)"],
        ["Club Championship", "Major ($3k), Supporting ($1.5k), Patron ($500)"],
      ])}
      <h3>Sponsor Registration Flow</h3>
      <ol>
        <li>Sponsor visits <code>/sponsor/{tournament_slug}</code> or scans QR code</li>
        <li>Selects tier, fills out company info</li>
        <li>Uploads logo (PNG, JPG, SVG, max 5MB)</li>
        <li>Proceeds to Stripe Checkout</li>
        <li>Pays full tier amount (5% platform fee + Stripe fee deducted)</li>
        <li>Net proceeds go to organizer's Stripe account</li>
        <li>Sponsor appears in organizer's Sponsor Management dashboard</li>
      </ol>
      <h3>Live Leaderboard Integration</h3>
      <ul>
        <li>Organizer can toggle which sponsors appear on leaderboard</li>
        <li>Placement options: top banner, sidebar, rotating footer</li>
        <li>Display order configurable</li>
      </ul>
    </section>

    <section><h2>10. Team Management</h2>
      <h3>Adding Team Members</h3>
      <ul>
        <li>Organizer enters name and email</li>
        <li>Selects role: Admin, Editor, or Viewer</li>
        <li>System sends magic link invitation (no password required)</li>
      </ul>
      <h3>Roles & Permissions</h3>
      ${t(["Role", "Access"], [
        ["Admin", "Full access – everything the tournament organizer can do"],
        ["Editor", "Manage players, scores, sponsors, volunteers; cannot change payout settings"],
        ["Viewer", "Read-only: view registrations, leaderboard, finances (no edits)"],
      ])}
      <h3>Activity Log</h3>
      <ul>
        <li>Every login and action is logged</li>
        <li>Organizer can see who made changes and when</li>
        <li>Admin can view logs across all organizers</li>
      </ul>
    </section>

    <section><h2>11. Public Tournament Search</h2>
      <p>URL: <code>/tournaments/search</code></p>
      <h3>Features</h3>
      <ul>
        <li>Search by tournament name, location, date</li>
        <li>Filters: location, date range, tournament type</li>
        <li>Results show opted-in tournaments only</li>
      </ul>
      <h3>Organizer Opt-in</h3>
      <ul>
        <li>Tournament Settings → "List on public TeeVents search"</li>
        <li>Default: OFF (opt-in required)</li>
        <li>Once opted in, tournament appears in search results</li>
      </ul>
      <h3>Admin Controls</h3>
      <ul>
        <li>Global toggle to enable/disable public search</li>
        <li>Admin can feature specific tournaments</li>
      </ul>
    </section>

    <section><h2>12. Technical Architecture</h2>
      ${t(["Layer", "Technology"], [
        ["Frontend", "React, TypeScript, Tailwind CSS, shadcn/ui"],
        ["Backend", "Supabase (PostgreSQL, Auth, Storage, Realtime)"],
        ["Payments", "Stripe Connect (destination charges, 5% application fee)"],
        ["Emails", "Resend (transactional, magic links, notifications)"],
        ["SMS", "Twilio (optional)"],
        ["Hosting", "Lovable Cloud / Vercel"],
        ["Edge Functions", "Deno (Supabase Edge Functions)"],
      ])}
      <h3>Key Edge Functions</h3>
      ${t(["Function", "Purpose"], [
        ["create-registration-checkout", "Golfer registration payment"],
        ["create-sponsor-checkout", "Sponsor registration payment"],
        ["stripe-connect-onboard", "Organizer Stripe onboarding"],
        ["stripe-webhook", "Handle Stripe events"],
        ["calculate-course-handicap", "USGA handicap calculation"],
        ["generate-scorecard-pdf", "Printable scorecard generation"],
        ["search-tournaments", "Public tournament search"],
      ])}
    </section>

    <section><h2>13. Security & Compliance</h2>
      ${t(["Area", "Implementation"], [
        ["PCI Compliance", "Stripe handles all card data; TeeVents never touches PANs"],
        ["Data Encryption", "TLS 1.2+ in transit, encrypted at rest (Supabase)"],
        ["Authentication", "Supabase Auth with JWT + Row Level Security (RLS)"],
        ["Audit Logging", "All payout changes and admin actions logged"],
        ["Tax Forms", "Stripe provides 1099-K for organizers earning >$600/year"],
        ["PII Handling", "No sensitive data stored (Stripe tokens only)"],
      ])}
    </section>

    <section><h2>14. Support & Resources</h2>
      ${t(["Resource", "Location"], [
        ["Help Center", "/help (12+ articles)"],
        ["How It Works", "/plans"],
        ["Pricing", "/plans"],
        ["FAQ", "/faq"],
        ["Comparison", "/compare/eventbrite-vs-teevents"],
        ["Email Support", "info@teevents.golf"],
        ["Demo Request", "Calendly link (in sales hub)"],
      ])}
    </section>

    <section><h2>15. Key Metrics & Limits</h2>
      ${t(["Metric", "Value"], [
        ["Platform Fee", "5% per transaction"],
        ["Stripe Processing Fee", "2.9% + $0.30"],
        ["Hold Percentage", "0% (no hold – direct payout via Stripe Connect)"],
        ["Minimum Payout", "$25"],
        ["Payout Speed (Stripe)", "1-3 business days"],
        ["Payout Speed (PayPal)", "5-7 business days"],
        ["Payout Speed (Check)", "Upon request (mailing time)"],
        ["Custom URL Edits", "3 max per tournament"],
        ["Player Capacity (Base)", "72 players"],
        ["Player Capacity (Starter)", "Unlimited"],
        ["Player Capacity (Premium)", "Unlimited"],
      ])}
      <h3>Plan Comparison</h3>
      ${t(["Feature", "Base", "Starter", "Premium"], [
        ["Tournaments", "1", "Unlimited", "Unlimited"],
        ["Players", "72", "Unlimited", "Unlimited"],
        ["Live Leaderboard", "❌", "✅", "✅"],
        ["Handicap System", "❌", "✅", "✅"],
        ["Sponsor Management", "❌", "✅", "✅"],
        ["Volunteer Coordination", "❌", "✅", "✅"],
        ["Auction & Raffle", "❌", "❌", "✅"],
        ["Add On Store", "❌", "❌", "✅"],
        ["Flyer Studio", "❌", "❌", "✅"],
        ["Public Search Opt-in", "❌", "✅", "✅"],
        ["Custom URL", "❌", "✅", "✅"],
        ["Priority Support", "❌", "❌", "✅"],
      ])}
    </section>

    <section><h2>16. Glossary</h2>
      ${t(["Term", "Definition"], [
        ["Chargeback", "When a cardholder disputes a charge with their bank"],
        ["Course Handicap", "Number of strokes a player receives based on course difficulty (USGA formula)"],
        ["Course Rating", "USGA measure of difficulty for a scratch golfer"],
        ["Destination Charge", "Stripe Connect flow where funds go to platform account first then split"],
        ["Edge Function", "Serverless Deno function running on Supabase"],
        ["Handicap Index", "Player's demonstrated ability (e.g., 12.4)"],
        ["Hold", "(Legacy – no longer used) Previously 15% held for 15 days"],
        ["Magic Link", "Passwordless authentication link sent via email"],
        ["Net Score", "Gross score minus Playing Handicap"],
        ["Platform Fee", "5% fee on all transactions (TeeVents revenue)"],
        ["Playing Handicap", "Course Handicap × Allowance (used for competition)"],
        ["RLS", "Row Level Security (Supabase)"],
        ["Slope Rating", "USGA measure of difficulty for a bogey golfer (113 = average)"],
        ["Stripe Connect", "Stripe's marketplace payment platform"],
        ["Stroke Index", "Ranking of holes by difficulty (1=hardest)"],
        ["USGA", "United States Golf Association (handicap authority)"],
      ])}
    </section>

    <p style="margin-top:24px;text-align:center;color:#888;font-size:10px;">© ${new Date().getFullYear()} TeeVents Golf · Confidential — For internal use only</p>
  `;
}

export default StudySheet;

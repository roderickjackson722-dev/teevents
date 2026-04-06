import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Copy, Check, ChevronRight, BookOpen, Shield, CreditCard, Users, Zap, HelpCircle, BarChart3, FileText } from "lucide-react";
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
    if (!contentRef.current) return;
    downloadHtmlAsPdf("TeeVents Platform Study Sheet", `
      <style>
        body { font-family: 'Georgia', serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; color: #1a5c38; border-bottom: 3px solid #1a5c38; padding-bottom: 8px; margin-bottom: 16px; }
        h2 { font-size: 20px; color: #1a5c38; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        h3 { font-size: 16px; color: #333; margin-top: 20px; }
        p, li { font-size: 13px; line-height: 1.7; }
        ul { padding-left: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f7f3; color: #1a5c38; font-weight: 600; }
        .page-break { page-break-before: always; }
        .badge { display: inline-block; background: #e8f5ee; color: #1a5c38; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      </style>
      <h1>🏌️ TeeVents — Platform Study Sheet</h1>
      <p style="color:#666;font-size:12px;">Internal Training & Reference Guide · Last Updated: ${new Date().toLocaleDateString()}</p>

      <h2>Table of Contents</h2>
      <ol style="font-size:13px;">
        <li>Platform Overview</li>
        <li>Tournament Organizer Features</li>
        <li>Golfer Experience</li>
        <li>Payment & Money Flow</li>
        <li>Technical Architecture</li>
        <li>Security & Compliance</li>
        <li>Support & Resources</li>
        <li>Key Metrics & Limits</li>
        <li>Glossary</li>
      </ol>

      <div class="page-break"></div>

      <h2>1. Platform Overview</h2>
      <h3>What is TeeVents?</h3>
      <p>TeeVents is an all-in-one golf tournament management platform that handles registration, payments, communications, and day-of logistics. It automates the operational burden so organizers can focus on their event and fundraising goals.</p>
      <h3>Who is it for?</h3>
      <ul>
        <li><strong>Nonprofits & Charities</strong> — Fundraising golf tournaments with donation tracking and 501(c)(3) support</li>
        <li><strong>Corporate Planners</strong> — Company outings with branding, sponsor management, and team registration</li>
        <li><strong>Golf Clubs & Courses</strong> — Member tournaments, leagues, and events</li>
        <li><strong>Independent Organizers</strong> — Anyone running a golf tournament, from first-timers to seasoned pros</li>
      </ul>
      <h3>Core Value Proposition</h3>
      <p>All-in-one tournament management with automated payments. One platform replaces spreadsheets, Venmo, paper sign-ups, and manual pairings. Organizers get paid automatically — no chasing checks.</p>

      <h2>2. Tournament Organizer Features</h2>

      <h3>2.1 Tournament Creation</h3>
      <ul>
        <li>Set registration fee (any amount from $1 to $10,000)</li>
        <li>Choose fee model:
          <ul>
            <li><strong>Pass to Golfer:</strong> Golfer pays registration + 5% platform fee + Stripe processing fees</li>
            <li><strong>Absorb Fees:</strong> Golfer pays registration only; organizer receives registration minus 5% minus Stripe fees</li>
          </ul>
        </li>
        <li>Set event date, location, course name, max players</li>
        <li>Publish / unpublish tournament site</li>
        <li>Customize tournament site (logo, colors, hero image, template)</li>
        <li>Custom registration fields (shirt size, handicap, dietary needs, etc.)</li>
      </ul>

      <h3>2.2 Registration Management</h3>
      <ul>
        <li>View all registrations in real-time</li>
        <li>Edit player details (name, handicap, shirt size, dietary needs)</li>
        <li>Manual registration for offline/cash payments</li>
        <li>Export registrations to CSV</li>
        <li>Send bulk emails to registrants</li>
        <li>Promo codes for discounted registration</li>
        <li>Waitlist management with automatic offers</li>
      </ul>

      <h3>2.3 Payment & Financial Dashboard</h3>
      <ul>
        <li><strong>Balance Cards:</strong> Available balance, Pending hold, Total collected, Fees paid</li>
        <li><strong>Transaction History:</strong> Every golfer payment with full breakdown</li>
        <li><strong>Payout History:</strong> All past payouts with dates and amounts</li>
        <li><strong>CSV Exports:</strong> Transactions, payouts, summary, and tax reports</li>
      </ul>

      <h3>2.4 Payout Settings</h3>
      <table>
        <tr><th>Feature</th><th>Stripe Connect</th><th>PayPal</th></tr>
        <tr><td>Setup time</td><td>2-3 minutes</td><td>1 minute</td></tr>
        <tr><td>Payout speed</td><td>1-3 business days</td><td>5-7 business days</td></tr>
        <tr><td>Additional fees</td><td>None</td><td>1% or $0.50</td></tr>
        <tr><td>Automatic payouts</td><td>✅ Bi-weekly</td><td>❌ Manual only</td></tr>
        <tr><td>Minimum withdrawal</td><td>$25</td><td>$25</td></tr>
      </table>

      <h3>2.5 Volunteer Management</h3>
      <ul>
        <li>Create volunteer roles with shift times and slot counts</li>
        <li>Assign volunteers manually or via sign-up</li>
        <li>QR code check-in on event day</li>
        <li>Track check-in status in real-time</li>
      </ul>

      <h3>2.6 Sponsor Management</h3>
      <ul>
        <li>Add sponsors (name, level, contact info, contract amount)</li>
        <li>Upload assets (logos, hole signs, digital ads, banners)</li>
        <li>Track asset delivery status</li>
        <li>Sponsor visibility on public tournament page</li>
      </ul>

      <h3>2.7 Live Leaderboard <span class="badge">Starter+</span></h3>
      <ul>
        <li>Enable public leaderboard on tournament page</li>
        <li>Live scoring with player codes</li>
        <li>Multiple scoring formats (stroke play, scramble, stableford, best ball, match play)</li>
      </ul>

      <h3>2.8 Auction & Raffle <span class="badge">Premium</span></h3>
      <ul>
        <li>Silent auction items with bidding</li>
        <li>Raffle items with ticket pricing</li>
        <li>Payment processing through Stripe (4% fee applies)</li>
      </ul>

      <h3>2.9 Additional Features</h3>
      <ul>
        <li><strong>Printables:</strong> Scorecards, name badges, cart signs, hole assignments, sponsor signs, alpha list</li>
        <li><strong>Photo Gallery:</strong> Upload and share event photos</li>
        <li><strong>Surveys:</strong> Post-event satisfaction surveys</li>
        <li><strong>Budget Tracker:</strong> Track income and expenses</li>
        <li><strong>Planning Checklist:</strong> 30-item timeline from 12 months to post-event</li>
        <li><strong>Site Builder:</strong> Customizable public tournament pages</li>
        <li><strong>Donations:</strong> Accept donations with goal tracking</li>
      </ul>

      <div class="page-break"></div>

      <h2>3. Golfer Experience</h2>

      <h3>3.1 Registration Flow</h3>
      <ol>
        <li>Visit tournament URL (teevents.golf/t/your-tournament)</li>
        <li>Enter player details (name, email, handicap, shirt size, dietary needs)</li>
        <li>Group registration (up to 4 players per group)</li>
        <li>Checkout with Stripe (credit card, Apple Pay, Google Pay)</li>
        <li>Receive confirmation email with QR code</li>
      </ol>

      <h3>3.2 Day-of-Event</h3>
      <ul>
        <li>QR code check-in at registration desk</li>
        <li>View pairings and tee times</li>
        <li>Live scoring (enter scores via unique player code)</li>
        <li>Leaderboard view on any device</li>
      </ul>

      <h3>3.3 Post-Event</h3>
      <ul>
        <li>Survey completion (if enabled)</li>
        <li>Photo gallery access</li>
        <li>Final leaderboard and results</li>
      </ul>

      <div class="page-break"></div>

      <h2>4. Payment & Money Flow</h2>

      <h3>4.1 How Funds Move</h3>
      <p>Golfer pays → Stripe processes → TeeVents takes 5% platform fee → 15% hold reserved → Remaining goes to organizer's available balance → Automatic bi-weekly payout or manual withdrawal</p>

      <h3>4.2 Fee Model Comparison</h3>
      <table>
        <tr><th>Model</th><th>Golfer Pays</th><th>Organizer Receives</th><th>Best For</th></tr>
        <tr><td><strong>Pass to Golfer</strong></td><td>$100 + $5 + ~$3.43 = ~$108.43</td><td>$100 (minus 15% hold)</td><td>Premium events, corporate outings</td></tr>
        <tr><td><strong>Absorb Fees</strong></td><td>$100 exactly</td><td>$100 - $5 - ~$3.20 = ~$91.80 (minus 15% hold)</td><td>Nonprofits, charity events</td></tr>
      </table>

      <h3>4.3 Hold Release Timeline</h3>
      <ul>
        <li>15% of each registration is held for chargeback protection</li>
        <li>Hold is released 15 days after the event end date</li>
        <li>Daily cron job (release-holds) processes releases at 6:00 AM UTC</li>
        <li>Released funds added to available balance automatically</li>
      </ul>

      <h3>4.4 Chargeback Protection</h3>
      <ul>
        <li>15% hold covers chargeback risk</li>
        <li>If chargeback occurs, hold is used first</li>
        <li>Organizer never pays out of pocket</li>
        <li>Chargebacks are rare (&lt;0.5% of transactions)</li>
      </ul>

      <div class="page-break"></div>

      <h2>5. Technical Architecture</h2>

      <h3>5.1 Stack</h3>
      <table>
        <tr><th>Layer</th><th>Technology</th></tr>
        <tr><td>Frontend</td><td>React, TypeScript, Tailwind CSS, shadcn/ui</td></tr>
        <tr><td>Backend</td><td>Supabase (PostgreSQL, Auth, Storage)</td></tr>
        <tr><td>Payments</td><td>Stripe Connect (Express accounts)</td></tr>
        <tr><td>Edge Functions</td><td>Deno (Supabase Edge Functions)</td></tr>
        <tr><td>Emails</td><td>Resend</td></tr>
        <tr><td>SMS</td><td>Twilio</td></tr>
        <tr><td>Hosting</td><td>Lovable Cloud</td></tr>
      </table>

      <h3>5.2 Key Database Tables</h3>
      <table>
        <tr><th>Table</th><th>Purpose</th></tr>
        <tr><td>tournaments</td><td>Event details, settings, dates</td></tr>
        <tr><td>tournament_registrations</td><td>Golfer registrations</td></tr>
        <tr><td>platform_transactions</td><td>Payment records with hold tracking</td></tr>
        <tr><td>organizations</td><td>Organizer accounts</td></tr>
        <tr><td>organization_payout_methods</td><td>Stripe/PayPal connections</td></tr>
        <tr><td>organization_payouts</td><td>Payout history</td></tr>
        <tr><td>tournament_volunteers</td><td>Volunteer assignments</td></tr>
        <tr><td>tournament_sponsors</td><td>Sponsor details</td></tr>
        <tr><td>sponsor_assets</td><td>Sponsor deliverables</td></tr>
      </table>

      <h3>5.3 Edge Functions</h3>
      <table>
        <tr><th>Function</th><th>Purpose</th></tr>
        <tr><td>create-registration-checkout</td><td>Creates Stripe checkout session</td></tr>
        <tr><td>verify-registration</td><td>Confirms payment and records transaction</td></tr>
        <tr><td>release-holds</td><td>Releases 15% hold 15 days after event (daily cron)</td></tr>
        <tr><td>process-biweekly-payouts</td><td>Automatic payouts every other Monday</td></tr>
        <tr><td>stripe-connect-onboard</td><td>Stripe Connect onboarding flow</td></tr>
        <tr><td>process-refund</td><td>Handles refund requests</td></tr>
        <tr><td>create-donation</td><td>Donation checkout session</td></tr>
        <tr><td>create-auction-checkout</td><td>Auction/raffle payment</td></tr>
      </table>

      <div class="page-break"></div>

      <h2>6. Security & Compliance</h2>
      <ul>
        <li><strong>PCI Compliance:</strong> Stripe handles all payment card data — no card numbers stored on our servers</li>
        <li><strong>Data Encryption:</strong> All data encrypted at rest and in transit (TLS 1.2+)</li>
        <li><strong>Authentication:</strong> Supabase Auth with email/password, JWT tokens, role-based access</li>
        <li><strong>Row Level Security:</strong> All database tables protected with RLS policies</li>
        <li><strong>PII Handling:</strong> No sensitive payment data stored — Stripe tokens only</li>
        <li><strong>Audit Logging:</strong> All payout changes logged for security review</li>
        <li><strong>1099-K:</strong> Stripe provides tax forms for organizers earning &gt;$600/year</li>
      </ul>

      <h2>7. Support & Resources</h2>
      <table>
        <tr><th>Resource</th><th>Location</th></tr>
        <tr><td>Help Center</td><td>/help (6 articles covering payments, Stripe, refunds)</td></tr>
        <tr><td>Email Support</td><td>info@teevents.golf</td></tr>
        <tr><td>Demo Request</td><td>info@teevents.golf</td></tr>
        <tr><td>How It Works</td><td>/how-it-works</td></tr>
        <tr><td>Pricing</td><td>/pricing</td></tr>
        <tr><td>FAQ</td><td>/faq</td></tr>
      </table>

      <h2>8. Key Metrics & Limits</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Tournaments per organizer</td><td>Unlimited (Starter+)</td></tr>
        <tr><td>Golfers per tournament</td><td>500+ (Starter+)</td></tr>
        <tr><td>Registration fee range</td><td>$1 – $10,000</td></tr>
        <tr><td>Platform fee</td><td>4%</td></tr>
        <tr><td>Hold percentage</td><td>15%</td></tr>
        <tr><td>Hold release</td><td>15 days after event ends</td></tr>
        <tr><td>Minimum payout</td><td>$25</td></tr>
        <tr><td>Payout frequency</td><td>Bi-weekly (automatic) or manual anytime</td></tr>
        <tr><td>Base plan limit</td><td>1 tournament, 72 players</td></tr>
        <tr><td>Starter plan</td><td>$299 — Unlimited tournaments & players</td></tr>
        <tr><td>Premium plan</td><td>$999 — Custom domain, 10% hold, advanced features</td></tr>
      </table>

      <div class="page-break"></div>

      <h2>9. Glossary</h2>
      <table>
        <tr><th>Term</th><th>Definition</th></tr>
        <tr><td><strong>Chargeback</strong></td><td>When a credit cardholder disputes a charge with their bank</td></tr>
        <tr><td><strong>Hold</strong></td><td>15% of registration fee set aside for 15 days after event for chargeback protection</td></tr>
        <tr><td><strong>Platform Fee</strong></td><td>4% fee charged on all registrations processed through TeeVents</td></tr>
        <tr><td><strong>Stripe Connect</strong></td><td>Stripe's platform for marketplace-style payments; enables organizer payouts</td></tr>
        <tr><td><strong>Express Account</strong></td><td>Simplified Stripe Connect account type for organizers</td></tr>
        <tr><td><strong>Application Fee</strong></td><td>Stripe mechanism to automatically take the 5% platform fee from each payment</td></tr>
        <tr><td><strong>Destination Charge</strong></td><td>Stripe flow where money goes to platform account first, then transferred to organizer</td></tr>
        <tr><td><strong>RLS</strong></td><td>Row Level Security — database-level access control ensuring users only see their own data</td></tr>
        <tr><td><strong>Edge Function</strong></td><td>Serverless function that runs close to the user for low-latency backend logic</td></tr>
        <tr><td><strong>Cron Job</strong></td><td>Scheduled task that runs automatically (e.g., daily hold releases, bi-weekly payouts)</td></tr>
      </table>

      <p style="text-align:center;margin-top:40px;color:#999;font-size:11px;">© ${new Date().getFullYear()} TeeVents Golf. Confidential — For internal use only.</p>
    `);
  };

  if (loading) return <Layout><div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div></Layout>;

  return (
    <Layout>
      <section className="py-12 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Platform Study Sheet</h1>
            <p className="text-muted-foreground mt-1">Internal training & reference guide for TeeVents</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <Button onClick={handleDownloadPdf} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-lg mb-3">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                <s.icon className="h-4 w-4" />
                <span>{i + 1}. {s.label}</span>
                <ChevronRight className="h-3 w-3 ml-auto" />
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="space-y-10">
          {/* Section 1 */}
          <section id="overview">
            <SectionHeader num={1} title="Platform Overview" />
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-1">What is TeeVents?</h3>
                <p>TeeVents is an all-in-one golf tournament management platform that handles registration, payments, communications, and day-of logistics. It automates the operational burden so organizers can focus on their event and fundraising goals.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Who is it for?</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Nonprofits & Charities</strong> — Fundraising golf tournaments with donation tracking</li>
                  <li><strong>Corporate Planners</strong> — Company outings with branding and sponsor management</li>
                  <li><strong>Golf Clubs & Courses</strong> — Member tournaments, leagues, and events</li>
                  <li><strong>Independent Organizers</strong> — Anyone running a golf tournament</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Core Value Proposition</h3>
                <p>All-in-one tournament management with automated payments. One platform replaces spreadsheets, Venmo, paper sign-ups, and manual pairings.</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="organizer">
            <SectionHeader num={2} title="Tournament Organizer Features" />
            <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
              <FeatureBlock title="2.1 Tournament Creation" items={[
                "Set registration fee (any amount from $1 to $10,000)",
                "Choose fee model: Pass to Golfer or Absorb Fees",
                "Set event date, location, course name, max players",
                "Publish / unpublish tournament site",
                "Customize tournament site (logo, colors, hero image, template)",
                "Custom registration fields (shirt size, handicap, dietary needs)",
              ]} />
              <FeatureBlock title="2.2 Registration Management" items={[
                "View all registrations in real-time",
                "Edit player details (name, handicap, shirt size, dietary needs)",
                "Manual registration for offline/cash payments",
                "Export registrations to CSV",
                "Send bulk emails to registrants",
                "Promo codes for discounted registration",
                "Waitlist management with automatic offers",
              ]} />
              <FeatureBlock title="2.3 Payment & Financial Dashboard" items={[
                "Balance Cards: Available balance, Pending hold, Total collected, Fees paid",
                "Transaction History: Every golfer payment with full breakdown",
                "Payout History: All past payouts with dates and amounts",
                "CSV Exports: Transactions, payouts, summary, and tax reports",
              ]} />
              <div>
                <h3 className="font-semibold text-foreground mb-2">2.4 Payout Settings</h3>
                <SimpleTable headers={["Feature", "Stripe Connect", "PayPal"]} rows={[
                  ["Setup time", "2-3 minutes", "1 minute"],
                  ["Payout speed", "1-3 business days", "5-7 business days"],
                  ["Additional fees", "None", "1% or $0.50"],
                  ["Automatic payouts", "✅ Bi-weekly", "❌ Manual only"],
                  ["Minimum withdrawal", "$25", "$25"],
                ]} />
              </div>
              <FeatureBlock title="2.5 Volunteer Management" items={[
                "Create volunteer roles with shift times and slot counts",
                "Assign volunteers manually or via sign-up",
                "QR code check-in on event day",
                "Track check-in status in real-time",
              ]} />
              <FeatureBlock title="2.6 Sponsor Management" items={[
                "Add sponsors (name, level, contact info, contract amount)",
                "Upload assets (logos, hole signs, digital ads, banners)",
                "Track asset delivery status",
                "Sponsor visibility on public tournament page",
              ]} />
              <FeatureBlock title="2.7 Live Leaderboard (Starter+)" items={[
                "Enable public leaderboard on tournament page",
                "Live scoring with unique player codes",
                "Multiple scoring formats: stroke play, scramble, stableford, best ball, match play",
              ]} />
              <FeatureBlock title="2.8 Auction & Raffle (Premium)" items={[
                "Silent auction items with bidding",
                "Raffle items with ticket pricing",
                "Payment processing through Stripe (4% fee applies)",
              ]} />
              <FeatureBlock title="2.9 Additional Features" items={[
                "Printables: Scorecards, name badges, cart signs, hole assignments, sponsor signs",
                "Photo Gallery: Upload and share event photos",
                "Surveys: Post-event satisfaction surveys",
                "Budget Tracker: Track income and expenses",
                "Planning Checklist: 30-item timeline from 12 months to post-event",
                "Site Builder: Customizable public tournament pages",
                "Donations: Accept donations with goal tracking",
              ]} />
            </div>
          </section>

          {/* Section 3 */}
          <section id="golfer">
            <SectionHeader num={3} title="Golfer Experience" />
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">3.1 Registration Flow</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit tournament URL (teevents.golf/t/your-tournament)</li>
                  <li>Enter player details (name, email, handicap, shirt size, dietary needs)</li>
                  <li>Group registration (up to 4 players per group)</li>
                  <li>Checkout with Stripe (credit card, Apple Pay, Google Pay)</li>
                  <li>Receive confirmation email with QR code</li>
                </ol>
              </div>
              <FeatureBlock title="3.2 Day-of-Event" items={[
                "QR code check-in at registration desk",
                "View pairings and tee times",
                "Live scoring (enter scores via unique player code)",
                "Leaderboard view on any device",
              ]} />
              <FeatureBlock title="3.3 Post-Event" items={[
                "Survey completion (if enabled)",
                "Photo gallery access",
                "Final leaderboard and results",
              ]} />
            </div>
          </section>

          {/* Section 4 */}
          <section id="payments">
            <SectionHeader num={4} title="Payment & Money Flow" />
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">4.1 How Funds Move</h3>
                <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono">
                  Golfer pays → Stripe processes → 5% platform fee taken → 15% hold reserved → Remaining = available balance → Bi-weekly payout or manual withdrawal
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">4.2 Fee Model Comparison</h3>
                <SimpleTable headers={["Model", "Golfer Pays", "Organizer Receives", "Best For"]} rows={[
                  ["Pass to Golfer", "$100 + $5 + ~$3.43 = ~$108.43", "$100 (minus 15% hold)", "Premium events"],
                  ["Absorb Fees", "$100 exactly", "~$92.80 (minus 15% hold)", "Nonprofits, charities"],
                ]} />
              </div>
              <FeatureBlock title="4.3 Hold Release Timeline" items={[
                "15% of each registration held for chargeback protection",
                "Released 15 days after the event end date",
                "Daily cron job processes releases at 6:00 AM UTC",
                "Released funds added to available balance automatically",
              ]} />
              <FeatureBlock title="4.4 Chargeback Protection" items={[
                "15% hold covers chargeback risk",
                "If chargeback occurs, hold is used first",
                "Organizer never pays out of pocket",
                "Chargebacks are rare (<0.5% of transactions)",
              ]} />
            </div>
          </section>

          {/* Section 5 */}
          <section id="technical">
            <SectionHeader num={5} title="Technical Architecture" />
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">5.1 Stack</h3>
                <SimpleTable headers={["Layer", "Technology"]} rows={[
                  ["Frontend", "React, TypeScript, Tailwind CSS, shadcn/ui"],
                  ["Backend", "Supabase (PostgreSQL, Auth, Storage)"],
                  ["Payments", "Stripe Connect (Express accounts)"],
                  ["Edge Functions", "Deno (Supabase)"],
                  ["Emails", "Resend"],
                  ["SMS", "Twilio"],
                  ["Hosting", "Lovable Cloud"],
                ]} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">5.2 Key Edge Functions</h3>
                <SimpleTable headers={["Function", "Purpose"]} rows={[
                  ["create-registration-checkout", "Creates Stripe checkout session"],
                  ["verify-registration", "Confirms payment and records transaction"],
                  ["release-holds", "Releases 15% hold 15 days post-event"],
                  ["process-biweekly-payouts", "Automatic payouts every other Monday"],
                  ["stripe-connect-onboard", "Stripe Connect onboarding"],
                  ["process-refund", "Handles refund requests"],
                ]} />
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="security">
            <SectionHeader num={6} title="Security & Compliance" />
            <div className="text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>PCI Compliance:</strong> Stripe handles all payment card data</li>
                <li><strong>Data Encryption:</strong> All data encrypted at rest and in transit (TLS 1.2+)</li>
                <li><strong>Authentication:</strong> Supabase Auth with JWT tokens, role-based access</li>
                <li><strong>Row Level Security:</strong> All tables protected with RLS policies</li>
                <li><strong>Audit Logging:</strong> All payout changes logged for security review</li>
                <li><strong>1099-K:</strong> Stripe provides tax forms for organizers earning &gt;$600/year</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section id="support">
            <SectionHeader num={7} title="Support & Resources" />
            <div className="text-sm text-muted-foreground">
              <SimpleTable headers={["Resource", "Location"]} rows={[
                ["Help Center", "/help (6 articles)"],
                ["Email Support", "info@teevents.golf"],
                ["Demo Request", "info@teevents.golf"],
                ["How It Works", "/how-it-works"],
                ["Pricing", "/pricing"],
                ["FAQ", "/faq"],
              ]} />
            </div>
          </section>

          {/* Section 8 */}
          <section id="metrics">
            <SectionHeader num={8} title="Key Metrics & Limits" />
            <div className="text-sm text-muted-foreground">
              <SimpleTable headers={["Metric", "Value"]} rows={[
                ["Tournaments per organizer", "Unlimited (Starter+)"],
                ["Golfers per tournament", "500+ (Starter+)"],
                ["Registration fee range", "$1 – $10,000"],
                ["Platform fee", "4%"],
                ["Hold percentage", "15%"],
                ["Hold release", "15 days after event ends"],
                ["Minimum payout", "$25"],
                ["Payout frequency", "Bi-weekly (auto) or manual"],
                ["Base plan limit", "1 tournament, 72 players"],
                ["Starter plan", "$299"],
                ["Premium plan", "$999"],
              ]} />
            </div>
          </section>

          {/* Section 9 */}
          <section id="glossary">
            <SectionHeader num={9} title="Glossary" />
            <div className="text-sm text-muted-foreground">
              <SimpleTable headers={["Term", "Definition"]} rows={[
                ["Chargeback", "When a cardholder disputes a charge with their bank"],
                ["Hold", "15% of registration fee set aside for 15 days post-event"],
                ["Platform Fee", "4% fee charged on all registrations"],
                ["Stripe Connect", "Stripe's platform for marketplace payments"],
                ["Express Account", "Simplified Stripe Connect account type"],
                ["Application Fee", "Stripe mechanism to take the 5% platform fee"],
                ["RLS", "Row Level Security — database-level access control"],
                ["Edge Function", "Serverless backend function"],
                ["Cron Job", "Scheduled task (e.g., daily hold releases)"],
              ]} />
            </div>
          </section>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12">
          © {new Date().getFullYear()} TeeVents Golf · Confidential — For internal use only
        </p>
      </section>
    </Layout>
  );
};

const SectionHeader = ({ num, title }: { num: number; title: string }) => (
  <h2 className="text-xl font-display font-bold text-foreground border-b border-border pb-2 mb-4">
    {num}. {title}
  </h2>
);

const FeatureBlock = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
    <ul className="list-disc list-inside space-y-1 ml-2">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  </div>
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
              <td key={j} className="p-2 border border-border">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default StudySheet;

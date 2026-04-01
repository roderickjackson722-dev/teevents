import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Copy, FileDown, ArrowRight, Shield, CreditCard, Clock, Building2,
  AlertTriangle, CheckCircle2, DollarSign, Users, Banknote, ChevronRight
} from "lucide-react";
import Layout from "@/components/Layout";

/* ────── flow diagram data ────── */
const FLOW_STEPS = [
  { icon: Users, label: "Golfer Pays", detail: "$100 registration", color: "bg-primary" },
  { icon: CreditCard, label: "TeeVents Collects", detail: "Secure Stripe checkout", color: "bg-primary/80" },
  { icon: DollarSign, label: "4% Fee Deducted", detail: "$4.00 platform fee", color: "bg-destructive/80" },
  { icon: Shield, label: "15% Hold", detail: "$15.00 reserve", color: "bg-yellow-600" },
  { icon: Banknote, label: "81% Net Available", detail: "$81.00 tracked", color: "bg-emerald-600" },
  { icon: Clock, label: "Event +15 Days", detail: "Hold released", color: "bg-primary/60" },
  { icon: Building2, label: "Payout", detail: "Bi-weekly or manual", color: "bg-emerald-700" },
];

/* ────── $100 breakdown ────── */
const SAMPLE_BREAKDOWN = [
  { label: "Registration Price", amount: "$100.00" },
  { label: "TeeVents Platform Fee (4%)", amount: "−$4.00" },
  { label: "Net After Fee", amount: "$96.00" },
  { label: "15% Reserve Hold", amount: "−$15.00" },
  { label: "Net Available for Payout", amount: "$81.00", bold: true },
  { label: "Hold Released (Event +15 days)", amount: "+$15.00" },
  { label: "Total Received by Organizer", amount: "$96.00", bold: true },
];

/* ────── objections ────── */
const OBJECTIONS = [
  {
    q: '"15% hold is too high"',
    a: "We understand it feels like a lot. The average chargeback rate for events is around 1–2%, but the 15% protects you from even multiple disputes. Most importantly, you get it all back 15 days after your event. No other platform gives you this protection without charging more.",
  },
  {
    q: '"Why can\'t I get paid immediately?"',
    a: "We hold funds to ensure we can cover any chargebacks or refunds. Once your event is complete and the risk period passes, funds are released. This protects both you and the golfers who register.",
  },
  {
    q: '"I already have a Stripe account"',
    a: "Great — you'll be able to connect your existing Stripe account through our Express onboarding. It takes 2–3 minutes, and you'll receive payouts directly to your bank account.",
  },
  {
    q: '"What if I need money before my event?"',
    a: "Your available balance (the 81% net) is tracked in your dashboard. If you have enough available, you can request a manual withdrawal anytime ($25 minimum). However, the 15% hold will only release after the event ends.",
  },
];

/* ────── chargeback FAQ ────── */
const CHARGEBACK_FAQ = [
  {
    q: "What is a chargeback?",
    a: "A chargeback is when a golfer's bank reverses a payment. Common reasons include: the golfer didn't recognize the charge, the event was canceled or rescheduled, the golfer claims they didn't receive what they paid for, or fraudulent use of a credit card.",
  },
  {
    q: "Who pays for a chargeback?",
    a: "If a chargeback occurs: 1) The disputed amount is taken from the 15% hold first. 2) If the hold is insufficient, TeeVents covers the remainder. 3) You are never charged extra — the hold is there to protect you.",
  },
  {
    q: "How often do chargebacks happen?",
    a: "For golf tournaments, chargebacks are rare — typically less than 0.5% of transactions. Most happen due to unrecognized charges, which is why we recommend you brand your statement descriptor clearly.",
  },
];

/* ────── comparison table ────── */
const COMPARISON = [
  { feature: "Setup", stripe: "2–3 minute onboarding", paypal: "Enter email address" },
  { feature: "Additional Fees", stripe: "None", paypal: "1% or $0.50 per payout (whichever is greater)" },
  { feature: "Payout Speed", stripe: "1–3 business days", paypal: "1–5 business days" },
  { feature: "Auto Payouts", stripe: "Yes (bi-weekly)", paypal: "Manual only" },
  { feature: "Dashboard", stripe: "Embedded in TeeVents", paypal: "PayPal website" },
];

/* ────── full script text for copy ────── */
function buildFullScript(): string {
  return `TEEVENTS DEMO CALL — PAYMENT TALK TRACK
========================================

INTRODUCTION
"Let me walk you through how payments work on TeeVents. Our system is designed to be completely transparent — you'll always know where your money is and when you'll receive it."

HOW FUNDS FLOW
1. Golfer registers for your tournament and pays by credit card, Apple Pay, or Google Pay.
2. Payment is collected by TeeVents (we use Stripe, the same platform that powers millions of online businesses).
3. 4% platform fee is automatically deducted — this covers hosting, support, software updates, and payment processing infrastructure.
4. 15% hold is placed on the remaining balance — this protects you from chargebacks and refunds.
5. 81% (net available) is immediately tracked in your dashboard but held for payout timing.
6. 15 days after your event ends, the 15% hold is released to your available balance.
7. You receive payouts every other Monday (bi-weekly) OR you can request manual withdrawals anytime.

SAMPLE $100 REGISTRATION BREAKDOWN
• Registration Price: $100.00
• Platform Fee (4%): −$4.00
• Net After Fee: $96.00
• 15% Reserve Hold: −$15.00
• Net Available for Payout: $81.00
• Hold Released (Event +15 days): +$15.00
• Total Received by Organizer: $96.00

EXPLAINING THE 15% HOLD
"We place a 15% hold on each transaction to protect you from chargebacks. A chargeback happens when a golfer disputes a charge with their bank — maybe they didn't recognize the charge, or there was an issue with the event. The bank can reverse the payment, and that money would come out of your account.

By holding 15%, we ensure that if a chargeback occurs, it's covered from that hold — not from your available balance. If no chargeback happens, the full 15% is released 15 days after your event ends. This is standard practice across event platforms like Eventbrite and golf platforms like Event Caddy."

PAYOUT TIMING & METHODS
"You have two ways to get paid:

1. Automatic bi-weekly payouts — Every other Monday, we automatically transfer your available balance to your connected Stripe account. You don't have to do anything. Funds typically arrive in 1–3 business days.

2. Manual withdrawals — If you need funds sooner, you can click 'Withdraw Funds' in your dashboard anytime. There's a $25 minimum, and we'll process the transfer within 1 business day."

STRIPE CONNECT VS PAYPAL
• Stripe Connect (Recommended): 2–3 min onboarding, no additional fees, 1–3 day payouts, automatic bi-weekly payouts, embedded dashboard.
• PayPal: Enter email, 1% or $0.50 per payout, 1–5 day payouts, manual only, PayPal website.

TRANSPARENCY & REPORTING
"You can see every transaction in your dashboard — down to the individual golfer. Who paid, when, how much, the 4% fee, the 15% hold, when it releases, your available balance, and full payout history. You can also download CSV reports anytime."

COMMON OBJECTIONS
• "15% hold is too high" → You get it all back 15 days after your event. No other platform gives you this protection.
• "Why can't I get paid immediately?" → We hold funds to cover chargebacks. Once the risk period passes, funds are released.
• "I already have a Stripe account" → Connect it through our Express onboarding in 2–3 minutes.
• "What if I need money before my event?" → Your 81% net is available for manual withdrawal anytime ($25 min).
`;
}

export default function DemoTalkTrack() {
  const [activeTab, setActiveTab] = useState("flow");
  const contentRef = useRef<HTMLDivElement>(null);

  const copyScript = () => {
    navigator.clipboard.writeText(buildFullScript());
    toast.success("Full talk track copied to clipboard");
  };

  const downloadPdf = () => {
    const blob = new Blob([buildFullScript()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TeeVents-Demo-Talk-Track.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Talk track downloaded");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Sales Tools</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Demo Call Talk Track — Payments</h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={copyScript}>
                <Copy className="h-4 w-4 mr-1" /> Copy Script
              </Button>
              <Button size="sm" variant="secondary" onClick={downloadPdf}>
                <FileDown className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8" ref={contentRef}>
          {/* Intro Script */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <Badge variant="outline" className="mb-3 text-xs">SAY THIS</Badge>
              <p className="text-base md:text-lg italic text-foreground/90 leading-relaxed">
                "Let me walk you through how payments work on TeeVents. Our system is designed to be
                completely transparent — you'll always know where your money is and when you'll receive it."
              </p>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
              <TabsTrigger value="flow" className="text-xs">Fund Flow</TabsTrigger>
              <TabsTrigger value="hold" className="text-xs">15% Hold</TabsTrigger>
              <TabsTrigger value="payouts" className="text-xs">Payouts</TabsTrigger>
              <TabsTrigger value="compare" className="text-xs">Stripe vs PayPal</TabsTrigger>
              <TabsTrigger value="objections" className="text-xs">Objections</TabsTrigger>
            </TabsList>

            {/* ── Fund Flow ── */}
            <TabsContent value="flow" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">How Funds Flow</h2>

              {/* Visual Flow */}
              <div className="flex flex-col gap-2">
                {FLOW_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{i + 1}. {s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 hidden md:block" />
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Sample Breakdown Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sample $100 Registration Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {SAMPLE_BREAKDOWN.map((row, i) => (
                    <div key={i} className={`flex justify-between text-sm ${row.bold ? "font-semibold text-foreground border-t border-border pt-2" : "text-muted-foreground"}`}>
                      <span>{row.label}</span>
                      <span className="font-mono">{row.amount}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payout Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm">
                    {[
                      { label: "Golfer Pays", sub: "Day 0" },
                      { label: "Event Day", sub: "e.g. June 15" },
                      { label: "Hold Released", sub: "June 30 (+15 days)" },
                      { label: "Payout Sent", sub: "Next bi-weekly Monday" },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                        <div>
                          <p className="font-medium text-foreground">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.sub}</p>
                        </div>
                        {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground/40 hidden md:block ml-2" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── 15% Hold ── */}
            <TabsContent value="hold" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Explaining the 15% Hold</h2>

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <Badge variant="outline" className="mb-3 text-xs">SAY THIS</Badge>
                  <div className="space-y-4 text-sm md:text-base text-foreground/90 leading-relaxed italic">
                    <p>"We place a 15% hold on each transaction to protect you from chargebacks. Here's what that means:</p>
                    <p>A chargeback happens when a golfer disputes a charge with their bank — maybe they didn't recognize the charge, or there was an issue with the event. The bank can reverse the payment, and that money would come out of your account.</p>
                    <p>By holding 15%, we ensure that if a chargeback occurs, it's covered from that hold — not from your available balance. If no chargeback happens, <strong>the full 15% is released 15 days after your event ends</strong>. This is standard practice across event platforms like Eventbrite and golf platforms like Event Caddy."</p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <h3 className="text-base font-semibold text-foreground">Chargeback FAQ</h3>
              <Accordion type="multiple" className="w-full">
                {CHARGEBACK_FAQ.map((item, i) => (
                  <AccordionItem key={i} value={`cb-${i}`}>
                    <AccordionTrigger className="text-sm">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            {/* ── Payouts ── */}
            <TabsContent value="payouts" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Payout Timing & Methods</h2>

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <Badge variant="outline" className="mb-3 text-xs">SAY THIS</Badge>
                  <div className="space-y-4 text-sm md:text-base text-foreground/90 leading-relaxed italic">
                    <p>"You have two ways to get paid:</p>
                    <p><strong>1. Automatic bi-weekly payouts</strong> — Every other Monday, we automatically transfer your available balance to your connected Stripe account. You don't have to do anything. Funds typically arrive in 1–3 business days.</p>
                    <p><strong>2. Manual withdrawals</strong> — If you need funds sooner, you can click 'Withdraw Funds' in your dashboard anytime. There's a $25 minimum, and we'll process the transfer within 1 business day.</p>
                    <p>You can choose between Stripe Connect (recommended — faster, automatic, lower fees) or PayPal (available as a backup)."</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Bi-Weekly Auto Payouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>• Runs every other Monday at 9 AM</p>
                    <p>• Minimum balance: $25</p>
                    <p>• Funds arrive in 1–3 business days</p>
                    <p>• No action required from organizer</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" /> Manual Withdrawals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>• Click "Withdraw Funds" anytime</p>
                    <p>• Minimum: $25</p>
                    <p>• No recent disputes in last 7 days</p>
                    <p>• Processed within 1 business day</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <Badge variant="outline" className="mb-3 text-xs">SAY THIS — TRANSPARENCY</Badge>
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed italic">
                    "You can see every transaction in your dashboard — down to the individual golfer. You'll see who paid, when, how much, the 4% fee, the 15% hold amount, when the hold releases, your available balance, and full payout history. You can also download CSV reports of all transactions, payouts, and tax summaries anytime."
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Stripe vs PayPal ── */}
            <TabsContent value="compare" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Stripe Connect vs PayPal</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 font-medium text-foreground">Feature</th>
                      <th className="text-left p-3 font-medium text-foreground">Stripe Connect ⭐</th>
                      <th className="text-left p-3 font-medium text-foreground">PayPal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3 font-medium text-foreground">{row.feature}</td>
                        <td className="p-3 text-muted-foreground">{row.stripe}</td>
                        <td className="p-3 text-muted-foreground">{row.paypal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ── Objections ── */}
            <TabsContent value="objections" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Common Objections & Responses</h2>
              <div className="space-y-4">
                {OBJECTIONS.map((obj, i) => (
                  <Card key={i}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="font-semibold text-foreground text-sm">Objection: {obj.q}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-7">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{obj.a}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

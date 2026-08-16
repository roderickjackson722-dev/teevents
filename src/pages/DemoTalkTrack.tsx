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
  CheckCircle2, DollarSign, Users, Banknote, ChevronRight, Zap
} from "lucide-react";
import Layout from "@/components/Layout";

/* ────── flow diagram data (Direct Charges) ────── */
const FLOW_STEPS = [
  { icon: Users, label: "Golfer Pays", detail: "$100 registration", color: "bg-primary" },
  { icon: CreditCard, label: "Stripe Connect Direct Charge", detail: "Lives on organizer's Stripe account", color: "bg-primary/80" },
  { icon: DollarSign, label: "5% Application Fee", detail: "Routed to TeeVents", color: "bg-secondary" },
  { icon: Zap, label: "Stripe Processing", detail: "~2.9% + $0.30", color: "bg-primary/60" },
  { icon: Banknote, label: "Net to Organizer", detail: "Lands in YOUR Stripe balance instantly", color: "bg-emerald-600" },
  { icon: Building2, label: "Bank Transfer", detail: "Stripe's 2-day rolling schedule", color: "bg-emerald-700" },
];

/* ────── $100 breakdown ────── */
const SAMPLE_BREAKDOWN = [
  { label: "Registration Price (fees absorbed)", amount: "$100.00" },
  { label: "TeeVents Platform Fee (5%)", amount: "−$5.00" },
  { label: "Stripe Processing (~2.9% + $0.30)", amount: "−$3.20" },
  { label: "Net in Your Stripe Account", amount: "$91.80", bold: true },
];

/* ────── objections ────── */
const OBJECTIONS = [
  {
    q: '"How do I know TeeVents won\'t hold my money?"',
    a: "Every payment uses Stripe Connect Direct Charges. The charge is created on YOUR connected Stripe account — TeeVents only takes a 5% application fee. The funds never touch a TeeVents balance. You can verify it in your own Stripe dashboard.",
  },
  {
    q: '"What about chargebacks and refunds?"',
    a: "Since the charge lives on your Stripe account, you are the merchant of record. Refunds are one-click from your TeeVents dashboard and pull from your own Stripe balance. Chargebacks are handled between your Stripe account and the cardholder's bank — Stripe's dispute tools work the same as if you were processing payments yourself.",
  },
  {
    q: '"I already have a Stripe account"',
    a: "Great — you can connect your existing Stripe account during onboarding. It takes 2–3 minutes, and registrations start flowing into the account you already use.",
  },
  {
    q: '"What if I need money before my event?"',
    a: "Funds settle in your Stripe balance at the moment of checkout. You don't wait for a TeeVents payout. Stripe transfers to your bank on its 2-day rolling schedule (configurable to daily, weekly, or instant for a small fee).",
  },
];

/* ────── faq ────── */
const FAQ_ITEMS = [
  {
    q: "Why direct to the organizer's Stripe account?",
    a: "Two reasons: (1) Compliance — the organizer is legally the merchant of record for the tournament, which is cleaner for taxes and chargebacks. (2) Speed — funds are available the moment the charge clears, instead of waiting for a platform payout.",
  },
  {
    q: "Does TeeVents see my money?",
    a: "No. Only the 5% application fee is routed to TeeVents. The other 95% (minus Stripe processing) settles directly in your Stripe account. We have read-only access via Stripe Connect to show transactions in your TeeVents dashboard.",
  },
  {
    q: "What about new Stripe accounts?",
    a: "Brand-new Stripe accounts go through a standard 2–7 business-day initial review on first payouts to bank. This is a Stripe risk policy, not a TeeVents hold — it lifts automatically once Stripe verifies the account.",
  },
];

/* ────── comparison table ────── */
const COMPARISON = [
  { feature: "Setup", stripe: "2–3 minute onboarding", paypal: "Enter email address" },
  { feature: "Funds settlement", stripe: "Instant, in your Stripe balance", paypal: "Per payout request" },
  { feature: "Bank transfer", stripe: "Stripe's 2-day rolling schedule", paypal: "1–5 business days" },
  { feature: "Additional fees", stripe: "None (Stripe processing only)", paypal: "1% or $0.50 per payout" },
  { feature: "Dashboard", stripe: "Embedded in TeeVents + your Stripe", paypal: "PayPal website" },
];

/* ────── full script text for copy ────── */
function buildFullScript(): string {
  return `TEEVENTS DEMO CALL — PAYMENT TALK TRACK
========================================

INTRODUCTION
"Let me walk you through how payments work on TeeVents. The big thing to understand is that TeeVents never holds your money. Every payment goes directly into YOUR Stripe account at checkout."

HOW FUNDS FLOW
1. Golfer registers and pays by credit card, Apple Pay, or Google Pay.
2. The charge is created using Stripe Connect Direct Charges — meaning the payment is processed on YOUR connected Stripe account, not on a TeeVents balance.
3. TeeVents takes a 5% application fee directly from the charge.
4. Stripe takes its standard processing fee (~2.9% + $0.30).
5. The net amount lands instantly in YOUR Stripe balance.
6. Stripe transfers funds to your bank on its 2-day rolling schedule (or daily/weekly/instant if you configure it in Stripe).

SAMPLE $100 REGISTRATION (FEES ABSORBED)
• Registration Price: $100.00
• TeeVents Platform Fee (5%): −$5.00
• Stripe Processing (~2.9% + $0.30): −$3.20
• Net in Your Stripe Account: $91.80

KEY MESSAGE
"TeeVents is just the software. Your money is yours, in your Stripe account, from the moment a golfer pays. We never hold, escrow, or release funds — there's no payout schedule on our end to wait on."

REFUNDS & CHARGEBACKS
"Because the charge lives on your Stripe account, you are the merchant of record. That means:
• Refunds are one-click from your TeeVents dashboard and pull from your own Stripe balance.
• Chargebacks are handled directly between your Stripe account and the cardholder's bank.
• You get Stripe's full dispute toolkit, the same as any direct Stripe merchant."

COMMON OBJECTIONS
• "How do I know you won't hold my money?" → Verify it yourself in your Stripe dashboard. Every charge will show on YOUR account with our 5% application fee broken out.
• "What about refunds?" → One-click from your TeeVents dashboard, pulled from your Stripe balance.
• "I already have a Stripe account." → Perfect — connect it during onboarding in 2–3 minutes.
• "What if I need money before my event?" → It's already in your Stripe account. Configure Stripe to transfer to your bank daily, weekly, or instantly.
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
              <p className="text-xs text-secondary italic mt-1">Built by golf tournament managers, for golf tournament managers.</p>
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
                "TeeVents never holds your money. Every payment lands directly in your Stripe
                account the moment a golfer pays — we only take a 5% platform fee. Let me walk
                you through exactly how it works."
              </p>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="flow" className="text-xs">Fund Flow</TabsTrigger>
              <TabsTrigger value="settlement" className="text-xs">Settlement</TabsTrigger>
              <TabsTrigger value="compare" className="text-xs">Stripe vs PayPal</TabsTrigger>
              <TabsTrigger value="objections" className="text-xs">Objections</TabsTrigger>
            </TabsList>

            {/* ── Fund Flow ── */}
            <TabsContent value="flow" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">How Funds Flow (Direct Charges)</h2>

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

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sample $100 Registration (fees absorbed)</CardTitle>
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
            </TabsContent>

            {/* ── Settlement ── */}
            <TabsContent value="settlement" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Settlement & Bank Transfers</h2>

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <Badge variant="outline" className="mb-3 text-xs">SAY THIS</Badge>
                  <div className="space-y-4 text-sm md:text-base text-foreground/90 leading-relaxed italic">
                    <p>"Because we use Stripe Connect Direct Charges, the money is already in YOUR Stripe account the instant a golfer pays. There's no TeeVents payout schedule to wait on.</p>
                    <p>From there, Stripe transfers to your bank on its standard 2-business-day rolling schedule. You can change that to daily, weekly, monthly, or even instant payouts inside your Stripe dashboard."</p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <h3 className="text-base font-semibold text-foreground">FAQ</h3>
              <Accordion type="multiple" className="w-full">
                {FAQ_ITEMS.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-sm">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Standard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>• Funds settle in your Stripe balance instantly</p>
                    <p>• Stripe transfers to bank on 2-day rolling schedule</p>
                    <p>• No TeeVents action needed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" /> Configurable
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>• Daily / weekly / monthly payout cadence</p>
                    <p>• Instant payouts available (Stripe fee applies)</p>
                    <p>• Manual transfers anytime from Stripe</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Compare ── */}
            <TabsContent value="compare" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Stripe Connect vs PayPal</h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Feature</th>
                        <th className="text-left p-3 font-medium">Stripe Connect ⭐</th>
                        <th className="text-left p-3 font-medium">PayPal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-3 font-medium text-foreground">{r.feature}</td>
                          <td className="p-3 text-muted-foreground">{r.stripe}</td>
                          <td className="p-3 text-muted-foreground">{r.paypal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Objections ── */}
            <TabsContent value="objections" className="space-y-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground">Handling Objections</h2>
              <Accordion type="multiple" className="w-full">
                {OBJECTIONS.map((o, i) => (
                  <AccordionItem key={i} value={`obj-${i}`}>
                    <AccordionTrigger className="text-sm">{o.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{o.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <Card className="bg-secondary/10 border-secondary/30">
                <CardContent className="p-6 text-sm">
                  <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Closer
                  </p>
                  <p className="italic text-foreground/90">
                    "The bottom line: TeeVents is software you rent for 5% per transaction. Your money is yours. Want to start a tournament right now, or would a quick walkthrough be more useful?"
                  </p>
                  <div className="mt-4 flex gap-2">
                    <a href="/get-started" className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline">
                      Start a Tournament for Free <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-muted-foreground">·</span>
                    <a href="/request-sample" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Request a Sample <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="text-center text-xs text-muted-foreground pt-4">
            Pricing model: Stripe Connect Direct Charges • 5% TeeVents application fee • No TeeVents hold or escrow
            <span className="hidden">{Clock.name}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

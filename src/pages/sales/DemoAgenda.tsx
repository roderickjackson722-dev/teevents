import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Monitor, Users, CreditCard, Landmark, HelpCircle,
  CheckCircle2, ArrowRight, Calendar, Download, Mail,
  Globe, Trophy, BarChart3, Shield, Smartphone, QrCode,
  Clock, DollarSign, FileText, Zap, Copy, Check,
  ChevronRight, Star, TrendingUp, Banknote
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SEO from "@/components/SEO";

const SECTIONS = [
  { icon: Monitor, label: "Platform Overview", time: "5 min" },
  { icon: Trophy, label: "Tournament Setup", time: "10 min" },
  { icon: CreditCard, label: "Payment & Fees", time: "10 min" },
  { icon: Landmark, label: "Organizer Payouts", time: "10 min" },
  { icon: HelpCircle, label: "Q&A", time: "5-10 min" },
];

function ProgressTracker({ activeSection }: { activeSection: number }) {
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === activeSection;
          const isDone = i < activeSection;
          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1 relative">
              {i > 0 && (
                <div className={`absolute top-5 -left-1/2 w-full h-0.5 ${isDone ? "bg-primary" : "bg-border"}`} />
              )}
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className="text-xs text-center font-medium hidden sm:block">{s.label}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">{s.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeeCalculator() {
  const [fee, setFee] = useState(150);
  const [golfers, setGolfers] = useState(100);
  const [passToGolfer, setPassToGolfer] = useState(false);

  const stripeFee = fee * 0.029 + 0.3;
  const platformFee = fee * 0.05;
  const totalCollected = fee * golfers;

  const golferPays = passToGolfer ? fee + platformFee + stripeFee : fee;
  const orgReceives = passToGolfer ? fee * golfers : (fee - platformFee - stripeFee) * golfers;
  const totalPlatformFees = platformFee * golfers;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Tournament Fee Calculator</CardTitle>
        <CardDescription>See exactly what you'll earn</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Registration Fee ($)</label>
            <Input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className="text-sm font-medium">Expected Golfers</label>
            <Input type="number" value={golfers} onChange={e => setGolfers(Number(e.target.value))} min={1} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={!passToGolfer ? "default" : "outline"} onClick={() => setPassToGolfer(false)}>Absorb Fees</Button>
          <Button size="sm" variant={passToGolfer ? "default" : "outline"} onClick={() => setPassToGolfer(true)}>Pass to Golfer</Button>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground">Golfer Pays</p>
            <p className="text-2xl font-bold">${golferPays.toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold">${(golferPays * golfers).toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">Platform Fees (4%)</p>
            <p className="text-lg font-semibold text-destructive">-${totalPlatformFees.toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">Your Net Payout</p>
            <p className="text-2xl font-bold text-primary">${orgReceives.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function DemoAgenda() {
  return (
    <>
      <SEO title="TeeVents Demo Agenda | Golf Tournament Platform" description="Review the TeeVents demo agenda covering platform overview, tournament setup, payment flow, organizer payouts, and Q&A." />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="bg-[hsl(var(--primary))] text-primary-foreground py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <Badge variant="secondary" className="text-sm">30-Minute Demo</Badge>
            <h1 className="text-3xl md:text-5xl font-bold font-playfair">TeeVents Platform Demo</h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              See how TeeVents simplifies golf tournament management — from registration to payouts.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button size="lg" variant="secondary" asChild>
                <a href="https://calendly.com/teevents-golf/demo" target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-5 w-5 mr-2" /> Schedule Your Demo
                </a>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <a href="mailto:info@teevents.golf">
                  <Mail className="h-5 w-5 mr-2" /> info@teevents.golf
                </a>
              </Button>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
          <ProgressTracker activeSection={-1} />

          {/* Section 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Monitor className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle>1. Platform Overview</CardTitle>
                  <CardDescription>5 minutes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">What is TeeVents?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> All-in-one platform for golf tournament management</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Designed for nonprofits, corporations, and golf clubs</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> No technical skills required</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Who Uses TeeVents?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Users, label: "Charity tournament organizers" },
                    { icon: Trophy, label: "Golf clubs & courses" },
                    { icon: Globe, label: "Corporate event planners" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <item.icon className="h-4 w-4 text-primary shrink-0" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">The Problem We Solve</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    "Stop juggling spreadsheets & emails",
                    "Eliminate manual payment collection",
                    "Streamline registration, pairings & scoring",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg border text-sm">
                      <Zap className="h-4 w-4 text-primary shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle>2. Tournament Setup</CardTitle>
                  <CardDescription>10 minutes — Live walkthrough</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { step: "1", title: "Create Your Tournament", desc: "Enter event name, date, course, and registration fee. Set up in under 3 minutes." },
                { step: "2", title: "Choose Your Fee Model", desc: "Decide who pays the platform fee — you or your golfers." },
                { step: "3", title: "Customize Your Tournament Site", desc: "Add your logo, branding, sponsors, and customize registration fields." },
                { step: "4", title: "Publish & Share", desc: "Get your unique registration URL. Share via email, social media, or QR code." },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{item.step}</div>
                  <div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}

              <Separator />
              <h3 className="font-semibold">Fee Model Comparison</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Golfer Pays</TableHead>
                    <TableHead>You Receive</TableHead>
                    <TableHead>Best For</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">Pass to Golfer</TableCell>
                    <TableCell>Registration + 4% + Stripe</TableCell>
                    <TableCell>Full registration amount</TableCell>
                    <TableCell><Badge variant="secondary">Premium events</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Absorb Fees</TableCell>
                    <TableCell>Registration only</TableCell>
                    <TableCell>Registration − 4% − Stripe</TableCell>
                    <TableCell><Badge variant="secondary">Nonprofits</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle>3. Payment & Fees</CardTitle>
                  <CardDescription>10 minutes — Live walkthrough</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">The Golfer Experience</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: FileText, title: "Register", items: ["Clean, branded page", "Player details & group registration", "Custom fields"] },
                    { icon: CreditCard, title: "Checkout", items: ["Stripe-powered payments", "Apple Pay / Google Pay", "Clear fee breakdown"] },
                    { icon: QrCode, title: "Confirmation", items: ["Instant email with QR code", "Calendar integration", "Course map & rules"] },
                  ].map((card, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2"><card.icon className="h-4 w-4 text-primary" /><h4 className="font-semibold text-sm">{card.title}</h4></div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {card.items.map((it, j) => <li key={j} className="flex gap-1.5"><ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">The Organizer Dashboard</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: BarChart3, title: "Real-time Dashboard", desc: "Live registration count, revenue tracking, player roster" },
                    { icon: FileText, title: "Transaction History", desc: "Every payment tracked, export to CSV" },
                  ].map((card, i) => (
                    <div key={i} className="border rounded-lg p-4 flex gap-3">
                      <card.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div><h4 className="font-semibold text-sm">{card.title}</h4><p className="text-xs text-muted-foreground">{card.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Landmark className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle>4. Organizer Payouts</CardTitle>
                  <CardDescription>10 minutes — How you get paid</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Money Flow */}
              <div>
                <h3 className="font-semibold mb-3">The Money Flow</h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg text-sm">
                  {[
                    { icon: CreditCard, label: "Golfer Pays" },
                    { icon: Shield, label: "Stripe Processes" },
                    { icon: Banknote, label: "85% Released" },
                    { icon: Clock, label: "15% Held 15 Days" },
                    { icon: Landmark, label: "You Get Paid" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1 min-w-[80px]">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><step.icon className="h-4 w-4 text-primary" /></div>
                        <span className="text-xs text-center">{step.label}</span>
                      </div>
                      {i < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup Steps */}
              <div>
                <h3 className="font-semibold mb-3">Setting Up Payouts</h3>
                <ol className="space-y-2 text-sm">
                  {["Connect your Stripe account (2-3 minutes)", "Enter bank account details", "Receive automatic payouts every other Monday"].map((step, i) => (
                    <li key={i} className="flex gap-2 items-start"><span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span><span className="text-muted-foreground">{step}</span></li>
                  ))}
                </ol>
              </div>

              {/* Payout Options */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Stripe Connect ⭐</TableHead>
                    <TableHead>PayPal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Setup Time", "2-3 minutes", "1 minute"],
                    ["Payout Speed", "1-3 business days", "5-7 business days"],
                    ["Extra Fees", "None", "1% or $0.50"],
                    ["Automatic", "✅ Bi-weekly", "Manual only"],
                  ].map(([feat, stripe, pp], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{feat}</TableCell>
                      <TableCell>{stripe}</TableCell>
                      <TableCell>{pp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 5 — Q&A */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><HelpCircle className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle>5. Q&A & Next Steps</CardTitle>
                  <CardDescription>5-10 minutes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { q: "How do I know I'll get paid?", a: "Stripe handles all payments — the same platform used by Amazon and Shopify. Your money is held in your own Stripe account and you can withdraw anytime." },
                  { q: "What if a golfer asks for a refund?", a: "Refunds come from the 15% hold first. You're never charged extra. One-click refund from your dashboard." },
                  { q: "What about chargebacks?", a: "The 15% hold protects you. After 15 days post-event, the remaining balance is released automatically." },
                  { q: "Can I try it before committing?", a: "Yes! Create a free account, set up a test tournament with $1 registration, and process a real payment. Refund immediately to see the full flow." },
                ].map((item, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-1">"{item.q}"</h4>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </div>
                ))}
              </div>

              <Separator />
              <h3 className="font-semibold">Next Steps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: "Self-Service", desc: "Create your account and set up your first tournament today.", cta: "Get Started", href: "/get-started" },
                  { title: "Guided Setup", desc: "Schedule a 15-minute setup call. We'll configure your tournament together.", cta: "Book Setup Call", href: "https://calendly.com/teevents-golf/demo" },
                  { title: "Full-Service", desc: "We manage everything — sponsor acquisition, coordination, and day-of.", cta: "Coming Soon", href: null },
                ].map((opt, i) => (
                  <div key={i} className="border rounded-lg p-4 flex flex-col">
                    <h4 className="font-semibold text-sm">{opt.title}</h4>
                    <p className="text-xs text-muted-foreground flex-1 mt-1">{opt.desc}</p>
                    {opt.href ? (
                      <Button size="sm" className="mt-3 w-full" asChild>
                        <a href={opt.href} target={opt.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{opt.cta}</a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="mt-3 w-full" disabled>{opt.cta}</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fee Calculator */}
          <FeeCalculator />

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Pricing</CardTitle>
              <CardDescription>Simple, transparent pricing. 5% platform fee per transaction.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-center">Starter</TableHead>
                    <TableHead className="text-center">Pro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Platform Fee", "4%", "4%"],
                    ["Tournaments / Year", "3", "Unlimited"],
                    ["Players / Tournament", "50", "500+"],
                    ["Sponsor Showcase", "✓", "✓"],
                    ["Auction Tools", "—", "✓"],
                    ["SMS Notifications", "—", "✓"],
                    ["Priority Support", "Email", "Phone + Email"],
                    ["Price", "$49/mo", "$149/mo"],
                  ].map(([feat, starter, pro], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{feat}</TableCell>
                      <TableCell className="text-center">{starter}</TableCell>
                      <TableCell className="text-center">{pro}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* CTA Footer */}
          <div className="text-center py-12 space-y-4">
            <h2 className="text-2xl font-bold font-playfair">Ready to Simplify Your Tournament?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Join organizers who save 20+ hours per event with TeeVents.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <a href="https://calendly.com/teevents-golf/demo" target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-5 w-5 mr-2" /> Schedule Demo
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/get-started"><ArrowRight className="h-5 w-5 mr-2" /> Create Free Account</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Flag, Loader2, CheckCircle2, ArrowLeft, Mail, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import logo from "@/assets/logo-black.png";

type Step = "interest" | "personal" | "organization" | "security" | "sent" | "flagged";
type Interest = "tournament" | "league";

const planLabels: Record<string, string> = {
  "no-cost": "No Cost to Start",
  "per-event": "Per-Event",
  "per-league": "Per-League",
};
const ROLES = ["Tournament Director", "Club Manager", "Event Coordinator", "Coach", "League Manager", "Other"];
const EVENTS = ["1-2", "3-5", "6-10", "10+"];
const SOURCES = ["Facebook", "Instagram", "LinkedIn", "Google Search", "Word of Mouth", "Golf Course", "Other"];
const DISPOSABLE = ["mailinator.com", "temp-mail.org", "tempmail.com", "10minutemail.com", "guerrillamail.com", "yopmail.com", "trashmail.com", "getnada.com", "maildrop.cc", "throwawaymail.com", "sharklasers.com", "dispostable.com", "mailsac.com", "mail.tm"];

declare global {
  interface Window { hcaptcha?: any; }
}

const STEPS: { key: Step; label: string }[] = [
  { key: "personal", label: "You" },
  { key: "organization", label: "Organization" },
  { key: "security", label: "Finish" },
];

function Req() { return <span className="text-destructive">*</span>; }
function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive mt-1">{msg}</p> : null;
}

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const selectedPlan = searchParams.get("plan") || "";

  const [step, setStep] = useState<Step>("interest");
  const [loading, setLoading] = useState(false);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [f, setF] = useState({
    full_legal_name: "", email: "", phone_number: "",
    organization_name: "", organization_website: "", role: "", events_per_year: "", event_description: "",
    paid_registrations: null as boolean | null, referral_source: "",
  });
  const set = (k: keyof typeof f, v: any) => { setF((p) => ({ ...p, [k]: v })); setTouched((t) => ({ ...t, [k]: true })); };

  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<any>(null);

  useEffect(() => {
    const interestParam = searchParams.get("interest");
    const planParam = searchParams.get("plan");
    const planInterest: Interest | null = planParam === "per-league" ? "league"
      : planParam === "no-cost" || planParam === "per-event" ? "tournament" : null;
    if (planInterest || interestParam === "tournament" || interestParam === "league") {
      setInterest(planInterest || (interestParam as Interest));
      setStep("personal");
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.functions.invoke("signup-with-vetting", { method: "GET" })
      .then(({ data }) => setSiteKey((data as any)?.hcaptcha_site_key || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== "security" || !siteKey || !captchaRef.current) return;
    const render = () => {
      if (!window.hcaptcha || !captchaRef.current || widgetId.current !== null) return;
      widgetId.current = window.hcaptcha.render(captchaRef.current, {
        sitekey: siteKey,
        callback: (t: string) => setCaptchaToken(t),
        "expired-callback": () => setCaptchaToken(""),
      });
    };
    if (window.hcaptcha) { render(); return; }
    const s = document.createElement("script");
    s.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
    return () => { widgetId.current = null; };
  }, [step, siteKey]);

  const errors: Record<string, string | undefined> = {
    full_legal_name: f.full_legal_name.trim().length < 2 ? "Enter your full legal name." : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? "Enter a valid email address."
      : DISPOSABLE.includes(f.email.split("@")[1]?.toLowerCase() || "") ? "Temporary email addresses aren't accepted." : undefined,
    phone_number: f.phone_number.replace(/\D/g, "").length < 10 ? "Enter a valid phone number." : undefined,
    organization_name: !f.organization_name.trim() ? "Enter your organization name." : undefined,
    organization_website: !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(f.organization_website.trim()) ? "Enter a valid website (e.g. yourclub.com)." : undefined,
    role: !f.role ? "Select your role." : undefined,
    events_per_year: !f.events_per_year ? "Select how many events." : undefined,
    event_description: f.event_description.trim().length < 10 ? "Tell us a little about your event (10+ characters)." : undefined,
    paid_registrations: f.paid_registrations === null ? "Please choose Yes or No." : undefined,
  };
  const show = (k: string) => (touched[k] ? errors[k] : undefined);
  const stepFields: Record<string, string[]> = {
    personal: ["full_legal_name", "email", "phone_number"],
    organization: ["organization_name", "organization_website", "role", "events_per_year", "event_description"],
    security: ["paid_registrations"],
  };
  const next = (from: Step, to: Step) => {
    const fields = stepFields[from] || [];
    setTouched((t) => ({ ...t, ...Object.fromEntries(fields.map((k) => [k, true])) }));
    if (fields.some((k) => errors[k])) return;
    setStep(to);
  };

  const handleSubmit = async () => {
    const all = Object.values(stepFields).flat();
    setTouched((t) => ({ ...t, ...Object.fromEntries(all.map((k) => [k, true])) }));
    if (!interest || all.some((k) => errors[k])) return;
    if (siteKey && !captchaToken) {
      toast({ title: "Almost there", description: "Please complete the human verification.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-with-vetting", {
        body: {
          ...f,
          email: f.email.trim(),
          referral_source: f.referral_source || null,
          interest_area: interest,
          captcha_token: captchaToken || null,
          origin: window.location.origin,
        },
      });
      if (error) {
        let msg = error.message;
        try { const b = await (error as any).context?.json(); if (b?.error) msg = b.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      try {
        localStorage.setItem("teevents.pendingWorkspace", JSON.stringify({
          interest_area: interest, organization_name: f.organization_name.trim() || null, selected_plan: selectedPlan || null,
        }));
      } catch { /* ignore */ }
      setStep((data as any)?.status === "flagged" ? "flagged" : "sent");
    } catch (e: any) {
      toast({ title: "Sign up failed", description: e?.message || "Please try again.", variant: "destructive" });
      if (window.hcaptcha && widgetId.current !== null) { window.hcaptcha.reset(widgetId.current); setCaptchaToken(""); }
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12">
      <SEO title="Sign Up — TeeVents" description="Create your TeeVents account to manage golf tournaments or golf leagues." />
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <img src={logo} alt="TeeVents" className="h-12 mx-auto mb-3" />
        </div>

        {step === "interest" && (
          <Card>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-3xl font-bold">Welcome to TeeVents</h1>
                <p className="text-muted-foreground">What would you like to manage?</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <button type="button" onClick={() => setInterest("tournament")}
                  className={`text-left border-2 rounded-xl p-6 transition-all hover:shadow-md ${interest === "tournament" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3"><Trophy className="h-6 w-6 text-primary" /></div>
                  <h3 className="font-bold text-lg">Golf Tournaments</h3>
                  <p className="text-sm text-muted-foreground mt-1">Single or multi-day events, sponsors, registration, live scoring, and payouts.</p>
                </button>
                <button type="button" onClick={() => setInterest("league")}
                  className={`text-left border-2 rounded-xl p-6 transition-all hover:shadow-md ${interest === "league" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-3"><Flag className="h-6 w-6 text-secondary" /></div>
                  <h3 className="font-bold text-lg">Golf Leagues</h3>
                  <p className="text-sm text-muted-foreground mt-1">Season long play, weekly events, standings, skins, and handicaps.</p>
                  <p className="text-xs mt-2 font-medium text-primary">$399/year + 5% platform fee</p>
                </button>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
                <Button onClick={() => setStep("personal")} disabled={!interest}>Continue</Button>
              </div>
              <p className="text-center text-sm text-muted-foreground pt-2">
                Already have an account? <Link to="/get-started?mode=signin" className="text-primary underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        )}

        {stepIdx >= 0 && interest && (
          <Card>
            <CardContent className="p-8 space-y-5">
              {/* Progress */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {STEPS.map((s, i) => (
                    <div key={s.key} className="flex-1">
                      <div className={`h-1.5 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
                      <p className={`text-xs mt-1 ${i === stepIdx ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{i + 1}. {s.label}</p>
                    </div>
                  ))}
                </div>
                {planLabels[selectedPlan] && (
                  <p className="text-xs text-muted-foreground">{planLabels[selectedPlan]} selected</p>
                )}
              </div>

              {step === "personal" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Personal information</h1>
                    <p className="text-muted-foreground text-sm">Fields marked <Req /> are required.</p>
                  </div>
                  <div>
                    <Label htmlFor="full_legal_name">Full Legal Name <Req /></Label>
                    <Input id="full_legal_name" value={f.full_legal_name} onChange={(e) => set("full_legal_name", e.target.value)} placeholder="Jane Smith" maxLength={120} />
                    <Err msg={show("full_legal_name")} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address <Req /></Label>
                    <Input id="email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@yourclub.com" maxLength={255} />
                    <Err msg={show("email")} />
                  </div>
                  <div>
                    <Label htmlFor="phone_number">Phone Number <Req /></Label>
                    <Input id="phone_number" type="tel" value={f.phone_number} onChange={(e) => set("phone_number", e.target.value)} placeholder="(555) 555-5555" maxLength={30} />
                    <Err msg={show("phone_number")} />
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("interest")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                    <Button onClick={() => next("personal", "organization")}>Continue</Button>
                  </div>
                </>
              )}

              {step === "organization" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Organization information</h1>
                    <p className="text-muted-foreground text-sm">Helps us verify legitimate organizers.</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organization_name">Organization Name <Req /></Label>
                      <Input id="organization_name" value={f.organization_name} onChange={(e) => set("organization_name", e.target.value)} placeholder="Pinehurst Ridge Golf Club" maxLength={150} />
                      <Err msg={show("organization_name")} />
                    </div>
                    <div>
                      <Label htmlFor="organization_website">Organization Website URL <Req /></Label>
                      <Input id="organization_website" type="url" value={f.organization_website} onChange={(e) => set("organization_website", e.target.value)} placeholder="https://yourclub.com" maxLength={300} />
                      <Err msg={show("organization_website")} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Your Role in the Organization <Req /></Label>
                      <Select value={f.role} onValueChange={(v) => set("role", v)}>
                        <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                      <Err msg={show("role")} />
                    </div>
                    <div>
                      <Label>Tournaments or leagues in the next 12 months <Req /></Label>
                      <Select value={f.events_per_year} onValueChange={(v) => set("events_per_year", v)}>
                        <SelectTrigger><SelectValue placeholder="Select a range" /></SelectTrigger>
                        <SelectContent>{EVENTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                      <Err msg={show("events_per_year")} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="event_description">Brief Description of Your Upcoming Event(s) <Req /></Label>
                    <Textarea id="event_description" rows={4} value={f.event_description} onChange={(e) => set("event_description", e.target.value)} placeholder="e.g. Annual charity scramble, 144 players, October 2026" maxLength={2000} />
                    <Err msg={show("event_description")} />
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("personal")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                    <Button onClick={() => next("organization", "security")}>Continue</Button>
                  </div>
                </>
              )}

              {step === "security" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Almost done</h1>
                    <p className="text-muted-foreground text-sm">A couple of final questions.</p>
                  </div>
                  <div>
                    <Label>Will this platform be used for paid registrations? <Req /></Label>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-sm ${f.paid_registrations === false ? "font-semibold" : "text-muted-foreground"}`}>No</span>
                      <Switch checked={f.paid_registrations === true} onCheckedChange={(v) => set("paid_registrations", v)} />
                      <span className={`text-sm ${f.paid_registrations === true ? "font-semibold" : "text-muted-foreground"}`}>Yes</span>
                      {f.paid_registrations === null && (
                        <Button type="button" size="sm" variant="outline" onClick={() => set("paid_registrations", false)}>No</Button>
                      )}
                    </div>
                    <Err msg={show("paid_registrations")} />
                  </div>
                  <div>
                    <Label>How did you hear about TeeVents? <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Select value={f.referral_source} onValueChange={(v) => set("referral_source", v)}>
                      <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                      <SelectContent>{SOURCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {siteKey && <div ref={captchaRef} className="pt-1" />}
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("organization")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create My Account
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "sent" && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Mail className="h-8 w-8 text-primary" /></div>
              <h1 className="text-2xl font-bold">Thank you!</h1>
              <p className="text-muted-foreground">
                We're reviewing your account. You'll receive an email once approved. We also sent a link to{" "}
                <span className="font-medium text-foreground">{f.email}</span> — click it to verify your email and set your password.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Account created
              </div>
              <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
            </CardContent>
          </Card>
        )}

        {step === "flagged" && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto"><ShieldAlert className="h-8 w-8 text-accent-foreground" /></div>
              <h1 className="text-2xl font-bold">One more step</h1>
              <p className="text-muted-foreground">
                We need a little more information to verify your account. Check your email for next steps.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

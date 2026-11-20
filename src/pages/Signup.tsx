import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Flag, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import logo from "@/assets/logo-black.png";
import { createSignup } from "@/lib/signup.functions";
import { getIntake, submitIntake, uploadIntakeLogo } from "@/lib/intake.functions";
import {
  FORMATS_TOURNAMENT, WEEKDAYS, BUILD_CHOICES, SUMMARY_KEYS, contactSchema, intakeValue,
  tournamentEventSchema, tournamentIntakeSchema, leagueEventSchema, leagueIntakeSchema, leagueFeeLines,
} from "@/lib/intake.schema";

type Step = "interest" | "personal" | "event" | "registration" | "done";
type Interest = "tournament" | "league";
type D = Record<string, any>;

const planLabels: Record<string, string> = {
  "no-cost": "No Cost to Start",
  "per-event": "Per-Event",
  "per-league": "Per-League",
};
const STEPS: Step[] = ["personal", "event", "registration"];
const TOKEN_KEY = "teevents.intakeToken";

declare global {
  interface Window { hcaptcha?: any; }
}

const blank = (k: Interest): D => k === "tournament"
  ? { eventDate: "", dateNotSet: false, regStartTime: "08:00", eventName: "", orgName: "", courseName: "", courseCityState: "", format: "Not sure yet", fieldSize: "", priceIndividual: "", priceFoursome: "", registrationDeadline: "", sponsorships: "", logoPath: "", colors: "", beneficiary: "", buildChoice: BUILD_CHOICES[0], notes: "" }
  : { leagueName: "", orgName: "", seasonStart: "", seasonEnd: "", datesNotSet: false, courseName: "", courseCityState: "", days: [], weeks: "", players: "", feePerPlayer: "", additionalCourses: "", teeTime: "", standingsDetails: "", sponsorships: "", logoPath: "", colors: "", buildChoice: BUILD_CHOICES[0], notes: "" };

function Req() { return <span className="text-destructive">*</span>; }
function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive mt-1">{msg}</p> : null;
}
const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
const COURSE_HELP = "Leave blank if you do not have a course yet.";

function issues(r: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }): Record<string, string> {
  const out: Record<string, string> = {};
  if (!r.success) for (const i of r.error!.issues) { const k = String(i.path[0]); if (!out[k]) out[k] = i.message; }
  return out;
}

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const selectedPlan = searchParams.get("plan") || "";
  const editToken = searchParams.get("edit");

  const [step, setStep] = useState<Step>("interest");
  const [loading, setLoading] = useState(false);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [c, setC] = useState({ first_name: "", last_name: "", email: "", phone_number: "" });
  const [d, setD] = useState<D>(blank("tournament"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [skippedDone, setSkippedDone] = useState(false);

  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<any>(null);

  const setField = (k: string, v: unknown) => { setD(p => ({ ...p, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };
  const setContact = (k: keyof typeof c, v: string) => { setC(p => ({ ...p, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };

  useEffect(() => {
    if (editToken) return;
    const interestParam = searchParams.get("interest");
    const planParam = searchParams.get("plan");
    const planInterest: Interest | null = planParam === "per-league" ? "league"
      : planParam === "no-cost" || planParam === "per-event" ? "tournament" : null;
    if (planInterest || interestParam === "tournament" || interestParam === "league") {
      const k = planInterest || (interestParam as Interest);
      setInterest(k); setD(blank(k));
      setStep("personal");
    }
  }, [searchParams, editToken]);

  // Edit my details (or finish details after a plan payment): reopen Steps 2 and 3.
  useEffect(() => {
    if (!editToken) return;
    getIntake({ data: { token: editToken } }).then((row: any) => {
      if (!row) { toast({ title: "This link is no longer valid.", variant: "destructive" }); return; }
      const k = row.interest as Interest;
      setInterest(k); setToken(editToken); setD({ ...blank(k), ...(row.details || {}) }); setStep("event");
    }).catch(() => {});
  }, [editToken, toast]);

  useEffect(() => {
    supabase.functions.invoke("signup-with-vetting", { method: "GET" })
      .then(({ data }) => setSiteKey((data as any)?.hcaptcha_site_key || null))
      .catch(() => {});
  }, []);

  const needsCaptcha = !token && (step === "event" || step === "registration");
  useEffect(() => {
    if (!needsCaptcha || !siteKey || !captchaRef.current) return;
    const render = () => {
      if (!window.hcaptcha || !captchaRef.current || widgetId.current !== null) return;
      widgetId.current = window.hcaptcha.render(captchaRef.current, {
        sitekey: siteKey,
        callback: (t: string) => setCaptchaToken(t),
        "expired-callback": () => setCaptchaToken(""),
      });
    };
    if (window.hcaptcha) { render(); return; }
    const sc = document.createElement("script");
    sc.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    sc.async = true;
    sc.onload = render;
    document.head.appendChild(sc);
    return () => { widgetId.current = null; setCaptchaToken(""); };
  }, [needsCaptcha, step, siteKey]);

  const kind: Interest = interest || "tournament";
  const goNextFromPersonal = () => {
    const e = issues(contactSchema.safeParse(c));
    setErrors(e);
    if (!Object.keys(e).length) setStep("event");
  };
  const goNextFromEvent = () => {
    const r = (kind === "league" ? leagueEventSchema : tournamentEventSchema).safeParse(d);
    const e = issues(r);
    if (kind === "tournament" && !d["dateNotSet"] && !/^\d{4}-\d{2}-\d{2}$/.test(d["eventDate"])) e["eventDate"] = "Choose the tournament date, or check Date not set yet.";
    if (kind === "league" && !d["datesNotSet"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d["seasonStart"])) e["seasonStart"] = "Choose the season start date, or check Dates not set yet.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d["seasonEnd"])) e["seasonEnd"] = "Choose the season end date, or check Dates not set yet.";
    }
    setErrors(e);
    if (!Object.keys(e).length) setStep("registration");
  };

  const uploadLogo = async (t: string): Promise<string> => {
    if (!logoFile) return d["logoPath"] || "";
    try {
      const base64 = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] || ""); fr.onerror = rej; fr.readAsDataURL(logoFile); });
      const r = await uploadIntakeLogo({ data: { token: t, fileName: logoFile.name, contentType: logoFile.type === "image/png" ? "image/png" : "image/jpeg", base64 } });
      return r.path;
    } catch {
      toast({ title: "Logo not uploaded", description: "You can send it later." });
      return "";
    }
  };

  const submit = async (skipped: boolean) => {
    if (!interest) return;
    if (!skipped) {
      const e = issues((interest === "league" ? leagueIntakeSchema : tournamentIntakeSchema).safeParse(d));
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    // Editing an existing account: save details only.
    if (token) {
      if (skipped) { navigate("/dashboard"); return; }
      setLoading(true);
      try {
        const logoPath = await uploadLogo(token);
        const r = await submitIntake({ data: { token, details: { ...d, logoPath } } });
        if (!r.ok) throw new Error(r.message);
        setD({ ...d, ...r.details }); setStep("done");
      } catch (e: any) {
        toast({ title: "Could not save", description: e?.message || "Please try again.", variant: "destructive" });
      } finally { setLoading(false); }
      return;
    }
    if (siteKey && !captchaToken) {
      toast({ title: "Almost there", description: "Please complete the human verification.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const r = await createSignup({ data: { interest, contact: c, skipped, details: d, selectedPlan, captchaToken, origin: window.location.origin } });
      if (!r.ok) throw new Error(r.message);
      try {
        localStorage.setItem("teevents.pendingWorkspace", JSON.stringify({
          interest_area: interest, organization_name: String(d["orgName"] || "").trim() || null, selected_plan: selectedPlan || null,
        }));
      } catch { /* ignore */ }
      if (r.tokenHash) await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" }).catch(() => null);
      if (r.intakeToken) {
        setToken(r.intakeToken);
        try { sessionStorage.setItem(TOKEN_KEY, r.intakeToken); } catch { /* ignore */ }
        if (!skipped && logoFile) {
          const logoPath = await uploadLogo(r.intakeToken);
          if (logoPath) await submitIntake({ data: { token: r.intakeToken, details: { ...r.details, logoPath } } }).catch(() => null);
        }
      }
      if (skipped) { setSkippedDone(true); navigate("/create-workspace"); return; }
      setD({ ...d, ...r.details });
      setStep("done");
    } catch (e: any) {
      toast({ title: "Sign up failed", description: e?.message || "Please try again.", variant: "destructive" });
      if (window.hcaptcha && widgetId.current !== null) { window.hcaptcha.reset(widgetId.current); setCaptchaToken(""); }
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = STEPS.indexOf(step);
  const stepLabels = ["Your Info", kind === "league" ? "League Info" : "Event Info", "Registration Info"];
  const fee = kind === "league" && d["feePerPlayer"] !== "" && Number(d["feePerPlayer"]) > 0 ? leagueFeeLines(Number(d["feePerPlayer"])) : null;
  const later = !skippedDone && (
    <p className="text-center text-sm"><button type="button" className="text-primary underline underline-offset-4" onClick={() => submit(true)} disabled={loading}>I'll add this later</button></p>
  );
  const captcha = needsCaptcha && siteKey && <div ref={captchaRef} className="pt-1" />;

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
                  <p className="text-xs mt-2 font-medium text-primary">$599 per league · no TeeVents transaction fee</p>
                </button>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
                <Button onClick={() => { if (interest) setD(blank(interest)); setStep("personal"); }} disabled={!interest}>Continue</Button>
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
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {stepLabels.map((label, i) => (
                    <div key={label} className="flex-1">
                      <div className={`h-1.5 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
                      <p className={`text-xs mt-1 ${i === stepIdx ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Step {i + 1} {label}</p>
                    </div>
                  ))}
                </div>
                {planLabels[selectedPlan] && <p className="text-xs text-muted-foreground">{planLabels[selectedPlan]} selected</p>}
              </div>

              {step === "personal" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Your Info</h1>
                    <p className="text-muted-foreground text-sm">Tell us who you are, so your rep knows who to contact.</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name <Req /></Label>
                      <Input id="first_name" value={c.first_name} onChange={(e) => setContact("first_name", e.target.value)} maxLength={80} autoComplete="given-name" />
                      <Err msg={errors["first_name"]} />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name <Req /></Label>
                      <Input id="last_name" value={c.last_name} onChange={(e) => setContact("last_name", e.target.value)} maxLength={80} autoComplete="family-name" />
                      <Err msg={errors["last_name"]} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email address <Req /></Label>
                    <Input id="email" type="email" value={c.email} onChange={(e) => setContact("email", e.target.value)} placeholder="you@yourclub.com" maxLength={255} />
                    <Err msg={errors["email"]} />
                  </div>
                  <div>
                    <Label htmlFor="phone_number">Phone <Req /></Label>
                    <Input id="phone_number" type="tel" value={c.phone_number} onChange={(e) => setContact("phone_number", e.target.value)} placeholder="(555) 555-5555" maxLength={30} />
                    <Err msg={errors["phone_number"]} />
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("interest")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                    <Button onClick={goNextFromPersonal}>Next</Button>
                  </div>
                </>
              )}

              {step === "event" && kind === "tournament" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Event Info</h1>
                    <p className="text-muted-foreground text-sm">Tell us about your tournament, so we can start building it.</p>
                  </div>
                  <div>
                    <Label htmlFor="eventDate">What is the date of your tournament? {!d["dateNotSet"] && <Req />}</Label>
                    <Input id="eventDate" type="date" value={d["eventDate"]} disabled={d["dateNotSet"]} onChange={(e) => setField("eventDate", e.target.value)} />
                    <label className="mt-2 flex items-center gap-2 text-sm"><Checkbox checked={d["dateNotSet"]} onCheckedChange={(v) => { setField("dateNotSet", v === true); if (v === true) setField("eventDate", ""); }} /> Date not set yet</label>
                    <Err msg={errors["eventDate"]} />
                  </div>
                  <div>
                    <Label htmlFor="regStartTime">What time does registration that day begin?</Label>
                    <Input id="regStartTime" type="time" value={d["regStartTime"]} onChange={(e) => setField("regStartTime", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="eventName">What is the name of your tournament? <Req /></Label>
                    <Input id="eventName" value={d["eventName"]} onChange={(e) => setField("eventName", e.target.value)} maxLength={200} />
                    <Err msg={errors["eventName"]} />
                  </div>
                  <div>
                    <Label htmlFor="orgName">What is the name of your organization? <Req /></Label>
                    <Input id="orgName" value={d["orgName"]} onChange={(e) => setField("orgName", e.target.value)} maxLength={150} />
                    <Err msg={errors["orgName"]} />
                  </div>
                  <div>
                    <Label htmlFor="courseName">Golf course name</Label>
                    <Input id="courseName" value={d["courseName"]} onChange={(e) => setField("courseName", e.target.value)} maxLength={200} />
                    <p className="text-xs text-muted-foreground mt-1">{COURSE_HELP}</p>
                  </div>
                  <div>
                    <Label htmlFor="courseCityState">Course city and state</Label>
                    <Input id="courseCityState" value={d["courseCityState"]} onChange={(e) => setField("courseCityState", e.target.value)} maxLength={200} />
                    <p className="text-xs text-muted-foreground mt-1">{COURSE_HELP}</p>
                  </div>
                  <div>
                    <Label>Format</Label>
                    <Select value={d["format"]} onValueChange={(v) => setField("format", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FORMATS_TOURNAMENT.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {captcha}
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("personal")} disabled={!!editToken}><ArrowLeft className="h-4 w-4 mr-1" /> Previous</Button>
                    <Button onClick={goNextFromEvent}>Next</Button>
                  </div>
                  {later}
                </>
              )}

              {step === "event" && kind === "league" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">League Info</h1>
                    <p className="text-muted-foreground text-sm">Tell us about your league, so we can start building it.</p>
                  </div>
                  <div>
                    <Label htmlFor="leagueName">What is the name of your league? <Req /></Label>
                    <Input id="leagueName" value={d["leagueName"]} onChange={(e) => setField("leagueName", e.target.value)} maxLength={200} />
                    <Err msg={errors["leagueName"]} />
                  </div>
                  <div>
                    <Label htmlFor="orgName">What is the name of your organization? <Req /></Label>
                    <Input id="orgName" value={d["orgName"]} onChange={(e) => setField("orgName", e.target.value)} maxLength={150} />
                    <Err msg={errors["orgName"]} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="seasonStart">Season start date {!d["datesNotSet"] && <Req />}</Label>
                      <Input id="seasonStart" type="date" value={d["seasonStart"]} disabled={d["datesNotSet"]} onChange={(e) => setField("seasonStart", e.target.value)} />
                      <Err msg={errors["seasonStart"]} />
                    </div>
                    <div>
                      <Label htmlFor="seasonEnd">Season end date {!d["datesNotSet"] && <Req />}</Label>
                      <Input id="seasonEnd" type="date" value={d["seasonEnd"]} disabled={d["datesNotSet"]} onChange={(e) => setField("seasonEnd", e.target.value)} />
                      <Err msg={errors["seasonEnd"]} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={d["datesNotSet"]} onCheckedChange={(v) => { setField("datesNotSet", v === true); if (v === true) { setField("seasonStart", ""); setField("seasonEnd", ""); } }} /> Dates not set yet</label>
                  <div>
                    <Label htmlFor="courseName">Home golf course name</Label>
                    <Input id="courseName" value={d["courseName"]} onChange={(e) => setField("courseName", e.target.value)} maxLength={200} />
                    <p className="text-xs text-muted-foreground mt-1">{COURSE_HELP}</p>
                  </div>
                  <div>
                    <Label htmlFor="courseCityState">Course city and state</Label>
                    <Input id="courseCityState" value={d["courseCityState"]} onChange={(e) => setField("courseCityState", e.target.value)} maxLength={200} />
                    <p className="text-xs text-muted-foreground mt-1">{COURSE_HELP}</p>
                  </div>
                  <div>
                    <Label>Day or days of the week</Label>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {WEEKDAYS.map((w) => (
                        <label key={w} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={(d["days"] as string[]).includes(w)} onCheckedChange={(v) => setField("days", v === true ? [...d["days"], w] : (d["days"] as string[]).filter((x) => x !== w))} /> {w}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="weeks">Number of weeks</Label>
                    <Input id="weeks" type="number" min={1} value={d["weeks"]} onChange={(e) => setField("weeks", e.target.value)} />
                  </div>
                  {captcha}
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("personal")} disabled={!!editToken}><ArrowLeft className="h-4 w-4 mr-1" /> Previous</Button>
                    <Button onClick={goNextFromEvent}>Next</Button>
                  </div>
                  {later}
                </>
              )}

              {step === "registration" && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">Registration Info</h1>
                    <p className="text-muted-foreground text-sm">Tell us about players and price, so we can set up registration.</p>
                  </div>
                  {kind === "tournament" ? (
                    <>
                      <div>
                        <Label htmlFor="fieldSize">How many players have you scheduled for? <Req /></Label>
                        <Input id="fieldSize" type="number" min={1} value={d["fieldSize"]} onChange={(e) => setField("fieldSize", e.target.value)} />
                        <p className="text-xs text-muted-foreground mt-1">Your best guess is fine.</p>
                        <Err msg={errors["fieldSize"]} />
                      </div>
                      <div>
                        <Label htmlFor="priceIndividual">How much will you charge per golfer? <Req /></Label>
                        <Input id="priceIndividual" type="number" min={0} step="0.01" placeholder="$" value={d["priceIndividual"]} onChange={(e) => setField("priceIndividual", e.target.value)} />
                        <Err msg={errors["priceIndividual"]} />
                      </div>
                      <div>
                        <Label htmlFor="priceFoursome">Entry price, foursome</Label>
                        <Input id="priceFoursome" type="number" min={0} step="0.01" placeholder="$" value={d["priceFoursome"]} onChange={(e) => setField("priceFoursome", e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="registrationDeadline">Registration deadline</Label>
                        <Input id="registrationDeadline" type="date" value={d["registrationDeadline"]} onChange={(e) => setField("registrationDeadline", e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="players">How many players do you expect? <Req /></Label>
                        <Input id="players" type="number" min={1} value={d["players"]} onChange={(e) => setField("players", e.target.value)} />
                        <p className="text-xs text-muted-foreground mt-1">Your best guess is fine.</p>
                        <Err msg={errors["players"]} />
                      </div>
                      <div>
                        <Label htmlFor="feePerPlayer">How much will you charge per player? <Req /></Label>
                        <Input id="feePerPlayer" type="number" min={0} step="0.01" placeholder="$" value={d["feePerPlayer"]} onChange={(e) => setField("feePerPlayer", e.target.value)} />
                        <Err msg={errors["feePerPlayer"]} />
                        {fee && (
                          <ul className="mt-2 space-y-1 rounded-md border border-border p-3 text-sm">
                            <li className="flex justify-between"><span>Registration</span><span>{fmt(fee.registration)}</span></li>
                            <li className="flex justify-between"><span>TeeVents platform fee 0%</span><span>{fmt(fee.platform)}</span></li>
                            <li className="flex justify-between"><span>Stripe credit card processing fee 2.9% + $0.30</span><span>{fmt(fee.stripe)}</span></li>
                            <li className="flex justify-between font-semibold"><span>Total</span><span>{fmt(fee.total)}</span></li>
                          </ul>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="additionalCourses">Additional courses</Label>
                        <Textarea id="additionalCourses" rows={2} value={d["additionalCourses"]} onChange={(e) => setField("additionalCourses", e.target.value)} maxLength={1000} />
                      </div>
                      <div>
                        <Label htmlFor="teeTime">Weekly tee time</Label>
                        <Input id="teeTime" value={d["teeTime"]} onChange={(e) => setField("teeTime", e.target.value)} maxLength={120} />
                      </div>
                      <div>
                        <Label htmlFor="standingsDetails">Standings, skins, and handicaps details</Label>
                        <Textarea id="standingsDetails" rows={3} value={d["standingsDetails"]} onChange={(e) => setField("standingsDetails", e.target.value)} maxLength={2000} />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="sponsorships">Sponsorship levels and prices</Label>
                    <Textarea id="sponsorships" rows={3} placeholder="Gold $2,500, Silver $1,000, Hole $500" value={d["sponsorships"]} onChange={(e) => setField("sponsorships", e.target.value)} maxLength={2000} />
                  </div>
                  <div>
                    <Label htmlFor="logo">Logo upload</Label>
                    <Input id="logo" type="file" accept="image/png,image/jpeg" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    <p className="text-xs text-muted-foreground mt-1">You can send it later.</p>
                  </div>
                  <div>
                    <Label htmlFor="colors">{kind === "league" ? "League colors" : "Event colors"}</Label>
                    <Input id="colors" placeholder="Navy and gold" value={d["colors"]} onChange={(e) => setField("colors", e.target.value)} maxLength={200} />
                  </div>
                  {kind === "tournament" && (
                    <div>
                      <Label htmlFor="beneficiary">Charity or beneficiary</Label>
                      <Input id="beneficiary" value={d["beneficiary"]} onChange={(e) => setField("beneficiary", e.target.value)} maxLength={300} />
                    </div>
                  )}
                  <div>
                    <Label>How do you want your page built? <Req /></Label>
                    <RadioGroup className="mt-2" value={d["buildChoice"]} onValueChange={(v) => setField("buildChoice", v)}>
                      {BUILD_CHOICES.map((b) => <label key={b} className="flex items-center gap-2 text-sm"><RadioGroupItem value={b} /> {b}</label>)}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes or special requests</Label>
                    <Textarea id="notes" rows={3} value={d["notes"]} onChange={(e) => setField("notes", e.target.value)} maxLength={4000} />
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep("event")}><ArrowLeft className="h-4 w-4 mr-1" /> Previous</Button>
                    <Button onClick={() => submit(false)} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {token ? "Save my details" : "Create My Account"}
                    </Button>
                  </div>
                  {captcha}
                  {later}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="p-8 space-y-5">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><CheckCircle2 className="h-8 w-8 text-primary" /></div>
                <h1 className="text-2xl font-bold">{kind === "league" ? "Thanks, we received your league details." : "Thanks, we received your tournament details."}</h1>
                <p className="text-muted-foreground">{kind === "league"
                  ? "Your league is in the build queue. Your dedicated rep will build your branded league page and send you a preview link, live in 7 days or less once we have your logo and details. No phone call needed to get started."
                  : "Your event is in the build queue. Your dedicated rep will build your branded event page and send you a preview link, live in 7 days or less once we have your logo and details. No phone call needed to get started."}</p>
              </div>
              <dl className="divide-y divide-border rounded-md border border-border text-sm">
                {SUMMARY_KEYS[kind].map(([k, label]) => (
                  <div key={k} className="flex justify-between gap-4 p-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{intakeValue(kind, d, k) || "Not provided"}</dd></div>
                ))}
              </dl>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => { setErrors({}); setStep("event"); }}>Edit my details</Button>
                <Button onClick={() => navigate(editToken ? "/dashboard" : "/create-workspace")}>Go to my dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEO from "@/components/SEO";
import logo from "@/assets/logo-black.png";
import { getIntake, submitIntake, uploadIntakeLogo, getMyIntakeToken } from "@/lib/intake.functions";
import { supabase } from "@/integrations/supabase/client";
import { FORMATS_TOURNAMENT, FORMATS_LEAGUE, WEEKDAYS, BUILD_CHOICES, tournamentIntakeSchema, leagueIntakeSchema, intakeValue, leagueFeeLines } from "@/lib/intake.schema";

type Kind = "tournament" | "league";
type D = Record<string, any>;
const STEP_LABELS = ["You", "Organization", "Finish"];
const TOKEN_KEY = "teevents.intakeToken";

const blank = (k: Kind): D => k === "tournament"
  ? { eventName: "", eventDate: "", dateNotSet: false, courseName: "", courseCityState: "", format: "", fieldSize: "", priceIndividual: "", priceFoursome: "", teeTime: "", registrationDeadline: "", sponsorships: "", logoPath: "", colors: "", beneficiary: "", link: "", buildChoice: BUILD_CHOICES[0], notes: "" }
  : { leagueName: "", seasonStart: "", seasonEnd: "", datesNotSet: false, courseName: "", courseCityState: "", days: [], weeks: "", format: "", players: "", feePerPlayer: "", additionalCourses: "", teeTime: "", standingsDetails: "", sponsorships: "", logoPath: "", colors: "", buildChoice: BUILD_CHOICES[0], notes: "" };

function Req() { return <span className="text-destructive">*</span>; }
const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function Intake() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [d, setD] = useState<D>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "form" | "done" | "missing">("loading");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      let t = params.get("token") || sessionStorage.getItem(TOKEN_KEY);
      if (!t) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) { const mine = await getMyIntakeToken().catch(() => null); t = mine?.token || null; }
      }
      if (!t) { setState("missing"); return; }
      sessionStorage.setItem(TOKEN_KEY, t);
      const row = await getIntake({ data: { token: t } }).catch(() => null);
      if (!row) { setState("missing"); return; }
      setToken(t); setKind(row.interest as Kind);
      setD({ ...blank(row.interest as Kind), ...(row.details as D) });
      setState(row.submitted && params.get("edit") !== "1" ? "done" : "form");
    })();
  }, [params]);

  const set = (k: string, v: unknown) => { setD(p => ({ ...p, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };
  const isT = kind === "tournament";
  const formats = isT ? FORMATS_TOURNAMENT : FORMATS_LEAGUE;
  const fee = useMemo(() => leagueFeeLines(Number(d["feePerPlayer"]) || 0), [d]);

  const onLogo = async (file: File | undefined) => {
    if (!file || !token) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) { setMessage("Logo must be a PNG or JPG."); return; }
    setUploading(true); setMessage("");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const r = await uploadIntakeLogo({ data: { token, fileName: file.name, contentType: file.type as "image/png" | "image/jpeg", base64: btoa(bin) } });
      set("logoPath", r.path); setLogoName(file.name);
    } catch (e: any) { setMessage(e?.message || "Could not upload the logo. You can send it later."); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!token || !kind) return;
    const parsed = (isT ? tournamentIntakeSchema : leagueIntakeSchema).safeParse(d);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!e[k]) e[k] = i.message; }
      setErrors(e); setMessage("Please complete the required fields marked *."); return;
    }
    setSaving(true); setMessage("");
    const r = (await submitIntake({ data: { token, details: parsed.data as D } }).catch(() => null)) as { ok: boolean; message?: string; details?: D } | null;
    setSaving(false);
    if (!r?.ok) { setMessage(r?.message || "We could not save your details. Please try again."); return; }
    setD({ ...blank(kind), ...r.details }); setState("done"); window.scrollTo(0, 0);
  };

  const field = (k: string, label: string, required: boolean, input: React.ReactNode, helper?: string) => (
    <div key={k}><Label htmlFor={k}>{label} {required && <Req />}</Label>{input}{helper && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}{errors[k] && <p className="text-xs text-destructive mt-1">{errors[k]}</p>}</div>
  );
  const text = (k: string, label: string, required = false, ph = "", type = "text") => field(k, label, required, <Input id={k} type={type} value={d[k] ?? ""} placeholder={ph} onChange={e => set(k, e.target.value)} />);
  const area = (k: string, label: string, ph = "") => field(k, label, false, <Textarea id={k} rows={3} value={d[k] ?? ""} placeholder={ph} onChange={e => set(k, e.target.value)} />);
  const formatSelect = () => field("format", "Format", true, <Select value={d["format"] || undefined} onValueChange={v => set("format", v)}><SelectTrigger id="format"><SelectValue placeholder="Choose a format" /></SelectTrigger><SelectContent>{formats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>);
  const logoField = () => field("logo", "Logo upload", false, <Input id="logo" type="file" accept="image/png,image/jpeg" disabled={uploading} onChange={e => onLogo(e.target.files?.[0])} />, uploading ? "Uploading…" : logoName ? `Uploaded: ${logoName}` : d["logoPath"] ? "Logo uploaded. You can send it later." : "You can send it later.");
  const buildChoice = () => field("buildChoice", "How do you want your page built?", true, <RadioGroup value={d["buildChoice"]} onValueChange={v => set("buildChoice", v)} className="mt-2">{BUILD_CHOICES.map(c => <div key={c} className="flex items-center gap-2"><RadioGroupItem id={`bc-${c}`} value={c} /><Label htmlFor={`bc-${c}`} className="font-normal">{c}</Label></div>)}</RadioGroup>);

  if (state === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4 py-12">
      <SEO title={isT ? "Your Tournament — TeeVents" : "Your League — TeeVents"} description="Tell us about your event so your TeeVents rep can start building it." noIndex />
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-center"><img src={logo} alt="TeeVents" className="h-10" /></div>
        {state === "missing" && <Card><CardContent className="p-8 text-center space-y-4"><h1 className="text-2xl font-bold">We couldn't find your details form</h1><p className="text-muted-foreground">Sign in to open it from your account, or email info@teevents.golf.</p><Button variant="outline" onClick={() => navigate("/dashboard")}>Go to my dashboard</Button></CardContent></Card>}

        {state === "form" && kind && <Card><CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-2">
            {[...STEP_LABELS, isT ? "Your Tournament" : "Your League"].map((l, i) => <div key={l} className="flex-1"><div className="h-1.5 rounded-full bg-primary" /><p className={`text-xs mt-1 ${i === 3 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{i + 1}. {l}</p></div>)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isT ? "Your Tournament" : "Your League"}</h1>
            <p className="text-muted-foreground">{isT ? "Tell us about your tournament so we can start building it. No phone call needed to get started." : "Tell us about your league so we can start building it. No phone call needed to get started."}</p>
            <p className="text-xs text-muted-foreground mt-2">Fields marked * are required.</p>
          </div>
          {isT ? <div className="space-y-4">
            {text("eventName", "Event name", true)}
            {field("eventDate", "Event date", !d["dateNotSet"], <><Input id="eventDate" type="date" value={d["eventDate"]} disabled={d["dateNotSet"]} onChange={e => set("eventDate", e.target.value)} /><label className="flex items-center gap-2 mt-2 text-sm"><Checkbox checked={!!d["dateNotSet"]} onCheckedChange={v => set("dateNotSet", v === true)} />Date not set yet</label></>)}
            {text("courseName", "Golf course name", true)}
            {text("courseCityState", "Course city and state", true, "Phoenix, AZ")}
            {formatSelect()}
            {text("fieldSize", "Expected field size", true, "Number of golfers", "number")}
            {text("priceIndividual", "Entry price, individual", true, "Dollars", "number")}
            {text("priceFoursome", "Entry price, foursome", false, "Dollars", "number")}
            {text("teeTime", "Tee time or shotgun time")}
            {text("registrationDeadline", "Registration deadline", false, "", "date")}
            {area("sponsorships", "Sponsorship levels and prices", "Gold $2,500, Silver $1,000, Hole $500")}
            {logoField()}
            {text("colors", "Event colors", false, "Navy and gold")}
            {text("beneficiary", "Charity or beneficiary")}
            {text("link", "Website or social link")}
            {buildChoice()}
            {area("notes", "Notes or special requests")}
          </div> : <div className="space-y-4">
            {text("leagueName", "League name", true)}
            {field("seasonStart", "Season start date", !d["datesNotSet"], <><Input id="seasonStart" type="date" value={d["seasonStart"]} disabled={d["datesNotSet"]} onChange={e => set("seasonStart", e.target.value)} /><label className="flex items-center gap-2 mt-2 text-sm"><Checkbox checked={!!d["datesNotSet"]} onCheckedChange={v => set("datesNotSet", v === true)} />Dates not set yet</label></>)}
            {field("seasonEnd", "Season end date", !d["datesNotSet"], <Input id="seasonEnd" type="date" value={d["seasonEnd"]} disabled={d["datesNotSet"]} onChange={e => set("seasonEnd", e.target.value)} />)}
            {text("courseName", "Home golf course name", true)}
            {text("courseCityState", "Course city and state", true, "Phoenix, AZ")}
            {field("days", "Day or days of the week", true, <div className="mt-2 flex flex-wrap gap-4">{WEEKDAYS.map(w => <label key={w} className="flex items-center gap-2 text-sm"><Checkbox checked={(d["days"] || []).includes(w)} onCheckedChange={v => set("days", v === true ? [...(d["days"] || []), w] : (d["days"] || []).filter((x: string) => x !== w))} />{w}</label>)}</div>)}
            {text("weeks", "Number of weeks", true, "", "number")}
            {formatSelect()}
            {text("players", "Expected number of players", true, "Number of players", "number")}
            {text("feePerPlayer", "League fee, per player", true, "Dollars", "number")}
            {Number(d["feePerPlayer"]) > 0 && <div className="rounded-md border border-border p-3 text-sm space-y-1" data-testid="league-fee-lines">
              <div className="flex justify-between"><span>Registration</span><span>{fmt(fee.registration)}</span></div>
              <div className="flex justify-between"><span>TeeVents platform fee 0%</span><span>{fmt(fee.platform)}</span></div>
              <div className="flex justify-between"><span>Stripe credit card processing fee 2.9% + $0.30</span><span>{fmt(fee.stripe)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{fmt(fee.total)}</span></div>
            </div>}
            {area("additionalCourses", "Additional courses")}
            {text("teeTime", "Weekly tee time")}
            {area("standingsDetails", "Standings, skins, and handicaps details")}
            {area("sponsorships", "Sponsorship levels and prices", "Gold $2,500, Silver $1,000, Hole $500")}
            {logoField()}
            {text("colors", "League colors", false, "Navy and gold")}
            {buildChoice()}
            {area("notes", "Notes or special requests")}
          </div>}
          {message && <p className="text-sm text-destructive">{message}</p>}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Link to="/dashboard" className="text-sm text-primary underline">I'll add this later</Link>
            <Button onClick={submit} disabled={saving || uploading}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isT ? "Submit tournament details" : "Submit league details"}</Button>
          </div>
        </CardContent></Card>}

        {state === "done" && kind && <Card><CardContent className="p-8 space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><CheckCircle2 className="h-8 w-8 text-primary" /></div>
          <h1 className="text-2xl font-bold text-center">{isT ? "Thanks, we received your tournament details." : "Thanks, we received your league details."}</h1>
          <p className="text-muted-foreground text-center">{isT ? "Your event is in the build queue. Your dedicated rep will build your branded event page and send you a preview link, live in 7 days or less once we have your logo and details. No phone call needed to get started." : "Your league is in the build queue. Your dedicated rep will build your branded league page and send you a preview link, live in 7 days or less once we have your logo and details. No phone call needed to get started."}</p>
          <dl className="rounded-md border border-border divide-y divide-border text-sm">
            {(isT ? [["eventName", "Event name"], ["eventDate", "Event date"], ["courseName", "Golf course name"], ["format", "Format"], ["fieldSize", "Expected field size"], ["priceIndividual", "Entry price individual"]]
              : [["leagueName", "League name"], ["seasonStart", "Season start date"], ["seasonEnd", "Season end date"], ["courseName", "Home golf course name"], ["weeks", "Number of weeks"], ["players", "Expected number of players"], ["feePerPlayer", "League fee per player"]])
              .map(([k, l]) => <div key={k} className="flex justify-between gap-4 p-3"><dt className="text-muted-foreground">{l}</dt><dd className="font-medium text-right">{intakeValue(kind, d, k!)}</dd></div>)}
          </dl>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => setState("form")}>{isT ? "Edit tournament details" : "Edit league details"}</Button>
            <Button onClick={() => navigate("/dashboard")}>Go to my dashboard</Button>
          </div>
        </CardContent></Card>}
      </div>
    </div>
  );
}

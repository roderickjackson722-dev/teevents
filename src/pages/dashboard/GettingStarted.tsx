import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, CheckCircle2, Hammer, Loader2, UserRoundCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OrganizerToolbox from "@/pages/dashboard/OrganizerToolbox";
import { itemCount, loadToolbox } from "@/lib/organizerToolbox";
import { sendOnboardingSummary } from "@/lib/onboarding.functions";

const CALENDLY = "https://calendly.com/teevents-golf/demo";
type EventInfo = { name: string; date: string; location: string; cityState: string; type: string; format: string; holes: string; players: string; plan: string };
const EMPTY: EventInfo = { name: "", date: "", location: "", cityState: "", type: "", format: "", holes: "", players: "", plan: "" };
const SELECTS: [keyof EventInfo, string, string[]][] = [
  ["type", "Event Type", ["Tournament", "League", "Both"]],
  ["format", "Format", ["Scramble", "Stroke Play", "Stableford", "Best Ball", "Alternate Shot", "Other"]],
  ["holes", "Number of Holes", ["9", "18", "27", "36"]],
  ["plan", "Plan Selected", ["No Cost to Start", "Per-Event", "Per-League", "Enterprise"]],
];
const CHOICES = [
  { key: "Build it yourself", icon: Hammer, title: "Build It Yourself", text: "Use the TeeVents site builder to set up your event page on your own.", button: "START BUILDING" },
  { key: "Wait for my rep", icon: UserRoundCheck, title: "Wait For Your Rep", text: "Your rep will contact you within 1 business day and build everything for you.", button: "WAIT FOR MY REP" },
  { key: "Schedule a call", icon: CalendarClock, title: "Schedule a Call", text: "Schedule a call with your rep to walk through it together.", button: "SCHEDULE A CALL" },
];
const pretty = (s: string | null) => s ? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

export default function GettingStarted() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sendSummary = useServerFn(sendOnboardingSummary);
  const adminView = !!(searchParams.get("admin_org") || searchParams.get("sample_org"));
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [toolboxId, setToolboxId] = useState<string | null>(null);
  const [ev, setEv] = useState<EventInfo>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof EventInfo, string>>>({});
  const [choice, setChoice] = useState<string | null>(null);
  const [items, setItems] = useState(0);
  const [saving, setSaving] = useState(false);
  const finished = useRef(false);

  const ctx = (() => {
    const keep = new URLSearchParams();
    for (const k of ["admin_org", "sample_org", "tournament_id"]) { const v = searchParams.get(k); if (v) keep.set(k, v); }
    const s = keep.toString(); return s ? `?${s}` : "";
  })();

  useEffect(() => {
    if (!org) return;
    (async () => {
      const [{ data: { user } }, { data: tours }, tb] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("tournaments").select("id, title, date, course_name, location, state, scoring_format").eq("organization_id", org.orgId).order("created_at", { ascending: false }).limit(1),
        loadToolbox(org.orgId),
      ]);
      const m = (user?.user_metadata || {}) as Record<string, string>;
      setFirstName((m.first_name || m.full_name || m.legal_name || m.name || "").split(" ")[0]);
      const t = tours?.[0];
      setTournamentId(searchParams.get("tournament_id") || t?.id || null);
      const saved = (tb as any)?.onboarding_event as EventInfo | null;
      setEv(saved ? { ...EMPTY, ...saved } : { ...EMPTY, name: t?.title || "", date: t?.date?.slice(0, 10) || "", location: t?.course_name || "", cityState: [t?.location, t?.state].filter(Boolean).join(", "), format: SELECTS[1][2].find(f => f === pretty(t?.scoring_format ?? null)) || "", type: t ? "Tournament" : "" });
      setChoice((tb as any)?.onboarding_choice || null);
      setItems(itemCount(tb));
      setToolboxId(tb?.id || null);
      if (adminView) return;
      const now = new Date().toISOString();
      if (tb?.id && !tb.onboarding_seen_at) await (supabase as any).from("organizer_toolboxes").update({ onboarding_seen_at: now }).eq("id", tb.id);
      if (!tb) {
        const { data } = await (supabase as any).from("organizer_toolboxes").insert({ organization_id: org.orgId, user_id: org.userId, onboarding_seen_at: now }).select("id").single();
        setToolboxId(data?.id || null);
      }
    })();
  }, [org]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (row: Record<string, unknown>) => {
    if (adminView || !org) return true;
    const { error } = await (supabase as any).from("organizer_toolboxes").update(row).eq("organization_id", org.orgId);
    if (error) toast.error("We could not save that. Please try again.");
    return !error;
  };

  const saveEvent = async () => {
    const e: typeof errors = {};
    (Object.keys(EMPTY) as (keyof EventInfo)[]).forEach(k => { if (!ev[k].trim()) e[k] = "This field is required."; });
    if (ev.players && !(Number(ev.players) > 0)) e.players = "Enter a number greater than 0.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const ok = await patch({ onboarding_event: ev });
    setSaving(false);
    if (ok) setStep(2);
  };

  const pick = async (key: string) => {
    setChoice(key);
    if (key === "Schedule a call") window.open(CALENDLY, "_blank", "noopener");
    await patch({ onboarding_choice: key });
    setStep(4);
  };

  useEffect(() => {
    if (step !== 4 || finished.current || adminView || !org) return;
    finished.current = true;
    (async () => {
      const { data } = await (supabase as any).from("organizer_toolboxes").select("onboarding_completed_at, logo, brand_colors, hero_image, sponsor_logos, documents, gallery, additional_notes, anything_else").eq("organization_id", org.orgId).maybeSingle();
      setItems(itemCount(data));
      if (data?.onboarding_completed_at) return;
      await patch({ onboarding_completed_at: new Date().toISOString() });
      try { await sendSummary({ data: { orgId: org.orgId } }); } catch { /* emails are best effort; onboarding is still complete */ }
    })();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const Skip = ({ to }: { to: number }) => <button type="button" onClick={() => setStep(to)} className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary">SKIP FOR NOW</button>;
  const Head = ({ title, sub }: { title: string; sub: string }) => <div className="mb-8 text-center"><h1 className="font-display text-3xl font-bold text-primary md:text-4xl">{title}</h1><p className="mt-2 text-muted-foreground md:text-lg">{sub}</p></div>;

  return <div className="mx-auto max-w-4xl pb-12">
    {step > 0 && <div className="mb-8">
      <div className="mb-2 flex justify-between text-sm font-semibold"><span className="text-primary">Step {step} of 4</span><span className="text-muted-foreground">{["", "Event details", "Your assets", "Your event page", "All set"][step]}</span></div>
      <Progress value={step * 25} className="h-2" />
    </div>}

    {step === 0 && <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="bg-primary px-6 py-10 text-center text-primary-foreground md:px-10">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Welcome to TeeVents{firstName ? `, ${firstName}` : ""}</h1>
        <p className="mt-2 text-lg text-primary-foreground/85">You are all set. Here is what happens next.</p>
      </div>
      <div className="space-y-8 p-6 md:p-10">
        <div className="flex gap-4 rounded-lg border-l-4 border-secondary bg-secondary/10 p-5">
          <UserRoundCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-3 leading-relaxed text-foreground">
            <p>A dedicated TeeVents rep will contact you within 1 business day to help build your event page, set up registration, and configure your leaderboard.</p>
            <p>In the meantime, you can start setting things up yourself. Anything you build will be reviewed and refined by your rep before your event goes live.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Button variant="secondary" size="lg" className="w-full font-bold sm:w-auto" onClick={() => setStep(1)}>START SETUP</Button>
          <button type="button" onClick={() => navigate(`/dashboard${ctx}`)} className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary">I WILL WAIT FOR MY REP</button>
        </div>
      </div>
    </div>}

    {step === 1 && <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10">
      <Head title="Tell Us About Your Event" sub="These details help your rep prepare for your first call." />
      <form noValidate onSubmit={e => { e.preventDefault(); void saveEvent(); }} className="grid gap-5 md:grid-cols-2">
        {([["name", "Event Name", "text"], ["date", "Event Date", "date"], ["location", "Event Location (Course or Venue)", "text"], ["cityState", "City and State", "text"]] as [keyof EventInfo, string, string][]).map(([k, l, t]) =>
          <div key={k} className="space-y-1.5"><Label htmlFor={k}>{l} <span className="text-destructive">*</span></Label>
            <Input id={k} type={t} value={ev[k]} aria-invalid={!!errors[k]} onChange={e => { setEv({ ...ev, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); }} placeholder={k === "cityState" ? "Phoenix, AZ" : undefined} />
            {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}</div>)}
        {SELECTS.slice(0, 3).map(([k, l, opts]) => <div key={k} className="space-y-1.5"><Label>{l} <span className="text-destructive">*</span></Label>
          <Select value={ev[k]} onValueChange={v => { setEv({ ...ev, [k]: v }); setErrors({ ...errors, [k]: undefined }); }}><SelectTrigger aria-label={l} aria-invalid={!!errors[k]}><SelectValue placeholder="Choose one" /></SelectTrigger>
            <SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
          {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}</div>)}
        <div className="space-y-1.5"><Label htmlFor="players">Expected Number of Players <span className="text-destructive">*</span></Label>
          <Input id="players" type="number" min={1} value={ev.players} aria-invalid={!!errors.players} onChange={e => { setEv({ ...ev, players: e.target.value }); setErrors({ ...errors, players: undefined }); }} />
          {errors.players && <p className="text-sm text-destructive">{errors.players}</p>}</div>
        {SELECTS.slice(3).map(([k, l, opts]) => <div key={k} className="space-y-1.5 md:col-span-2"><Label>{l} <span className="text-destructive">*</span></Label>
          <Select value={ev[k]} onValueChange={v => { setEv({ ...ev, [k]: v }); setErrors({ ...errors, [k]: undefined }); }}><SelectTrigger aria-label={l} aria-invalid={!!errors[k]}><SelectValue placeholder="Choose one" /></SelectTrigger>
            <SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
          {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}</div>)}
        <div className="flex flex-col items-center gap-4 md:col-span-2">
          <Button type="submit" variant="secondary" size="lg" className="w-full font-bold sm:w-auto" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}SAVE AND CONTINUE</Button>
          <Skip to={2} />
        </div>
      </form>
    </div>}

    {step === 2 && <div>
      <Head title="Upload Your Event Assets" sub="Your rep uses these to build your event page. Upload what you have now and you can add more later." />
      <OrganizerToolbox embedded onSaved={t => { setItems(itemCount(t)); setStep(3); }} />
      <div className="text-center"><Skip to={3} /></div>
    </div>}

    {step === 3 && <div>
      <Head title="Get Your Event Page Ready" sub="Choose how you want to proceed." />
      <div className="grid gap-5 md:grid-cols-3">
        {CHOICES.map(c => <div key={c.key} className={`flex flex-col rounded-2xl border-2 bg-card p-6 text-center shadow-sm ${choice === c.key ? "border-secondary" : "border-border"}`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-secondary"><c.icon className="h-7 w-7" /></span>
          <h2 className="mt-4 font-display text-xl font-bold text-primary">{c.title}</h2>
          <p className="mt-2 flex-1 text-muted-foreground">{c.text}</p>
          <Button variant="secondary" className="mt-6 font-bold" onClick={() => void pick(c.key)}>{c.button}</Button>
        </div>)}
      </div>
      <div className="mt-8 text-center"><Skip to={4} /></div>
    </div>}

    {step === 4 && <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10">
      <div className="mx-auto mb-4 flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-secondary text-primary"><CheckCircle2 className="h-9 w-9" /></div>
      <Head title="You Are All Set" sub="Here is a summary of what happens next." />
      <dl className="mx-auto max-w-xl divide-y divide-border rounded-xl border-l-4 border-secondary bg-muted/40">
        {[["Your event", ev.name || "Not entered yet"], ["Your plan", ev.plan || "Not selected yet"], ["Your rep", "Assigned within 1 business day"], ["Your event page", "Ready for review within a few days of your first call with your rep"], ["Your Organizer Toolbox", `${items} item${items === 1 ? "" : "s"} uploaded`]].map(([k, v]) =>
          <div key={k} className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between"><dt className="font-semibold text-foreground">{k}</dt><dd className="text-muted-foreground sm:text-right">{v}</dd></div>)}
      </dl>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button variant="secondary" size="lg" className="font-bold" onClick={() => navigate(`/dashboard${ctx}`)}>GO TO MY DASHBOARD</Button>
        <Button variant="outline" size="lg" className="border-primary font-semibold text-primary" onClick={() => navigate(`/dashboard/toolbox${ctx}`)}>VIEW ORGANIZER TOOLBOX</Button>
      </div>
      {choice === "Build it yourself" && <p className="mt-6 text-center"><button type="button" className="font-semibold text-primary underline underline-offset-4" onClick={() => navigate(tournamentId ? `/dashboard/tournaments/${tournamentId}/site-builder${ctx}` : `/dashboard/tournaments${ctx}`)}>Open the site builder</button></p>}
    </div>}
  </div>;
}

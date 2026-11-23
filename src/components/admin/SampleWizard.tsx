import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { readClientFlyer } from "@/lib/flyerSample.functions";
import { openClientDemo } from "@/lib/clientDemo.functions";
import { clientDemoDashboardLink } from "@/lib/clientDemo";
import { flyerImages } from "@/lib/flyerImages";
import { canBuildClientSample, sampleFormats } from "@/lib/flyerSample";
import {
  SOURCE_LABEL, TEEVENTS_COLORS, descriptionText, emptySchedule, emptyValues, fillBlanks, isFilled, scheduleText,
  type BuilderKey, type BuilderValues, type FieldSource,
} from "@/lib/eventBuilder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Copy, ExternalLink, Keyboard, Mail, MessageSquare, Plus, Sparkles, Trash2, Upload, Wand2,
} from "lucide-react";

const SAMPLE_NAMES = [
  "John Smith", "Marcus Johnson", "David Chen", "Robert Alvarez",
  "Michael Brooks", "Anthony Reed", "James Whitfield", "Kevin Parker",
  "Terrence Hall", "Brian Cole", "Andre Wallace", "Chris Bennett",
];
const SAMPLE_SCORES = [68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79];
const HEX = /^#[0-9a-f]{6}$/i;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

interface Built { dashboardLink: string; slug: string; link: string; customerName: string; eventName: string }
interface Customer { customer_name: string; prospect_email: string; prospect_phone: string }
const startValues = (): BuilderValues => ({ ...emptyValues(), scoring_format: "Scramble", ...TEEVENTS_COLORS });
const LABELS: Record<BuilderKey, string> = {
  event_name: "Tournament Name", organization_name: "Organization", event_date: "Event Date", start_time: "Start time",
  checkin_time: "Check-in time", course_name: "Course", location: "Location", registration_fee: "Registration Fee",
  scoring_format: "Scoring Format", beneficiary: "Beneficiary or cause", contact_name: "Contact name",
  contact_email: "Contact email", contact_phone: "Contact phone", description: "Event description", tagline: "Tagline",
  primary_color: "Primary color", secondary_color: "Accent color", background_color: "Background color", text_color: "Text color",
  tiers: "Registration tiers", sponsors: "Sponsors", schedule: "Schedule", contests: "Contests",
};
const ALL_KEYS = Object.keys(LABELS) as BuilderKey[];

export default function SampleWizard({ onCreated, onCancel }: { onCreated?: () => void; onCancel?: () => void } = {}) {
  const readFlyer = useServerFn(readClientFlyer);
  const provisionDemo = useServerFn(openClientDemo);
  const flyerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const [buildMode, setBuildMode] = useState<"flyer" | "typed" | null>(null);
  const [flyer, setFlyer] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState("");
  const [report, setReport] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [mode, setMode] = useState("defer");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [organizerOrg, setOrganizerOrg] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => () => { if (flyerPreview) URL.revokeObjectURL(flyerPreview); }, [flyerPreview]);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [built, setBuilt] = useState<Built | null>(null);
  const [c, setC] = useState<Customer>({ customer_name: "", prospect_email: "", prospect_phone: "" });
  const [v, setV] = useState<BuilderValues>(startValues);
  const [sources, setSources] = useState<Partial<Record<BuilderKey, FieldSource>>>({});
  const [existing, setExisting] = useState<{ id: string; values: Partial<BuilderValues>; logo: string | null; hero: string | null } | null>(null);
  const [conflicts, setConflicts] = useState<{ key: BuilderKey; incoming: unknown }[]>([]);
  const [checkedKey, setCheckedKey] = useState("");
  const [confirmColors, setConfirmColors] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [flyerFound, setFlyerFound] = useState<Set<BuilderKey> | null>(null);

  /** Admin edits: a blank field the admin types into becomes "Filled from typed input". */
  const set = <K extends BuilderKey>(k: K, val: BuilderValues[K]) => {
    setV((cur) => ({ ...cur, [k]: val }));
    setSources((s) => ({ ...s, [k]: isFilled(val) ? (s[k] === "already" || s[k] === "flyer" ? s[k] : "typed") : "blank" }));
  };

  /** Look for an existing sample with the same name + date; its values win, incoming fills blanks only. */
  async function applyExisting(incoming: BuilderValues, src: "flyer" | "typed") {
    const name = incoming.event_name.trim(); const date = incoming.event_date;
    const key = `${name.toLowerCase()}|${date}`;
    if (!name || !date || key === checkedKey) return incoming;
    setCheckedKey(key);
    const { data } = await (supabase as any).from("sample_tournaments")
      .select("id, tournament_name, event_date, course_name, location, scoring_format, registration_fee_cents, primary_color, secondary_color, background_color, text_color, logo_url, hero_image_url, prospect_company, builder_details")
      .ilike("tournament_name", name).eq("event_date", date).neq("conversion_status", "converted").limit(1).maybeSingle();
    if (!data) { setExisting(null); return incoming; }
    const { data: sps } = await (supabase as any).from("sample_sponsors").select("name, level").eq("sample_tournament_id", data.id);
    const d = data.builder_details || {};
    const ex: Partial<BuilderValues> = {
      event_name: data.tournament_name || "", event_date: data.event_date || "", course_name: data.course_name || "",
      location: data.location || "", scoring_format: data.scoring_format || "",
      registration_fee: data.registration_fee_cents != null ? (data.registration_fee_cents / 100).toFixed(2) : "",
      primary_color: data.primary_color || "", secondary_color: data.secondary_color || "", background_color: data.background_color || "",
      text_color: data.text_color || "", organization_name: data.prospect_company || d.organization_name || "",
      start_time: d.start_time || "", checkin_time: d.checkin_time || "", beneficiary: d.beneficiary || "",
      contact_name: d.contact_name || "", contact_email: d.contact_email || "", contact_phone: d.contact_phone || "",
      description: d.description || "", tagline: d.tagline || "", tiers: d.tiers || [], schedule: d.schedule || emptySchedule(),
      contests: d.contests || [],
      sponsors: (sps || []).length ? sps.map((x: any) => ({ name: x.name, tier: x.level || "" })) : (d.sponsors || []),
    };
    setExisting({ id: data.id, values: ex, logo: data.logo_url, hero: data.hero_image_url });
    if (data.logo_url && !logoUrl) setLogoUrl(data.logo_url);
    if (data.hero_image_url && !heroUrl) setHeroUrl(data.hero_image_url);
    // Only what the admin/flyer actually supplied counts as incoming (not untouched defaults).
    const supplied = Object.fromEntries(ALL_KEYS.filter((k) => sources[k] === src || src === "flyer" && flyerFound?.has(k)).map((k) => [k, (incoming as any)[k]]));
    supplied.event_name = incoming.event_name; supplied.event_date = incoming.event_date;
    const r = fillBlanks(ex, supplied, src);
    // Keep defaults (format/colors) for still-blank fields so the page has a look.
    const merged = { ...r.values } as BuilderValues;
    for (const k of ALL_KEYS) if (r.sources[k] === "blank" && isFilled((incoming as any)[k])) (merged as any)[k] = (incoming as any)[k];
    setSources(r.sources);
    setConflicts(r.conflicts.filter((k) => k !== "event_name" && k !== "event_date").map((k) => ({ key: k, incoming: (supplied as any)[k] })));
    toast({ title: "Existing sample opened", description: "Its current values are shown first. Only blank fields were filled in." });
    return merged;
  }

  async function extract(file: File) {
    setFlyer(file); setFlyerPreview(URL.createObjectURL(file)); setExtracting(true); setReport("");
    const blankStart = { ...startValues(), scoring_format: "", primary_color: TEEVENTS_COLORS.primary_color };
    setV(blankStart); setSources({}); setFlyerFound(null);
    try {
      const images = await flyerImages(file);
      const response = await readFlyer({ data: { images } });
      if (!response.ok || !response.result) throw new Error(response.error || "The flyer could not be read.");
      const { fields, colors, details } = response.result as any;
      const next: BuilderValues = {
        ...emptyValues(),
        event_name: fields.tournament_name, event_date: fields.event_date, course_name: fields.course_name, location: fields.location,
        registration_fee: fields.registration_fee, scoring_format: fields.scoring_format,
        organization_name: details?.organization || "", start_time: details?.start_time || "", checkin_time: details?.checkin_time || "",
        beneficiary: details?.beneficiary || "", contact_name: details?.contact_name || "", contact_email: details?.contact_email || "",
        contact_phone: details?.contact_phone || "", schedule: details?.schedule || emptySchedule(),
        tiers: details?.tiers || [], sponsors: details?.sponsors || [], contests: details?.contests || [],
        primary_color: colors.primary || "", secondary_color: colors.accent || "", background_color: colors.background || "",
        text_color: details?.text_color || "",
      };
      const found = new Set(ALL_KEYS.filter((k) => isFilled((next as any)[k])));
      setFlyerFound(found);
      const src: Partial<Record<BuilderKey, FieldSource>> = {};
      ALL_KEYS.forEach((k) => { src[k] = found.has(k) ? "flyer" : "blank"; });
      setSources(src);
      // Colours not found on the flyer fall back to editable TeeVents defaults (still marked Blank).
      const shown = { ...next };
      (["primary_color", "secondary_color", "background_color", "text_color"] as const).forEach((k) => { if (!shown[k]) shown[k] = TEEVENTS_COLORS[k]; });
      setV(await applyExisting(shown, "flyer"));
      const filled = ALL_KEYS.filter((k) => found.has(k)).map((k) => LABELS[k]);
      const blank = ALL_KEYS.filter((k) => !found.has(k)).map((k) => LABELS[k]);
      setReport(`Flyer produced: ${filled.join(", ") || "no certain event values"}. Not found on flyer: ${blank.join(", ") || "none"}. Colors: primary ${colors.primary || "not detected"}, accent ${colors.accent || "not detected"}, background ${colors.background || "not detected"}, text ${details?.text_color || "not detected"}. The flyer's logo is not cut out automatically; upload it on the Branding step.`);
    } catch {
      setV({ ...emptyValues(), ...TEEVENTS_COLORS });
      const src: Partial<Record<BuilderKey, FieldSource>> = {}; ALL_KEYS.forEach((k) => { src[k] = "blank"; }); setSources(src);
      setFlyerFound(new Set());
      setReport("The flyer could not be read. All event fields are blank — fill them in by hand. No colors were extracted; the swatches show editable TeeVents defaults.");
    } finally { setExtracting(false); }
  }

  const next = async () => {
    if (step === 2 && buildMode === "typed") setV(await applyExisting(v, "typed"));
    if (step === 2 && buildMode === "flyer") setV(await applyExisting(v, "flyer"));
    setStep(step + 1);
  };

  const notFound = (k: BuilderKey) => buildMode === "flyer" && flyerFound && !flyerFound.has(k) && sources[k] !== "already" && !isFilled((v as any)[k]);
  const SourceTag = ({ k }: { k: BuilderKey }) => {
    const s = sources[k] ?? (isFilled((v as any)[k]) ? (buildMode === "typed" ? "typed" : "blank") : "blank");
    return <Badge variant={s === "already" ? "secondary" : "outline"} className="ml-2 text-[10px] font-normal">{notFound(k) ? "Not found on flyer" : SOURCE_LABEL[s]}</Badge>;
  };
  const field = (k: Exclude<BuilderKey, "tiers" | "sponsors" | "schedule" | "contests">, opts: { type?: string; placeholder?: string; span?: boolean; required?: boolean } = {}) => (
    <div className={opts.span ? "md:col-span-2" : undefined}>
      <Label htmlFor={`client-${k}`}>{LABELS[k]}{opts.required ? " *" : ""}{step === 4 && <SourceTag k={k} />}</Label>
      <Input id={`client-${k}`} type={opts.type || "text"} value={v[k]} placeholder={opts.placeholder} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  const eventFields = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {field("event_name", { span: true, required: true, placeholder: "e.g. Spring Charity Classic" })}
        {field("organization_name")}
        {field("event_date", { type: "date", required: true })}
        {field("start_time", { placeholder: "e.g. 8:30 AM" })}
        {field("checkin_time", { placeholder: "e.g. 7:30 AM" })}
        {field("course_name")}
        {field("location")}
        {field("registration_fee", { type: "number", placeholder: "Per player, USD" })}
        <div>
          <Label>Scoring Format{step === 4 && <SourceTag k="scoring_format" />}</Label>
          <Select value={v.scoring_format} onValueChange={(x) => set("scoring_format", x)}>
            <SelectTrigger aria-label="Scoring Format"><SelectValue placeholder="Not stated" /></SelectTrigger>
            <SelectContent>{sampleFormats.map((fm) => <SelectItem key={fm} value={fm}>{fm}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {field("beneficiary", { span: true })}
        {field("contact_name")}
        {field("contact_email", { type: "email" })}
        {field("contact_phone")}
        {field("tagline", { span: true })}
        <div className="md:col-span-2">
          <Label htmlFor="client-description">Event description{step === 4 && <SourceTag k="description" />}</Label>
          <Textarea id="client-description" value={v.description} onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Registration tiers{step === 4 && <SourceTag k="tiers" />}</Label>
        {v.tiers.map((t, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[1fr_8rem_2fr_auto]">
            <Input aria-label="Tier name" placeholder="Individual / Foursome / VIP" value={t.name} onChange={(e) => set("tiers", v.tiers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
            <Input aria-label="Tier price" type="number" placeholder="Price" value={t.price} onChange={(e) => set("tiers", v.tiers.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />
            <Input aria-label="Tier includes" placeholder="What is included" value={t.includes} onChange={(e) => set("tiers", v.tiers.map((x, j) => j === i ? { ...x, includes: e.target.value } : x))} />
            <Button variant="ghost" size="icon" aria-label="Remove tier" onClick={() => set("tiers", v.tiers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => set("tiers", [...v.tiers, { name: "", price: "", includes: "" }])}><Plus className="h-4 w-4 mr-1" />Add tier</Button>
      </div>

      <div className="space-y-2">
        <Label>Schedule{step === 4 && <SourceTag k="schedule" />}</Label>
        <div className="grid gap-2 md:grid-cols-4">
          {(["registration", "shotgun", "lunch", "awards"] as const).map((k) => (
            <div key={k}>
              <span className="text-xs text-muted-foreground">{k === "shotgun" ? "Shotgun start" : k[0]!.toUpperCase() + k.slice(1)}</span>
              <Input value={v.schedule[k]} placeholder="e.g. 7:00 AM" onChange={(e) => set("schedule", { ...v.schedule, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sponsors{step === 4 && <SourceTag k="sponsors" />}</Label>
        {v.sponsors.map((s, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[2fr_1fr_auto]">
            <Input aria-label="Sponsor name" placeholder="Sponsor name" value={s.name} onChange={(e) => set("sponsors", v.sponsors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
            <Input aria-label="Sponsor tier" placeholder="Tier" value={s.tier} onChange={(e) => set("sponsors", v.sponsors.map((x, j) => j === i ? { ...x, tier: e.target.value } : x))} />
            <Button variant="ghost" size="icon" aria-label="Remove sponsor" onClick={() => set("sponsors", v.sponsors.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => set("sponsors", [...v.sponsors, { name: "", tier: "" }])}><Plus className="h-4 w-4 mr-1" />Add sponsor</Button>
      </div>

      <div className="space-y-2">
        <Label>Contests{step === 4 && <SourceTag k="contests" />}</Label>
        {v.contests.map((ct, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label="Contest" placeholder="e.g. Closest to the pin" value={ct} onChange={(e) => set("contests", v.contests.map((x, j) => j === i ? e.target.value : x))} />
            <Button variant="ghost" size="icon" aria-label="Remove contest" onClick={() => set("contests", v.contests.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => set("contests", [...v.contests, ""])}><Plus className="h-4 w-4 mr-1" />Add contest</Button>
      </div>
    </div>
  );

  const colorKeys = ["primary_color", "secondary_color", "background_color", "text_color"] as const;
  const useTeeVentsColors = () => { colorKeys.forEach((k) => set(k, TEEVENTS_COLORS[k])); };
  const colors = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {colorKeys.map((k) => (
          <div key={k}>
            <Label htmlFor={`client-${k}`}>{LABELS[k]}{step === 4 && <SourceTag k={k} />}</Label>
            <div className="flex items-center gap-2">
              <Input id={`client-${k}`} type="color" aria-label={LABELS[k]} value={HEX.test(v[k]) ? v[k] : "#000000"} onChange={(e) => set(k, e.target.value)} className="h-10 w-12 p-1" />
              <Input aria-label={`${LABELS[k]} hex`} value={v[k]} onChange={(e) => set(k, e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)} className="font-mono text-xs" maxLength={7} />
            </div>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => colorKeys.some((k) => sources[k] === "already") ? setConfirmColors(true) : useTeeVentsColors()}>Use TeeVents colors</Button>
    </div>
  );

  const safe = (k: typeof colorKeys[number]) => HEX.test(v[k]) ? v[k] : TEEVENTS_COLORS[k];
  const sched = scheduleText(v.schedule, v.start_time, v.checkin_time);
  const preview = (
    <section aria-label="Branded sample event page preview" className="client-sample-preview overflow-hidden rounded-md border"
      style={{ "--sample-primary": safe("primary_color"), "--sample-accent": safe("secondary_color"), "--sample-background": safe("background_color"), color: safe("text_color") } as React.CSSProperties}>
      <div className="client-sample-banner px-4 py-2 text-sm font-semibold">Sample • No payments or public registration</div>
      {heroUrl && <img src={heroUrl} alt="Sample event cover" className="h-40 w-full object-cover" />}
      <div className="p-5 space-y-3">
        {logoUrl && <img src={logoUrl} alt="Customer logo" className="h-12 object-contain" />}
        <div><h3 className="text-2xl font-semibold">{v.event_name || "Sample event"} <span className="text-xs align-middle border rounded px-1">Sample</span></h3>{v.tagline && <p className="text-sm">{v.tagline}</p>}</div>
        <div className="text-sm">{[v.event_date, v.course_name, v.location].filter(Boolean).join(" • ")}</div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="font-semibold">Registration Fee</dt><dd>{v.registration_fee ? `$${v.registration_fee}` : "Not stated"}</dd></div>
          <div><dt className="font-semibold">Scoring Format</dt><dd>{v.scoring_format || "Not stated"}</dd></div>
          {v.beneficiary && <div className="col-span-2"><dt className="font-semibold">Benefiting</dt><dd>{v.beneficiary}</dd></div>}
        </dl>
        {v.description && <p className="text-sm whitespace-pre-line">{v.description}</p>}
        {sched && <div className="text-sm"><p className="font-semibold">Schedule</p><p className="whitespace-pre-line">{sched}</p></div>}
        {v.tiers.length > 0 && <div className="text-sm"><p className="font-semibold">Registration packages</p>{v.tiers.map((t, i) => <p key={i}>{t.name}{t.price && ` — $${t.price}`}{t.includes && ` · ${t.includes}`}</p>)}</div>}
        {v.sponsors.length > 0 && <div className="text-sm"><p className="font-semibold">Sponsors</p><p>{v.sponsors.map((s) => s.tier ? `${s.name} (${s.tier})` : s.name).join(", ")}</p></div>}
        {v.contests.length > 0 && <div className="text-sm"><p className="font-semibold">Contests</p><p>{v.contests.join(", ")}</p></div>}
        {(v.contact_name || v.contact_email || v.contact_phone) && <p className="text-sm">Contact: {[v.contact_name, v.contact_email, v.contact_phone].filter(Boolean).join(" • ")}</p>}
        <div className="client-sample-accent px-3 py-2 inline-block font-semibold text-sm">Sample registration preview</div>
        <div className="border-t pt-3 text-sm">Customer • Event • Branding • Share — Guided sample tour</div>
      </div>
    </section>
  );

  const upload = (file: File, kind: "logo" | "hero") => {
    if (file.size > 2 * 1024 * 1024 && kind === "logo") {
      toast({ title: "Logo too large", description: "Please use a PNG or JPG under 2MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    if (kind === "logo") { setLogoFile(file); setLogoUrl(url); } else { setHeroFile(file); setHeroUrl(url); }
  };

  const generate = async () => {
    if (!canBuildClientSample(step, Boolean(built), busy, v.event_name)) return;
    if (!v.event_name.trim() || !v.event_date) {
      toast({ title: "Tournament Name and Event Date are required", variant: "destructive" });
      return;
    }
    if (conflicts.length) { toast({ title: "Choose Replace or Keep for each already-set value first", variant: "destructive" }); return; }
    setBusy(true);
    let createdId: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again");
      const uploadConfirmed = async (file: File | null, kind: string, fallback: string | null) => {
        if (!file) return fallback;
        const path = `samples/${Date.now()}-${kind}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
        const uploaded = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: false });
        if (uploaded.error) throw uploaded.error;
        return supabase.storage.from("tournament-assets").getPublicUrl(path).data.publicUrl;
      };
      const savedLogo = await uploadConfirmed(logoFile, "logo", logoUrl?.startsWith("blob:") ? null : logoUrl);
      const savedHero = await uploadConfirmed(heroFile, "hero", heroUrl?.startsWith("blob:") ? null : heroUrl);
      const feeCents = v.registration_fee.trim() ? Math.max(0, Math.round(Number(v.registration_fee) * 100)) : null;
      const cleanTiers = v.tiers.filter((t) => t.name.trim());
      const cleanSponsors = v.sponsors.filter((s) => s.name.trim());
      const cleanContests = v.contests.map((x) => x.trim()).filter(Boolean);
      const builder_details = {
        organization_name: v.organization_name, start_time: v.start_time, checkin_time: v.checkin_time, beneficiary: v.beneficiary,
        contact_name: v.contact_name, contact_email: v.contact_email, contact_phone: v.contact_phone, description: v.description,
        tagline: v.tagline, tiers: cleanTiers, sponsors: cleanSponsors, schedule: v.schedule, contests: cleanContests,
        schedule_text: sched, description_text: descriptionText({ ...v, tiers: cleanTiers, contests: cleanContests }),
        build_mode: buildMode, sources,
      };
      const row = {
        tournament_name: v.event_name.trim(), event_date: v.event_date || null, location: v.location || null,
        course_name: v.course_name || null, scoring_format: v.scoring_format || null,
        background_color: safe("background_color"), primary_color: safe("primary_color"), secondary_color: safe("secondary_color"), text_color: safe("text_color"),
        description: descriptionText({ ...v, tiers: cleanTiers, contests: cleanContests }) || null,
        logo_url: savedLogo, hero_image_url: savedHero, registration_fee_cents: feeCents, team_fee_cents: feeCents == null ? null : feeCents * 4,
        prospect_name: c.customer_name || null, prospect_email: c.prospect_email || null, prospect_phone: c.prospect_phone || null,
        prospect_company: v.organization_name || null, builder_details,
      };
      let sampleId: string; let slug: string; let link: string;
      if (existing) {
        const { data: upd, error } = await (supabase as any).from("sample_tournaments").update(row).eq("id", existing.id).select("id, unique_slug, sample_share_link").single();
        if (error) throw error;
        sampleId = upd.id; slug = upd.unique_slug; link = upd.sample_share_link || `https://teevents.golf/sample/${slug}`;
      } else {
        slug = `${slugify(v.event_name)}-${Math.random().toString(36).slice(2, 6)}`;
        link = `https://teevents.golf/sample/${slug}`;
        const { data: sample, error } = await (supabase as any).from("sample_tournaments").insert({
          ...row, admin_id: auth.user.id, sample_created_by: auth.user.id, unique_slug: slug, is_sample: true, sample_share_link: link, guided_tour: true,
        }).select("id").single();
        if (error) throw error;
        sampleId = sample.id; createdId = sample.id;
        const noteResult = await supabase.from("sample_build_notes").insert({ sample_id: sampleId, admin_notes: notes.trim() || null, organizer_mode: mode, organizer_email: organizerEmail.trim() || null, organizer_organization: organizerOrg.trim() || null });
        if (noteResult.error) throw noteResult.error;
        const players = SAMPLE_NAMES.slice(0, 8);
        const pr = await supabase.from("sample_participants").insert(players.map((name, i) => ({ sample_tournament_id: sampleId, name, handicap: 6 + i, email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com` })) as never);
        if (pr.error) throw pr.error;
        const lr = await supabase.from("sample_leaderboard").insert(players.map((name, i) => ({ sample_tournament_id: sampleId, player_name: name, gross_score: SAMPLE_SCORES[i % SAMPLE_SCORES.length], net_score: SAMPLE_SCORES[i % SAMPLE_SCORES.length]! - 3, thru: 18, position: i + 1 })) as never);
        if (lr.error) throw lr.error;
      }
      // Sponsors: add only when the sample has none yet (never replace a listed sponsor).
      const { count } = await (supabase as any).from("sample_sponsors").select("id", { count: "exact", head: true }).eq("sample_tournament_id", sampleId);
      if (!count && cleanSponsors.length) {
        const sr = await (supabase as any).from("sample_sponsors").insert(cleanSponsors.map((s) => ({ sample_tournament_id: sampleId, name: s.name, level: s.tier || null })));
        if (sr.error) throw sr.error;
      }
      const demo = await provisionDemo({ data: { sampleId } });
      setBuilt({ slug, link, dashboardLink: clientDemoDashboardLink(demo), customerName: c.customer_name, eventName: v.event_name });
      onCreated?.();
      toast({ title: existing ? "Sample updated" : "Sample created", description: "Nothing was sent. Copy the link or use Email / Text when you're ready." });
    } catch (e: any) {
      if (createdId) await supabase.from("sample_tournaments").delete().eq("id", createdId);
      toast({ title: "Could not build sample", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const reset = () => {
    setBuilt(null); setStep(1); setBuildMode(null); setLogoUrl(null); setHeroUrl(null); setLogoFile(null); setHeroFile(null);
    setFlyer(null); setFlyerPreview(""); setReport(""); setNotes(""); setMode("defer"); setOrganizerEmail(""); setOrganizerOrg("");
    setC({ customer_name: "", prospect_email: "", prospect_phone: "" }); setV(startValues()); setSources({}); setExisting(null);
    setConflicts([]); setCheckedKey(""); setFlyerFound(null);
  };

  const emailBody = built
    ? `Hi ${built.customerName || "there"},\n\nHere's the sample event page I built for ${built.eventName}: ${built.link}\n\nTake a look and let me know what you think. If you want, I can hop on a quick call to walk you through it.\n\n— Roderick`
    : "";
  const fmt = (x: unknown) => Array.isArray(x) ? x.map((i: any) => typeof i === "string" ? i : i.name).join(", ") : x && typeof x === "object" ? Object.values(x as object).filter(Boolean).join(", ") : String(x);
  const report2 = step === 4 && !built ? (() => {
    const by = (s: FieldSource) => ALL_KEYS.filter((k) => (sources[k] ?? (isFilled((v as any)[k]) ? (buildMode === "typed" ? "typed" : "blank") : "blank")) === s).map((k) => LABELS[k]);
    return { already: by("already"), flyer: by("flyer"), typed: by("typed"), blank: ALL_KEYS.filter((k) => !isFilled((v as any)[k])).map((k) => LABELS[k]) };
  })() : null;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" /> Build Sample Event
          <Badge variant="secondary" className="ml-1">Guided wizard</Badge>
        </CardTitle>
        <CardDescription>
          Build a branded Sample event page from a flyer or by typing it in, review everything, then share the link with a guided 4-step tour built in. Nothing is created or sent until you confirm.
        </CardDescription>
      </div>

      {!built && !buildMode && (
        <div className="grid gap-3 md:grid-cols-2">
          <button type="button" onClick={() => { setBuildMode("flyer"); }} className="rounded-lg border p-4 text-left hover:bg-muted/50">
            <p className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Build from flyer</p>
            <p className="text-sm text-muted-foreground">Upload a JPG, PNG or PDF flyer. Only what the flyer actually states is filled in.</p>
          </button>
          <button type="button" onClick={() => { setBuildMode("typed"); setSources({}); }} className="rounded-lg border p-4 text-left hover:bg-muted/50">
            <p className="font-semibold flex items-center gap-2"><Keyboard className="h-4 w-4" />Type it in</p>
            <p className="text-sm text-muted-foreground">Fill in a guided form with a live preview of the branded sample page.</p>
          </button>
          {onCancel && <div><Button variant="outline" onClick={onCancel}>Cancel</Button></div>}
        </div>
      )}

      {buildMode && <div className="space-y-5">
        {!built && buildMode === "flyer" && <div className="space-y-3 border-b pb-4">
          <Button variant="outline" disabled={extracting || busy} onClick={() => flyerRef.current?.click()}><Upload className="h-4 w-4 mr-2" />{extracting ? "Reading flyer…" : flyer ? "Upload a different flyer" : "Upload flyer"}</Button>
          <input ref={flyerRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void extract(file); }} />
          {flyer && <div className="text-sm font-medium">{flyer.name}</div>}
          {flyerPreview && (flyer?.type === "application/pdf" ? <object data={flyerPreview} type="application/pdf" className="h-64 w-full"><a href={flyerPreview} target="_blank" rel="noreferrer">View uploaded flyer</a></object> : <img src={flyerPreview} alt="Uploaded event flyer" className="max-h-64 max-w-full object-contain" />)}
          {report && <p role="status" className="text-sm text-muted-foreground">{report}</p>}
        </div>}
        {existing && !built && <p className="rounded border border-secondary/40 bg-secondary/10 p-2 text-sm">An existing sample with this Tournament Name and Event Date was opened. Its current values are kept; only blank fields were filled in.</p>}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {["Customer", "Event", "Branding", "Share"].map((label, i) => (
            <span key={label} className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-secondary text-secondary-foreground font-semibold" : "bg-muted"}`}>{i + 1}. {label}</span>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Customer Name</Label><Input value={c.customer_name} onChange={(e) => setC({ ...c, customer_name: e.target.value })} placeholder="Kenneth Smith" /></div>
            <div><Label>Organization Name</Label><Input value={v.organization_name} onChange={(e) => set("organization_name", e.target.value)} placeholder="Dominican Republic Golf Trip" /></div>
            <div><Label>Customer Email (for sharing)</Label><Input type="email" value={c.prospect_email} onChange={(e) => setC({ ...c, prospect_email: e.target.value })} placeholder="kenneth@example.com" /></div>
            <div><Label>Customer Mobile (for SMS)</Label><Input value={c.prospect_phone} onChange={(e) => setC({ ...c, prospect_phone: e.target.value })} placeholder="+1 555 123 4567" /></div>
          </div>
        )}

        {(step === 2 || (step === 4 && !built)) && <div className="space-y-4">
          {step === 4 && <h3 className="font-semibold">Review Sample Event</h3>}
          {step === 4 && conflicts.length > 0 && (
            <div className="rounded border border-destructive/40 p-3 space-y-2 text-sm">
              <p className="font-semibold">Replace what is already set?</p>
              {conflicts.map((cf) => (
                <div key={cf.key} className="flex flex-wrap items-center gap-2">
                  <span className="flex-1">{LABELS[cf.key]}: keep <b>{fmt((v as any)[cf.key]) || "—"}</b> or replace with <b>{fmt(cf.incoming) || "—"}</b></span>
                  <Button variant="outline" size="sm" onClick={() => { setV((cur) => ({ ...cur, [cf.key]: cf.incoming })); setSources((s) => ({ ...s, [cf.key]: buildMode === "flyer" ? "flyer" : "typed" })); setConflicts((x) => x.filter((y) => y.key !== cf.key)); }}>Replace</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConflicts((x) => x.filter((y) => y.key !== cf.key))}>Keep</Button>
                </div>
              ))}
            </div>
          )}
          {eventFields}
          <div className="border-t pt-4"><Label className="text-base font-semibold">Assign Organizer</Label><RadioGroup value={mode} onValueChange={setMode} className="mt-2 space-y-2">{[["defer", "Skip for now — assign later"], ["existing", "Assign to existing user"], ["invite", "Invite new organizer"]].map(([value, label]) => <div key={value} className="flex gap-2"><RadioGroupItem value={value!} id={`client-mode-${value}`} /><Label htmlFor={`client-mode-${value}`}>{label}</Label></div>)}</RadioGroup><p className="text-xs text-muted-foreground mt-2">Organizer assignment and invitations are available after conversion. Building a sample never creates an account or sends a temporary password.</p>{mode !== "defer" && <div className="grid gap-3 md:grid-cols-2 mt-3"><div><Label>Organizer Email</Label><Input type="email" value={organizerEmail} onChange={(e) => setOrganizerEmail(e.target.value)} /></div>{mode === "invite" && <div><Label>Organization Name (optional)</Label><Input value={organizerOrg} onChange={(e) => setOrganizerOrg(e.target.value)} /></div>}</div>}</div>
          <div><Label htmlFor="client-notes">Admin Notes (internal)</Label><Textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal note visible only to platform admins" /></div>
          {step === 4 && <>
            {colors}
            {logoUrl && <div className="text-sm">Logo: <img src={logoUrl} alt="Logo" className="inline h-10 object-contain" /></div>}
            {preview}
            <div className="text-sm text-muted-foreground">Share to — Email: {c.prospect_email || "Not provided"} • Mobile: {c.prospect_phone || "Not provided"}</div>
            {report2 && (
              <div className="rounded border p-3 text-xs space-y-1">
                <p><b>Already set and kept:</b> {report2.already.join(", ") || "none"}</p>
                <p><b>Filled from flyer:</b> {report2.flyer.join(", ") || "none"}</p>
                <p><b>Filled from typed input:</b> {report2.typed.join(", ") || "none"}</p>
                <p><b>Blank:</b> {report2.blank.join(", ") || "none"}</p>
                <p><b>Colors:</b> {colorKeys.map((k) => `${LABELS[k]} ${v[k]}`).join(" · ")}</p>
              </div>
            )}
          </>}
          {step === 2 && buildMode === "typed" && preview}
        </div>}

        {step === 3 && (
          <div className="space-y-4">
            {colors}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo (PNG/JPG, max 2MB)</Label>
                <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={busy}><Upload className="h-4 w-4 mr-1" /> Upload Logo</Button>
                  {logoUrl && <img src={logoUrl} alt="Logo preview" className="h-10 object-contain" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero Image (optional)</Label>
                <input ref={heroRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "hero")} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => heroRef.current?.click()} disabled={busy}><Upload className="h-4 w-4 mr-1" /> Upload Hero</Button>
                  {heroUrl && <img src={heroUrl} alt="Hero preview" className="h-10 w-20 object-cover rounded" />}
                </div>
              </div>
            </div>
            {preview}
          </div>
        )}

        {step === 4 && built && (
          <div className="space-y-4">
            <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4 space-y-3">
              <div className="text-sm font-semibold">Sample ready for {built.customerName || "your customer"} <Badge variant="outline">Sample</Badge></div>
              <p className="text-xs text-muted-foreground">Not live, no payments, no public registration, not assigned to an organizer. Nothing has been sent.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={built.link} className="max-w-sm" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(built.link); toast({ title: "Link copied" }); }}><Copy className="h-4 w-4 mr-1" /> Copy Link</Button>
                <a href={`/sample/${built.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-4 w-4 mr-1" /> Preview</Button></a>
                <Button size="sm" variant="outline" asChild><a href={built.dashboardLink}><Wand2 className="h-4 w-4 mr-1" /> Open Dashboard</a></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`mailto:${c.prospect_email}?subject=${encodeURIComponent(`Your sample event page – ${built.eventName}`)}&body=${encodeURIComponent(emailBody)}`}>
                  <Button size="sm" variant="outline" disabled={!c.prospect_email.trim()}><Mail className="h-4 w-4 mr-1" /> Send Email</Button>
                </a>
                <a href={`sms:${c.prospect_phone}?&body=${encodeURIComponent(`Hi ${built.customerName || "there"} — here's the sample event page for ${built.eventName}: ${built.link}`)}`}>
                  <Button size="sm" variant="outline" disabled={!c.prospect_phone.trim()}><MessageSquare className="h-4 w-4 mr-1" /> Send Text</Button>
                </a>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>Build another sample</Button>
          </div>
        )}

        {!built && <div className="flex items-center gap-2 pt-2 border-t border-border">
          {onCancel && <Button variant="outline" onClick={onCancel} disabled={busy || extracting}>Cancel</Button>}
          {step === 1 && <Button variant="ghost" onClick={() => { setBuildMode(null); }} disabled={busy || extracting}>Change how to build</Button>}
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy || extracting}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>}
          {step < 4
            ? <Button disabled={extracting || busy} onClick={() => void next()}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
            : <Button onClick={generate} disabled={busy || extracting || !v.event_name.trim() || !v.event_date || conflicts.length > 0}><Sparkles className="h-4 w-4 mr-1" />{busy ? "Building…" : "Build Sample Event"}</Button>}
        </div>}
      </div>}

      <AlertDialog open={confirmColors} onOpenChange={setConfirmColors}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace what is already set?</AlertDialogTitle>
            <AlertDialogDescription>This sample already has colors chosen. Use the TeeVents colors instead?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current colors</AlertDialogCancel>
            <AlertDialogAction onClick={() => { colorKeys.forEach((k) => { setV((cur) => ({ ...cur, [k]: TEEVENTS_COLORS[k] })); setSources((s) => ({ ...s, [k]: "typed" })); }); }}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

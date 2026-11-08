import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { readClientFlyer } from "@/lib/flyerSample.functions";
import { flyerImages } from "@/lib/flyerImages";
import { sampleFormats } from "@/lib/flyerSample";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Copy, ExternalLink, Mail, MessageSquare, Sparkles, Upload, Wand2,
} from "lucide-react";

const DEFAULT_PRIMARY = "#1a5c38";
const DEFAULT_SECONDARY = "#F5A623";

const SAMPLE_NAMES = [
  "John Smith", "Marcus Johnson", "David Chen", "Robert Alvarez",
  "Michael Brooks", "Anthony Reed", "James Whitfield", "Kevin Parker",
  "Terrence Hall", "Brian Cole", "Andre Wallace", "Chris Bennett",
];
const SAMPLE_SCORES = [68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

interface Built {
  slug: string;
  link: string;
  customerName: string;
  eventName: string;
}

export default function SampleWizard({ onCreated, onCancel }: { onCreated?: () => void; onCancel?: () => void } = {}) {
  const readFlyer = useServerFn(readClientFlyer);
  const flyerRef = useRef<HTMLInputElement>(null);
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
  const logoRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    customer_name: "",
    organization_name: "",
    event_name: "",
    event_date: "",
    location: "",
    prospect_email: "",
    prospect_phone: "",
    primary_color: DEFAULT_PRIMARY,
    secondary_color: DEFAULT_SECONDARY,
    course_name: "",
    scoring_format: "Scramble",
    background_color: "#ffffff",
    registration_fee: "",
    participants: "8",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  async function extract(file: File) {
    setFlyer(file); setFlyerPreview(URL.createObjectURL(file)); setExtracting(true); setReport("");
    setF(current => ({ ...current, event_name: "", event_date: "", course_name: "", location: "", registration_fee: "", scoring_format: "" }));
    try {
      const images = await flyerImages(file);
      const response = await readFlyer({ data: { images } });
      if (!response.ok || !response.result) throw new Error(response.error || "The flyer could not be read.");
      const { fields, colors, blank } = response.result;
      setF(current => ({ ...current, event_name: fields.tournament_name, event_date: fields.event_date, course_name: fields.course_name, location: fields.location, registration_fee: fields.registration_fee, scoring_format: fields.scoring_format, primary_color: colors.primary || current.primary_color, secondary_color: colors.accent || current.secondary_color, background_color: colors.background || current.background_color }));
      setReport(`Flyer produced: ${Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`).join("; ") || "no certain event values"}. Left blank: ${blank.map(k => k.replaceAll("_", " ")).join(", ") || "none"}. Extracted colors: primary ${colors.primary || "not detected"}, accent ${colors.accent || "not detected"}, background ${colors.background || "not detected"}.`);
    } catch {
      setReport("The flyer could not be read. All event fields are blank. No colors were extracted; the swatches show editable defaults.");
    } finally { setExtracting(false); }
  }

  const eventFields = (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2"><Label htmlFor="client-title">Tournament Name *</Label><Input id="client-title" value={f.event_name} onChange={e => setF({ ...f, event_name: e.target.value })} placeholder="e.g. Spring Charity Classic" /></div>
      <div><Label htmlFor="client-date">Event Date</Label><Input id="client-date" type="date" value={f.event_date} onChange={e => setF({ ...f, event_date: e.target.value })} /></div>
      <div><Label htmlFor="client-fee">Registration Fee (USD)</Label><Input id="client-fee" type="number" min="0" step="0.01" value={f.registration_fee} onChange={e => setF({ ...f, registration_fee: e.target.value })} /></div>
      <div><Label htmlFor="client-course">Course</Label><Input id="client-course" value={f.course_name} onChange={e => setF({ ...f, course_name: e.target.value })} /></div>
      <div><Label htmlFor="client-location">Location</Label><Input id="client-location" value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
      <div className="md:col-span-2"><Label>Scoring Format</Label><Select value={f.scoring_format} onValueChange={scoring_format => setF({ ...f, scoring_format })}><SelectTrigger aria-label="Scoring Format"><SelectValue placeholder="Not stated" /></SelectTrigger><SelectContent>{sampleFormats.map(format => <SelectItem key={format} value={format}>{format}</SelectItem>)}</SelectContent></Select></div>
    </div>
  );
  const colors = <div className="grid grid-cols-3 gap-3">{([["primary_color", "Primary Color"], ["secondary_color", "Accent Color"], ["background_color", "Background Color"]] as const).map(([key, label]) => <div key={key}><Label htmlFor={`client-${key}`}>{label}</Label><Input id={`client-${key}`} type="color" aria-label={label} value={f[key]} onChange={e => setF({ ...f, [key]: e.target.value })} className="h-10 w-full p-1" /><span className="text-xs">{f[key]}</span></div>)}</div>;
  const preview = <section aria-label="Branded sample event page preview" className="client-sample-preview overflow-hidden rounded-md border" style={{ "--sample-primary": f.primary_color, "--sample-accent": f.secondary_color, "--sample-background": f.background_color } as React.CSSProperties}>
    <div className="client-sample-banner px-4 py-2 text-sm font-semibold">Sample • No payments or public registration</div>
    {heroUrl && <img src={heroUrl} alt="Sample event cover" className="h-40 w-full object-cover" />}
    <div className="p-5 space-y-3">{logoUrl && <img src={logoUrl} alt="Customer logo" className="h-12 object-contain" />}<h3 className="text-2xl font-semibold">{f.event_name || "Sample event"}</h3><div className="text-sm">{[f.event_date, f.course_name, f.location].filter(Boolean).join(" • ")}</div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt>Registration Fee</dt><dd>{f.registration_fee ? `$${f.registration_fee}` : "Not stated"}</dd></div><div><dt>Scoring Format</dt><dd>{f.scoring_format || "Not stated"}</dd></div></dl><div className="client-sample-accent px-3 py-2 inline-block font-semibold text-sm">Sample registration preview</div><div className="border-t pt-3 text-sm">Customer • Event • Branding • Share — Guided sample tour</div></div>
  </section>;

  const upload = async (file: File, kind: "logo" | "hero") => {
    if (file.size > 2 * 1024 * 1024 && kind === "logo") {
      toast({ title: "Logo too large", description: "Please use a PNG or JPG under 2MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    if (kind === "logo") { setLogoFile(file); setLogoUrl(url); }
    else { setHeroFile(file); setHeroUrl(url); }
  };

  const generate = async () => {
    if (step !== 4 || built || busy) return;
    if (!f.event_name.trim()) {
      toast({ title: "Event name is required", variant: "destructive" });
      return;
    }
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
      const savedLogo = await uploadConfirmed(logoFile, "logo", logoUrl);
      const savedHero = await uploadConfirmed(heroFile, "hero", heroUrl);
      const slug = `${slugify(f.event_name)}-${Math.random().toString(36).slice(2, 6)}`;
      const link = `https://teevents.golf/sample/${slug}`;
      const feeCents = f.registration_fee.trim() ? Math.max(0, Math.round(Number(f.registration_fee) * 100)) : null;

      const { data: sample, error } = await supabase
        .from("sample_tournaments")
        .insert({
          admin_id: auth.user?.id ?? null,
          sample_created_by: auth.user?.id ?? null,
          unique_slug: slug,
          tournament_name: f.event_name.trim(),
          event_date: f.event_date || null,
          location: f.location || null,
          course_name: f.course_name || null,
          scoring_format: f.scoring_format || null,
          background_color: f.background_color,
          is_sample: true,
          description: f.organization_name
            ? `A custom TeeVents sample built for ${f.organization_name}.`
            : null,
          logo_url: savedLogo,
          hero_image_url: savedHero,
          registration_fee_cents: feeCents,
          team_fee_cents: feeCents == null ? null : feeCents * 4,
          primary_color: f.primary_color,
          secondary_color: f.secondary_color,
          prospect_name: f.customer_name || null,
          prospect_email: f.prospect_email || null,
          prospect_phone: f.prospect_phone || null,
          prospect_company: f.organization_name || null,
          sample_share_link: link,
          guided_tour: true,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      if (!sample) throw new Error("Sample was not created");
      createdId = sample.id;
      const noteResult = await supabase.from("sample_build_notes").insert({ sample_id: sample.id, admin_notes: notes.trim() || null, organizer_mode: mode, organizer_email: organizerEmail.trim() || null, organizer_organization: organizerOrg.trim() || null });
      if (noteResult.error) throw noteResult.error;

      const count = Math.min(Math.max(Number(f.participants || "8"), 1), 12);
      const players = SAMPLE_NAMES.slice(0, count);
      const participantResult = await supabase.from("sample_participants").insert(
        players.map((name, i) => ({
          sample_tournament_id: (sample as any).id,
          name,
          handicap: 6 + i,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        })) as never,
      );
      if (participantResult.error) throw participantResult.error;
      const leaderboardResult = await supabase.from("sample_leaderboard").insert(
        players.map((name, i) => ({
          sample_tournament_id: (sample as any).id,
          player_name: name,
          gross_score: SAMPLE_SCORES[i % SAMPLE_SCORES.length],
          net_score: SAMPLE_SCORES[i % SAMPLE_SCORES.length] - 3,
          thru: 18,
          position: i + 1,
        })) as never,
      );

      if (leaderboardResult.error) throw leaderboardResult.error;
      setBuilt({ slug, link, customerName: f.customer_name, eventName: f.event_name });
      setStep(4);
      onCreated?.();
      toast({ title: "Sample created", description: "Copy the link and send it to your customer." });
    } catch (e: any) {
      if (createdId) await supabase.from("sample_tournaments").delete().eq("id", createdId);
      toast({ title: "Could not create sample", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const emailBody = built
    ? `Hi ${built.customerName || "there"},\n\nHere's the sample event page I built for ${built.eventName}: ${built.link}\n\nTake a look and let me know what you think. If you want, I can hop on a quick call to walk you through it.\n\n— Roderick`
    : "";

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" /> Build Sample Event
          <Badge variant="secondary" className="ml-1">Guided wizard</Badge>
        </CardTitle>
        <CardDescription>
          Enter the customer's details, generate a branded sample event page, and send them a link with a guided
          4-step tour built in.
        </CardDescription>
      </div>
      <div className="space-y-5">
        {!built && <div className="space-y-3 border-b pb-4">
          <Button variant="outline" disabled={extracting || busy} onClick={() => flyerRef.current?.click()}><Upload className="h-4 w-4 mr-2" />{extracting ? "Reading flyer…" : "Build from flyer"}</Button>
          <input ref={flyerRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void extract(file); }} />
          {flyer && <div className="text-sm font-medium">{flyer.name}</div>}
          {flyerPreview && (flyer?.type === "application/pdf" ? <object data={flyerPreview} type="application/pdf" className="h-64 w-full"><a href={flyerPreview} target="_blank" rel="noreferrer">View uploaded flyer</a></object> : <img src={flyerPreview} alt="Uploaded event flyer" className="max-h-64 max-w-full object-contain" />)}
          {report && <p role="status" className="text-sm text-muted-foreground">{report}</p>}
        </div>}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {["Customer", "Event", "Branding", "Share"].map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-secondary text-secondary-foreground font-semibold" : "bg-muted"}`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Customer Name</Label>
              <Input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} placeholder="Kenneth Smith" />
            </div>
            <div>
              <Label>Organization Name</Label>
              <Input value={f.organization_name} onChange={(e) => setF({ ...f, organization_name: e.target.value })} placeholder="Dominican Republic Golf Trip" />
            </div>
            <div>
              <Label>Customer Email (for sharing)</Label>
              <Input type="email" value={f.prospect_email} onChange={(e) => setF({ ...f, prospect_email: e.target.value })} placeholder="kenneth@example.com" />
            </div>
            <div>
              <Label>Customer Mobile (for SMS)</Label>
              <Input value={f.prospect_phone} onChange={(e) => setF({ ...f, prospect_phone: e.target.value })} placeholder="+1 555 123 4567" />
            </div>
          </div>
        )}

        {(step === 2 || (step === 4 && !built)) && <div className="space-y-4">
          {step === 4 && <h3 className="font-semibold">Review Sample Event</h3>}
          {eventFields}
          <div className="border-t pt-4"><Label className="text-base font-semibold">Assign Organizer</Label><RadioGroup value={mode} onValueChange={setMode} className="mt-2 space-y-2">{[["defer", "Skip for now — assign later"], ["existing", "Assign to existing user"], ["invite", "Invite new organizer"]].map(([value, label]) => <div key={value} className="flex gap-2"><RadioGroupItem value={value} id={`client-mode-${value}`} /><Label htmlFor={`client-mode-${value}`}>{label}</Label></div>)}</RadioGroup><p className="text-xs text-muted-foreground mt-2">Organizer assignment and invitations are available after conversion. Building a sample never creates an account or sends a temporary password.</p>{mode !== "defer" && <div className="grid gap-3 md:grid-cols-2 mt-3"><div><Label>Organizer Email</Label><Input type="email" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} /></div>{mode === "invite" && <div><Label>Organization Name (optional)</Label><Input value={organizerOrg} onChange={e => setOrganizerOrg(e.target.value)} /></div>}</div>}</div>
          <div><Label htmlFor="client-notes">Admin Notes (internal)</Label><Textarea id="client-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal note visible only to platform admins" /></div>
          {step === 4 && <>{colors}{preview}<div className="text-sm text-muted-foreground">Email: {f.prospect_email || "Not provided"} • Mobile: {f.prospect_phone || "Not provided"}</div></>}
        </div>}

        {step === 3 && (
          <div className="space-y-4">
            {colors}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo (PNG/JPG, max 2MB)</Label>
                <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={busy}>
                    <Upload className="h-4 w-4 mr-1" /> Upload Logo
                  </Button>
                  {logoUrl && <img src={logoUrl} alt="Logo preview" className="h-10 object-contain" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero Image (optional)</Label>
                <input ref={heroRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "hero")} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => heroRef.current?.click()} disabled={busy}>
                    <Upload className="h-4 w-4 mr-1" /> Upload Hero
                  </Button>
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
              <div className="text-sm font-semibold">Sample ready for {built.customerName || "your customer"}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={built.link} className="max-w-sm" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(built.link); toast({ title: "Link copied" }); }}>
                  <Copy className="h-4 w-4 mr-1" /> Copy Link
                </Button>
                <a href={`/sample/${built.slug}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline"><ExternalLink className="h-4 w-4 mr-1" /> Preview</Button>
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${f.prospect_email}?subject=${encodeURIComponent(`Your sample event page – ${built.eventName}`)}&body=${encodeURIComponent(emailBody)}`}
                >
                  <Button size="sm" variant="outline" disabled={!f.prospect_email.trim()}><Mail className="h-4 w-4 mr-1" /> Send Email</Button>
                </a>
                <a href={`sms:${f.prospect_phone}?&body=${encodeURIComponent(`Hi ${built.customerName || "there"} — here's the sample event page for ${built.eventName}: ${built.link}`)}`}>
                  <Button size="sm" variant="outline" disabled={!f.prospect_phone.trim()}><MessageSquare className="h-4 w-4 mr-1" /> Send Text</Button>
                </a>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setBuilt(null); setStep(1); setLogoUrl(null); setHeroUrl(null); }}
            >
              Build another sample
            </Button>
          </div>
        )}

        {!built && <div className="flex items-center gap-2 pt-2 border-t border-border">
          {onCancel && <Button variant="outline" onClick={onCancel} disabled={busy || extracting}>Cancel</Button>}
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy || extracting}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>}
          {step < 4 ? <Button disabled={extracting || busy} onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button> : <Button onClick={generate} disabled={busy || extracting || !f.event_name.trim()}><Sparkles className="h-4 w-4 mr-1" />{busy ? "Building…" : "Build Sample Event"}</Button>}
        </div>}
      </div>
    </section>
  );
}

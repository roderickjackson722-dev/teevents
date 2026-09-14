import { useRef, useState } from "react";
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

export default function SampleWizard() {
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
    registration_fee: "250",
    participants: "8",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  const upload = async (file: File, kind: "logo" | "hero") => {
    if (file.size > 2 * 1024 * 1024 && kind === "logo") {
      toast({ title: "Logo too large", description: "Please use a PNG or JPG under 2MB.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `samples/${Date.now()}-${kind}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    setBusy(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    if (kind === "logo") setLogoUrl(data.publicUrl);
    else setHeroUrl(data.publicUrl);
    toast({ title: kind === "logo" ? "Logo uploaded" : "Hero image uploaded" });
  };

  const generate = async () => {
    if (!f.event_name.trim()) {
      toast({ title: "Event name is required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const slug = `${slugify(f.event_name)}-${Math.random().toString(36).slice(2, 6)}`;
      const link = `https://teevents.golf/sample/${slug}`;
      const feeCents = Math.max(0, Math.round(Number(f.registration_fee || "0") * 100));

      const { data: sample, error } = await supabase
        .from("sample_tournaments")
        .insert({
          admin_id: auth.user?.id ?? null,
          sample_created_by: auth.user?.id ?? null,
          unique_slug: slug,
          tournament_name: f.event_name.trim(),
          event_date: f.event_date || null,
          location: f.location || null,
          description: f.organization_name
            ? `A custom TeeVents sample built for ${f.organization_name}.`
            : null,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
          registration_fee_cents: feeCents,
          team_fee_cents: feeCents * 4,
          primary_color: f.primary_color,
          secondary_color: f.secondary_color,
          prospect_name: f.customer_name || null,
          prospect_email: f.prospect_email || null,
          prospect_company: f.organization_name || null,
          sample_share_link: link,
          guided_tour: true,
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      const count = Math.min(Math.max(Number(f.participants || "8"), 1), 12);
      const players = SAMPLE_NAMES.slice(0, count);
      await supabase.from("sample_participants").insert(
        players.map((name, i) => ({
          sample_tournament_id: (sample as any).id,
          name,
          handicap: 6 + i,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        })) as never,
      );
      await supabase.from("sample_leaderboard").insert(
        players.map((name, i) => ({
          sample_tournament_id: (sample as any).id,
          player_name: name,
          gross_score: SAMPLE_SCORES[i % SAMPLE_SCORES.length],
          net_score: SAMPLE_SCORES[i % SAMPLE_SCORES.length] - 3,
          thru: 18,
          position: i + 1,
        })) as never,
      );

      setBuilt({ slug, link, customerName: f.customer_name, eventName: f.event_name });
      setStep(4);
      toast({ title: "Sample created", description: "Copy the link and send it to your customer." });
    } catch (e: any) {
      toast({ title: "Could not create sample", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const emailBody = built
    ? `Hi ${built.customerName || "there"},\n\nHere's the sample event page I built for ${built.eventName}: ${built.link}\n\nTake a look and let me know what you think. If you want, I can hop on a quick call to walk you through it.\n\n— Roderick`
    : "";

  return (
    <Card className="border-secondary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" /> Build Customer Sample
          <Badge variant="secondary" className="ml-1">Guided wizard</Badge>
        </CardTitle>
        <CardDescription>
          Enter the customer's details, generate a branded sample event page, and send them a link with a guided
          4-step tour built in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Event Name</Label>
              <Input value={f.event_name} onChange={(e) => setF({ ...f, event_name: e.target.value })} placeholder="DR Golf Classic 2027" />
            </div>
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} />
            </div>
            <div>
              <Label>Event Location</Label>
              <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Punta Cana, DR" />
            </div>
            <div>
              <Label>Registration Fee ($)</Label>
              <Input type="number" value={f.registration_fee} onChange={(e) => setF({ ...f, registration_fee: e.target.value })} />
            </div>
            <div>
              <Label>Sample Participants</Label>
              <Input type="number" min={1} max={12} value={f.participants} onChange={(e) => setF({ ...f, participants: e.target.value })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Primary Color</Label>
                <Input type="color" value={f.primary_color} onChange={(e) => setF({ ...f, primary_color: e.target.value })} className="h-10 w-24 p-1" />
              </div>
              <div>
                <Label>Secondary Color</Label>
                <Input type="color" value={f.secondary_color} onChange={(e) => setF({ ...f, secondary_color: e.target.value })} className="h-10 w-24 p-1" />
              </div>
            </div>
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
          </div>
        )}

        {step === 4 && built && (
          <div className="space-y-4">
            <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-4 space-y-3">
              <div className="text-sm font-semibold">Sample ready for {built.customerName || "your customer"}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={built.link} className="max-w-sm" />
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(built.link); toast({ title: "Link copied" }); }}>
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
                  <Button size="sm" variant="outline"><Mail className="h-4 w-4 mr-1" /> Send Email</Button>
                </a>
                <a href={`sms:${f.prospect_phone}?&body=${encodeURIComponent(`Hi ${built.customerName || "there"} — here's the sample event page for ${built.eventName}: ${built.link}`)}`}>
                  <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4 mr-1" /> Send Text</Button>
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

        {step < 4 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={generate} disabled={busy} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
                <Sparkles className="h-4 w-4 mr-1" /> {busy ? "Generating…" : "Generate Sample"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

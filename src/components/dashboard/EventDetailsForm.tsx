import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Globe } from "lucide-react";
import { toast } from "sonner";
import { SCORING_FORMATS } from "@/lib/scoringFormats";
import { useDemoMode } from "@/hooks/useDemoMode";

interface Props {
  tournamentId: string;
  onSaved?: () => void;
}

interface FormState {
  title: string;
  date: string;
  end_date: string;
  location: string;
  course_name: string;
  registration_fee: string;
  scoring_format: string;
  site_hero_subtitle: string;
}

const EMPTY: FormState = {
  title: "", date: "", end_date: "", location: "", course_name: "",
  registration_fee: "", scoring_format: "scramble_4", site_hero_subtitle: "",
};

/**
 * Event Details — the same tournament fields the public tournament page renders,
 * edited directly (no intermediate "Edit Site" step). Saving writes to the
 * `tournaments` row, so the public page reflects the change immediately.
 */
export default function EventDetailsForm({ tournamentId, onSaved }: Props) {
  const { demoGuard } = useDemoMode();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slug, setSlug] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("title, date, end_date, location, course_name, registration_fee_cents, scoring_format, site_hero_title, site_hero_subtitle, slug")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) { setLoading(false); return; }
        const d = data as any;
        setForm({
          title: d.title || "",
          date: d.date || "",
          end_date: d.end_date || "",
          location: d.location || "",
          course_name: d.course_name || "",
          registration_fee: d.registration_fee_cents ? (d.registration_fee_cents / 100).toString() : "",
          scoring_format: d.scoring_format || "scramble_4",
          site_hero_subtitle: d.site_hero_subtitle || "",
        });
        setHeroTitle(d.site_hero_title || "");
        setSlug(d.slug || null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (demoGuard()) return;
    const title = form.title.trim();
    if (!title) { toast.error("Tournament name is required"); return; }
    setSaving(true);

    const feeNum = parseFloat(form.registration_fee);
    const updates: Record<string, any> = {
      title,
      date: form.date || null,
      end_date: form.end_date || null,
      location: form.location || null,
      course_name: form.course_name || null,
      scoring_format: form.scoring_format,
      site_hero_subtitle: form.site_hero_subtitle || null,
      registration_fee_cents: form.registration_fee === "" || Number.isNaN(feeNum)
        ? null
        : Math.round(feeNum * 100),
    };
    // Keep the public hero title in sync only when it was empty or mirroring the name.
    if (!heroTitle.trim()) updates.site_hero_title = title;

    const { error } = await supabase.from("tournaments").update(updates as any).eq("id", tournamentId);
    if (error) toast.error(error.message);
    else {
      toast.success("Event details saved — your public page is updated.");
      onSaved?.();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Event Details</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            These fields power your public tournament page. Changes save instantly to your live site.
          </p>
        </div>
        {slug && (
          <Button asChild variant="outline" size="sm">
            <a href={`/t/${slug}`} target="_blank" rel="noreferrer">
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              View Page
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ed-title">Tournament Name</Label>
          <Input id="ed-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ed-date">Event Date</Label>
          <Input id="ed-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ed-end">End Date (optional)</Label>
          <Input id="ed-end" type="date" value={form.end_date} min={form.date || undefined} onChange={(e) => set("end_date", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ed-location">Location</Label>
          <Input id="ed-location" value={form.location} placeholder="e.g. Dallas, TX" onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ed-course">Golf Course</Label>
          <Input id="ed-course" value={form.course_name} placeholder="e.g. Pine Valley Golf Club" onChange={(e) => set("course_name", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ed-fee">Registration Fee ($ per player)</Label>
          <Input id="ed-fee" type="number" min="0" step="0.01" value={form.registration_fee} placeholder="0.00" onChange={(e) => set("registration_fee", e.target.value)} />
        </div>
        <div>
          <Label>Scoring Format</Label>
          <Select value={form.scoring_format} onValueChange={(v) => set("scoring_format", v)}>
            <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
            <SelectContent>
              {SCORING_FORMATS.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ed-sub">Tagline / Helpful Info (shown under the title)</Label>
          <Input id="ed-sub" value={form.site_hero_subtitle} placeholder="e.g. Benefiting local youth golf" onChange={(e) => set("site_hero_subtitle", e.target.value)} />
        </div>
      </div>

      <Button className="mt-6" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Event Details
      </Button>
    </div>
  );
}

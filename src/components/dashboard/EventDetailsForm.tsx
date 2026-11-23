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
  best_ball_counting_scores: string;
  min_drives_enabled: boolean;
  min_drives_per_player: string;
}

const EMPTY: FormState = {
  title: "", date: "", end_date: "", location: "", course_name: "",
  registration_fee: "", scoring_format: "scramble_4", site_hero_subtitle: "",
  best_ball_counting_scores: "1", min_drives_enabled: false, min_drives_per_player: "",
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
  const [savedFormat, setSavedFormat] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("title, date, end_date, location, course_name, registration_fee_cents, scoring_format, best_ball_counting_scores, min_drives_enabled, min_drives_per_player, site_hero_title, site_hero_subtitle, slug")
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
          best_ball_counting_scores: String(d.best_ball_counting_scores ?? 1),
          min_drives_enabled: !!d.min_drives_enabled,
          min_drives_per_player: d.min_drives_per_player != null ? String(d.min_drives_per_player) : "",
        });
        setSavedFormat(d.scoring_format || "scramble_4");
        setHeroTitle(d.site_hero_title || "");
        setSlug(d.slug || null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isScrambleFormat = form.scoring_format.startsWith("scramble_");

  const save = async () => {
    if (demoGuard()) return;
    const title = form.title.trim();
    if (!title) { toast.error("Tournament name is required"); return; }
    const minDrives = parseInt(form.min_drives_per_player, 10);
    if (isScrambleFormat && form.min_drives_enabled && (!Number.isFinite(minDrives) || minDrives < 1 || minDrives > 18)) {
      toast.error("Enter a minimum number of drives between 1 and 18.");
      return;
    }
    setSaving(true);

    // Changing the format after scores exist never converts old scores: the
    // organizer must confirm, and only then are this event's scores cleared.
    const formatChanged = savedFormat != null && form.scoring_format !== savedFormat;
    if (formatChanged) {
      const { count } = await supabase
        .from("tournament_scores_with_teams")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournamentId);
      if ((count ?? 0) > 0) {
        const ok = window.confirm(
          "This event already has scores. Changing the format will clear the scores for this event. Clear the scores and change the format?",
        );
        if (!ok) { setSaving(false); return; }
        const del1 = await supabase.from("tournament_scores").delete().eq("tournament_id", tournamentId);
        const del2 = await (supabase as any).from("tournament_team_scores").delete().eq("tournament_id", tournamentId);
        const delErr = del1.error || del2.error;
        if (delErr) { toast.error(delErr.message); setSaving(false); return; }
      }
    }

    const feeNum = parseFloat(form.registration_fee);
    const updates: Record<string, any> = {
      title,
      date: form.date || null,
      end_date: form.end_date || null,
      location: form.location || null,
      course_name: form.course_name || null,
      scoring_format: form.scoring_format,
      best_ball_counting_scores: form.scoring_format === "best_ball_4" && form.best_ball_counting_scores === "2" ? 2 : 1,
      min_drives_enabled: isScrambleFormat ? form.min_drives_enabled : false,
      min_drives_per_player: isScrambleFormat && form.min_drives_enabled ? minDrives : null,
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
      setSavedFormat(form.scoring_format);
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
            <SelectTrigger>
              <SelectValue placeholder="Select format">
                {SCORING_FORMATS.find((f) => f.id === form.scoring_format)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-[min(32rem,calc(100vw-2rem))]">
              {SCORING_FORMATS.map((f) => (
                <SelectItem key={f.id} value={f.id} className="items-start py-2">
                  <span className="block font-medium">{f.name}</span>
                  <span className="block whitespace-normal text-xs text-muted-foreground">{f.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.scoring_format === "best_ball_4" && (
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium text-foreground">Scores that count per hole</p>
              <label className="flex items-center gap-2"><input type="radio" checked={form.best_ball_counting_scores !== "2"} onChange={() => set("best_ball_counting_scores", "1")} /> Best 1 of 4</label>
              <label className="flex items-center gap-2"><input type="radio" checked={form.best_ball_counting_scores === "2"} onChange={() => set("best_ball_counting_scores", "2")} /> Best 2 of 4</label>
              <p className="text-xs text-muted-foreground">Set this before the round starts.</p>
            </div>
          )}
          {isScrambleFormat && (
            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.min_drives_enabled} onChange={(e) => setForm((p) => ({ ...p, min_drives_enabled: e.target.checked }))} />
                Require a minimum number of drives per player (optional)
              </label>
              {form.min_drives_enabled && (
                <div className="max-w-[12rem]">
                  <Label htmlFor="ed-min-drives">Drives per player</Label>
                  <Input id="ed-min-drives" type="number" min={1} max={18} value={form.min_drives_per_player} onChange={(e) => set("min_drives_per_player", e.target.value)} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">This is your event rule, not a USGA rule. TeeVents never sets a number for you.</p>
            </div>
          )}
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

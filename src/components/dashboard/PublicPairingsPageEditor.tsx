import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, LayoutTemplate, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAIRINGS_PAGE_DEFAULTS, resolvePairingsPageConfig, type PairingsPageConfig } from "@/lib/pairingsPageConfig";

interface Props {
  tournamentId: string;
  slug?: string | null;
  config: unknown;
  onSaved?: (config: PairingsPageConfig) => void;
}

const TOGGLES: { key: keyof PairingsPageConfig; label: string; hint: string }[] = [
  { key: "show_logo", label: "Event logo", hint: "Shows your tournament logo at the top." },
  { key: "show_date", label: "Event date", hint: "Displays the event date in the header." },
  { key: "show_course", label: "Course name", hint: "Displays the course in the header." },
  { key: "show_tee_times", label: "Tee times", hint: "Shows each group's tee time." },
  { key: "show_starting_hole", label: "Starting hole", hint: "Shows the starting hole for each group." },
  { key: "show_flights", label: "Flight / division", hint: "Shows the flight next to each group." },
  { key: "show_team_names", label: "Team names", hint: "Uses team names instead of group numbers." },
  { key: "show_contact", label: "Contact email", hint: "Adds your contact email in the footer." },
];

export default function PublicPairingsPageEditor({ tournamentId, slug, config, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PairingsPageConfig>(resolvePairingsPageConfig(config));

  useEffect(() => {
    if (open) setDraft(resolvePairingsPageConfig(config));
  }, [open, config]);

  const set = <K extends keyof PairingsPageConfig>(key: K, value: PairingsPageConfig[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ pairings_page_config: draft as never })
        .eq("id", tournamentId);
      if (error) throw error;
      toast.success("Public pairings page updated");
      onSaved?.(draft);
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LayoutTemplate className="h-4 w-4 mr-1" />
          Set Up Public Page
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Public Tee Times &amp; Pairings Page</DialogTitle>
          <DialogDescription>
            This is the page players see from the "View all tee times and pairings" link in your emails.
            We start you with a proven template — edit anything you like.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Page headline</Label>
            <Input
              value={draft.headline}
              placeholder="Leave blank to use the tournament name"
              onChange={(e) => set("headline", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Intro message</Label>
            <Textarea rows={3} value={draft.intro} onChange={(e) => set("intro", e.target.value)} />
          </div>

          <div className="grid gap-2">
            {TOGGLES.map((t) => (
              <div key={t.key} className="flex items-center justify-between rounded-md border border-border p-2.5">
                <div>
                  <Label className="text-sm font-medium">{t.label}</Label>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </div>
                <Switch
                  checked={Boolean(draft[t.key])}
                  onCheckedChange={(v) => set(t.key, v as never)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Details box title</Label>
            <Input value={draft.notes_title} onChange={(e) => set("notes_title", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Details box text (check-in, range, lunch, rules…)</Label>
            <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
            <p className="text-xs text-muted-foreground">Leave blank to hide this box.</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Footer note</Label>
            <Textarea rows={2} value={draft.footer_note} onChange={(e) => set("footer_note", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Accent color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" className="h-9 w-16 p-1" value={draft.accent} onChange={(e) => set("accent", e.target.value)} />
              <Input value={draft.accent} onChange={(e) => set("accent", e.target.value)} className="h-9 w-32" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(PAIRINGS_PAGE_DEFAULTS)}>
              Reset to template
            </Button>
            {slug && (
              <Button variant="ghost" size="sm" asChild>
                <a href={`/pairings/${slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Preview
                </a>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Page
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

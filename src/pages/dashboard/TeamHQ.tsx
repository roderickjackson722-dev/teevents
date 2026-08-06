import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink } from "lucide-react";
import {
  DEFAULT_TEAM_HQ_SETTINGS,
  TEAM_HQ_SECTION_LABELS,
  parseTeamHqSettings,
  type TeamHqSettings,
} from "@/lib/teamHqSettings";

interface TRow { id: string; title: string; slug: string | null }

/** Organizer controls for the public mobile Team Homepage at /team/:slug */
export default function TeamHQ() {
  const [tournaments, setTournaments] = useState<TRow[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [slug, setSlug] = useState<string | null>(null);
  const [settings, setSettings] = useState<TeamHqSettings>(DEFAULT_TEAM_HQ_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgs } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
      const orgIds = (orgs || []).map((o: any) => o.organization_id);
      if (!orgIds.length) return;
      const { data: ts } = await supabase
        .from("tournaments")
        .select("id, title, slug")
        .in("organization_id", orgIds)
        .order("date", { ascending: false });
      setTournaments((ts as any) || []);
      if (ts?.length) setTournamentId((ts as any)[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, slug, team_hq_settings")
        .eq("id", tournamentId)
        .maybeSingle();
      const d: any = data;
      setSlug(d?.slug ?? null);
      setSettings(parseTeamHqSettings(d?.team_hq_settings));
    })();
  }, [tournamentId]);

  const save = async () => {
    if (!tournamentId) return;
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({ team_hq_settings: settings } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Team HQ settings saved" });
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.teevents.golf";
  const teamUrl = slug ? `${origin}/team/${slug}` : "";

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Team HQ</h1>
        <p className="text-sm text-muted-foreground">
          Choose which resources appear on the mobile page your team members open on event day.
        </p>
      </div>

      <div>
        <Label className="text-xs">Tournament</Label>
        <Select value={tournamentId || undefined} onValueChange={setTournamentId}>
          <SelectTrigger className="w-full sm:w-[300px]"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {teamUrl && (
        <Card className="p-4 space-y-2">
          <Label className="text-xs">Team homepage link</Label>
          <div className="flex gap-2">
            <Input readOnly value={teamUrl} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(teamUrl); toast({ title: "Link copied" }); }}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button asChild variant="outline" size="icon">
              <a href={teamUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm font-semibold">Enable team homepage</Label>
            <p className="text-xs text-muted-foreground">Turn off to hide the page from players.</p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Intro note (optional)</Label>
          <Textarea
            rows={3}
            value={settings.intro_note}
            onChange={(e) => setSettings({ ...settings, intro_note: e.target.value })}
            placeholder="Check in at the clubhouse by 7:30 AM. Carts are assigned by hole."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-semibold">Custom info boxes</Label>
              <p className="text-xs text-muted-foreground">Add any extra info your players need — rules, parking, meals, raffle details.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSettings({
                  ...settings,
                  custom_boxes: [
                    ...settings.custom_boxes,
                    { id: Math.random().toString(36).slice(2), title: "", body: "", link_url: "", link_label: "", enabled: true },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add box
            </Button>
          </div>

          {settings.custom_boxes.map((box, i) => {
            const update = (patch: Partial<typeof box>) => {
              const next = [...settings.custom_boxes];
              next[i] = { ...box, ...patch };
              setSettings({ ...settings, custom_boxes: next });
            };
            const move = (dir: -1 | 1) => {
              const next = [...settings.custom_boxes];
              const j = i + dir;
              if (j < 0 || j >= next.length) return;
              [next[i], next[j]] = [next[j], next[i]];
              setSettings({ ...settings, custom_boxes: next });
            };
            return (
              <div key={box.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={box.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="Box title (e.g. Parking & Check-in)"
                    maxLength={80}
                  />
                  <Switch checked={box.enabled} onCheckedChange={(v) => update({ enabled: v })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(-1)} title="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(1)} title="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setSettings({ ...settings, custom_boxes: settings.custom_boxes.filter((b) => b.id !== box.id) })}
                    title="Remove box"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={box.body}
                  onChange={(e) => update({ body: e.target.value })}
                  placeholder="Details players should know…"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={box.link_url || ""}
                    onChange={(e) => update({ link_url: e.target.value })}
                    placeholder="Optional link (https://…)"
                  />
                  <Input
                    value={box.link_label || ""}
                    onChange={(e) => update({ link_label: e.target.value })}
                    placeholder="Link button label"
                    maxLength={40}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Sections</Label>
          {TEAM_HQ_SECTION_LABELS.map(({ key, label, help }) => (
            <div key={key} className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div>
                <p className="text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{help}</p>
              </div>
              <Switch
                checked={Boolean(settings[key])}
                onCheckedChange={(v) => setSettings({ ...settings, [key]: v })}
              />
            </div>
          ))}
        </div>


        <Button onClick={save} disabled={saving || !tournamentId}>
          {saving ? "Saving…" : "Save Team HQ Settings"}
        </Button>
      </Card>
    </div>
  );
}

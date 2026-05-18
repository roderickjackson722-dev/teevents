import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface T {
  id: string; title: string; slug: string;
  day_of_page_enabled: boolean;
  day_of_page_mode: string;
  day_of_welcome_message: string | null;
  day_of_announcements: string | null;
  day_of_course_map_url: string | null;
}

export default function DayOfSettings() {
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string }>>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [t, setT] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgs } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
      const orgIds = (orgs || []).map((o: any) => o.organization_id);
      const { data: ts } = await supabase.from("tournaments").select("id, title").in("organization_id", orgIds).order("date", { ascending: false });
      setTournaments((ts as any) || []);
      if (ts && ts.length) setTournamentId(ts[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, slug, day_of_page_enabled, day_of_page_mode, day_of_welcome_message, day_of_announcements, day_of_course_map_url")
        .eq("id", tournamentId)
        .maybeSingle();
      setT(data as any);
    })();
  }, [tournamentId]);

  const save = async () => {
    if (!t) return;
    setSaving(true);
    const { error } = await supabase.from("tournaments").update({
      day_of_page_enabled: t.day_of_page_enabled,
      day_of_page_mode: t.day_of_page_mode,
      day_of_welcome_message: t.day_of_welcome_message,
      day_of_announcements: t.day_of_announcements,
      day_of_course_map_url: t.day_of_course_map_url,
    } as any).eq("id", t.id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = t ? `${baseUrl}/day-of/${t.slug}/PREVIEW` : "";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Day-Of Page</h1>
        <p className="text-muted-foreground text-sm">A mobile-friendly page each player can open on tournament day showing their group, tee assignment, leaderboard, and announcements.</p>
      </div>

      <div>
        <Label className="text-xs">Tournament</Label>
        <Select value={tournamentId ?? undefined} onValueChange={setTournamentId}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {tournaments.map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {t && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={t.day_of_page_enabled} onCheckedChange={(v) => setT({ ...t, day_of_page_enabled: v })} />
            <Label>Enable day-of page</Label>
          </div>

          <div>
            <Label>Mode</Label>
            <Select value={t.day_of_page_mode} onValueChange={(v) => setT({ ...t, day_of_page_mode: v })}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preview">Preview (mock data)</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Use Preview for testing. Switch to Live on tournament day.</p>
          </div>

          <div>
            <Label>Welcome message</Label>
            <Textarea value={t.day_of_welcome_message || ""} onChange={(e) => setT({ ...t, day_of_welcome_message: e.target.value })} rows={2} />
          </div>

          <div>
            <Label>Announcements</Label>
            <Textarea value={t.day_of_announcements || ""} onChange={(e) => setT({ ...t, day_of_announcements: e.target.value })} rows={4} placeholder="Shotgun start at 9:00am. Beverage cart on every 4 holes." />
          </div>

          <div>
            <Label>Course map image URL (optional)</Label>
            <Input value={t.day_of_course_map_url || ""} onChange={(e) => setT({ ...t, day_of_course_map_url: e.target.value })} placeholder="https://..." />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            {t.day_of_page_enabled && (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="text-sm underline">Open preview</a>
            )}
          </div>

          <div className="border-t pt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Player access</p>
            <p>Players open their personalized day-of page via the QR code on their badge, or by visiting:</p>
            <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs">{baseUrl}/day-of/{t.slug}/[scoring-code]</code>
          </div>
        </Card>
      )}
    </div>
  );
}

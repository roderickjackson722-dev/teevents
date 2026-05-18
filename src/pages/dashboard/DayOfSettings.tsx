import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Upload, ExternalLink, MapPin } from "lucide-react";

interface T {
  id: string; title: string; slug: string; organization_id?: string;
  day_of_page_enabled: boolean;
  day_of_page_mode: string;
  day_of_welcome_message: string | null;
  day_of_announcements: string | null;
  day_of_course_map_url: string | null;
  pin_sheets_enabled?: boolean;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export default function DayOfSettings() {
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string; organization_id: string }>>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [t, setT] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgs } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
      const orgIds = (orgs || []).map((o: any) => o.organization_id);
      const { data: ts } = await supabase.from("tournaments").select("id, title, organization_id").in("organization_id", orgIds).order("date", { ascending: false });
      setTournaments((ts as any) || []);
      if (ts && ts.length) setTournamentId(ts[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, slug, organization_id, day_of_page_enabled, day_of_page_mode, day_of_welcome_message, day_of_announcements, day_of_course_map_url, pin_sheets_enabled")
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

  const uploadMap = async (file: File) => {
    if (!t?.organization_id || !t?.id) return;
    if (!ALLOWED.includes(file.type)) { toast({ title: "Use JPG, PNG, or WEBP", variant: "destructive" }); return; }
    if (file.size > MAX_BYTES) { toast({ title: "File too large (max 10MB)", variant: "destructive" }); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${t.organization_id}/${t.id}/course-map/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setT({ ...t, day_of_course_map_url: urlData.publicUrl });
    toast({ title: "Course map uploaded" });
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  // Organizer preview: bypass live gating via ?preview=1
  const previewUrl = t ? `${baseUrl}/day-of/${t.slug}/PREVIEW?preview=1` : "";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Day Of Event Page</h1>
        <p className="text-muted-foreground text-sm">A mobile-friendly page each player can open on event day showing their group, tee time, hole assignment, live leaderboard, announcements, and sponsors.</p>
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
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Switch checked={t.day_of_page_enabled} onCheckedChange={(v) => setT({ ...t, day_of_page_enabled: v })} />
            <Label>Enable day of event page</Label>
          </div>

          <div className="space-y-2">
            <Label>Mode</Label>
            <RadioGroup
              value={t.day_of_page_mode === "live" ? "live" : "preview"}
              onValueChange={(v) => setT({ ...t, day_of_page_mode: v })}
              className="space-y-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="live" id="mode-live" />
                <Label htmlFor="mode-live" className="font-normal cursor-pointer">Live mode (visible to players now)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="preview" id="mode-preview" />
                <Label htmlFor="mode-preview" className="font-normal cursor-pointer">Preview mode (only visible to organizer)</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">Stay in Preview while you build your page. Switch to Live when players should see it.</p>
          </div>

          <div>
            <Label>Welcome message</Label>
            <p className="text-xs text-muted-foreground mb-1">Greet your players. Bold, headings, colors, and links are supported.</p>
            <RichTextEditor
              value={t.day_of_welcome_message || ""}
              onChange={(html) => setT({ ...t, day_of_welcome_message: html })}
              placeholder="Welcome to the 2026 Charity Classic! Check in at the registration tent…"
            />
          </div>

          <div>
            <Label>Announcements</Label>
            <p className="text-xs text-muted-foreground mb-1">Schedule, shotgun start info, beverage cart times, weather updates, etc.</p>
            <RichTextEditor
              value={t.day_of_announcements || ""}
              onChange={(html) => setT({ ...t, day_of_announcements: html })}
              placeholder="9:00am shotgun start. Lunch served at the turn. Awards in the clubhouse at 3pm."
            />
          </div>

          <div className="space-y-2">
            <Label>Course map (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Upload an image of your course layout so players can see hole locations, the practice area, and parking from their phone. Most golf courses have a downloadable course map (often a JPG or PNG) on their website, or you can request one from the course pro shop.
            </p>
            {t.day_of_course_map_url && (
              <div className="border rounded overflow-hidden max-w-sm">
                <img src={t.day_of_course_map_url} alt="Course map preview" className="w-full" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMap(f); e.currentTarget.value = ""; }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading…" : "Upload course map"}
              </Button>
              {t.day_of_course_map_url && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setT({ ...t, day_of_course_map_url: null })}>Remove</Button>
              )}
            </div>
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">Or paste an image URL</summary>
              <Input className="mt-1" value={t.day_of_course_map_url || ""} onChange={(e) => setT({ ...t, day_of_course_map_url: e.target.value })} placeholder="https://..." />
            </details>
          </div>

          <Card className="p-4 bg-muted/40 border-dashed">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Add pin sheets</p>
                <p className="text-sm text-muted-foreground">Pin sheets show players today's pin placement on each green. They appear on the day-of page automatically once enabled.</p>
                <div className="mt-2 flex items-center gap-3">
                  <Link to="/dashboard/pin-sheets">
                    <Button size="sm" variant="outline">Open Pin Sheets</Button>
                  </Link>
                  {t.pin_sheets_enabled && <span className="text-xs text-green-700">Enabled</span>}
                </div>
              </div>
            </div>
          </Card>

          <div className="pt-2 flex items-center gap-3 border-t">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline"><ExternalLink className="w-4 h-4 mr-1" /> Preview</Button>
            </a>
          </div>

          <div className="border-t pt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Player access</p>
            <p>When a player checks in (QR scan), they are sent to their personalized day-of page. You can also share this link template:</p>
            <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs">{baseUrl}/day-of/{t.slug}/[scoring-code]</code>
          </div>
        </Card>
      )}
    </div>
  );
}

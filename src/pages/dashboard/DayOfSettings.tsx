import { useEffect, useRef, useState } from "react";
import StickySaveBar from "@/components/dashboard/StickySaveBar";
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
import { Textarea } from "@/components/ui/textarea";
import { Upload, ExternalLink, MapPin, Plus, X, RotateCcw } from "lucide-react";
import DayOfLivePreview from "@/components/dashboard/DayOfLivePreview";
import { ParticipantEmailSender } from "@/components/dashboard/ParticipantEmailSender";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";


export const DEFAULT_WELCOME_TITLE = "Welcome to [Tournament Name]!";
export const DEFAULT_WELCOME_MESSAGE = `Welcome, [Player Name]! You are officially checked in and ready to play. We're thrilled to have you here.

Please review your tee time and starting hole below. Use the buttons on this page to enter your scores, follow the live leaderboard, and view important announcements.

If you need anything, find a tournament staff member or use the contact information at the bottom of this page.

Best of luck today!`;

interface T {
  id: string; title: string; slug: string; organization_id?: string;
  day_of_page_enabled: boolean;
  day_of_page_mode: string;
  day_of_show_welcome: boolean;
  day_of_welcome_title: string | null;
  day_of_welcome_message: string | null;
  day_of_announcements: string | null;
  day_of_announcements_list: string[];
  day_of_course_map_url: string | null;
  day_of_sponsor_title: string | null;
  day_of_sponsor_thanks: string | null;
  day_of_sponsor_layout: string;
  day_of_pairings_url: string | null;
  day_of_rules_url: string | null;
  day_of_director_name: string | null;
  day_of_director_phone: string | null;
  day_of_director_email: string | null;
  day_of_emergency_contact: string | null;
  day_of_bg_color: string | null;
  day_of_accent_color: string | null;
  day_of_font_color: string | null;
  day_of_header_image_url: string | null;
  day_of_weather_enabled: boolean;
  day_of_weather_location: string | null;
  day_of_show_scores_card: boolean;
  day_of_show_leaderboard_card: boolean;
  day_of_show_coursemap_card: boolean;
  day_of_show_announcements_card: boolean;
  day_of_show_sponsors: boolean;
  day_of_show_pin_sheets: boolean;
  day_of_pin_sheet_pdf_url: string | null;
  day_of_show_leaderboard: boolean;
  day_of_placeholder_fallback: string | null;
  pin_sheets_enabled?: boolean;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAX_BYTES = 20 * 1024 * 1024;

const FIELDS = "id, title, slug, organization_id, day_of_page_enabled, day_of_page_mode, day_of_show_welcome, day_of_welcome_title, day_of_welcome_message, day_of_announcements, day_of_announcements_list, day_of_course_map_url, day_of_sponsor_title, day_of_sponsor_thanks, day_of_sponsor_layout, day_of_pairings_url, day_of_rules_url, day_of_director_name, day_of_director_phone, day_of_director_email, day_of_emergency_contact, day_of_bg_color, day_of_accent_color, day_of_font_color, day_of_header_image_url, day_of_weather_enabled, day_of_weather_location, day_of_show_scores_card, day_of_show_leaderboard_card, day_of_show_coursemap_card, day_of_show_announcements_card, day_of_show_sponsors, day_of_show_pin_sheets, day_of_pin_sheet_pdf_url, day_of_show_leaderboard, day_of_placeholder_fallback, pin_sheets_enabled";

export default function DayOfSettings() {
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string; organization_id: string }>>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [t, setT] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"map" | "header" | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const mapFileRef = useRef<HTMLInputElement | null>(null);
  const headerFileRef = useRef<HTMLInputElement | null>(null);
  const pinPdfFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgs } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
      const orgIds = (orgs || []).map((o: any) => o.organization_id);
      const { data: ts } = await supabase.from("tournaments").select("id, title, organization_id").in("organization_id", orgIds).order("date", { ascending: false });
      setTournaments((ts as any) || []);
      if (ts && ts.length) setTournamentId(pickTournamentId(ts as any));
    })();
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select(FIELDS)
        .eq("id", tournamentId)
        .maybeSingle();
      if (data) {
        const d: any = data;
        d.day_of_announcements_list = Array.isArray(d.day_of_announcements_list) ? d.day_of_announcements_list : [];
        if (d.day_of_show_welcome === null || d.day_of_show_welcome === undefined) d.day_of_show_welcome = true;
        if (!d.day_of_welcome_title) d.day_of_welcome_title = DEFAULT_WELCOME_TITLE;
        if (!d.day_of_welcome_message) d.day_of_welcome_message = DEFAULT_WELCOME_MESSAGE;
        setT(d as T);
      }
    })();
  }, [tournamentId]);

  const save = async () => {
    if (!t) return;
    setSaving(true);
    const { error } = await supabase.from("tournaments").update({
      day_of_page_enabled: t.day_of_page_enabled,
      day_of_page_mode: t.day_of_page_mode,
      day_of_show_welcome: t.day_of_show_welcome,
      day_of_welcome_title: t.day_of_welcome_title,
      day_of_welcome_message: t.day_of_welcome_message,
      day_of_announcements: t.day_of_announcements,
      day_of_announcements_list: t.day_of_announcements_list,
      day_of_course_map_url: t.day_of_course_map_url,
      day_of_sponsor_title: t.day_of_sponsor_title,
      day_of_sponsor_thanks: t.day_of_sponsor_thanks,
      day_of_sponsor_layout: t.day_of_sponsor_layout,
      day_of_pairings_url: t.day_of_pairings_url,
      day_of_rules_url: t.day_of_rules_url,
      day_of_director_name: t.day_of_director_name,
      day_of_director_phone: t.day_of_director_phone,
      day_of_director_email: t.day_of_director_email,
      day_of_emergency_contact: t.day_of_emergency_contact,
      day_of_bg_color: t.day_of_bg_color,
      day_of_accent_color: t.day_of_accent_color,
      day_of_font_color: t.day_of_font_color,
      day_of_header_image_url: t.day_of_header_image_url,
      day_of_weather_enabled: t.day_of_weather_enabled,
      day_of_weather_location: t.day_of_weather_location,
      day_of_show_scores_card: t.day_of_show_scores_card,
      day_of_show_leaderboard_card: t.day_of_show_leaderboard_card,
      day_of_show_coursemap_card: t.day_of_show_coursemap_card,
      day_of_show_announcements_card: t.day_of_show_announcements_card,
      day_of_show_sponsors: t.day_of_show_sponsors,
      day_of_show_pin_sheets: t.day_of_show_pin_sheets,
      day_of_pin_sheet_pdf_url: t.day_of_pin_sheet_pdf_url,
      day_of_show_leaderboard: t.day_of_show_leaderboard,
      day_of_placeholder_fallback: t.day_of_placeholder_fallback,
    } as any).eq("id", t.id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); setPreviewKey(k => k + 1); }
  };

  const uploadPinSheetPdf = async (file: File) => {
    if (!t?.organization_id || !t?.id) return;
    if (file.type !== "application/pdf") { toast({ title: "Please upload a PDF file", variant: "destructive" }); return; }
    if (file.size > PDF_MAX_BYTES) { toast({ title: "File too large (max 20MB)", variant: "destructive" }); return; }
    setUploadingPdf(true);
    const path = `${t.organization_id}/${t.id}/pin-sheets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: false, contentType: "application/pdf" });
    setUploadingPdf(false);
    if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setT({ ...t, day_of_pin_sheet_pdf_url: urlData.publicUrl });
    toast({ title: "Pin sheet uploaded" });
  };

  const uploadImage = async (file: File, kind: "map" | "header") => {
    if (!t?.organization_id || !t?.id) return;
    if (!ALLOWED.includes(file.type)) { toast({ title: "Use JPG, PNG, or WEBP", variant: "destructive" }); return; }
    if (file.size > MAX_BYTES) { toast({ title: "File too large (max 10MB)", variant: "destructive" }); return; }
    setUploading(kind);
    const ext = file.name.split(".").pop() || "jpg";
    const folder = kind === "map" ? "course-map" : "day-of-header";
    const path = `${t.organization_id}/${t.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(null);
    if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    if (kind === "map") setT({ ...t, day_of_course_map_url: urlData.publicUrl });
    else setT({ ...t, day_of_header_image_url: urlData.publicUrl });
    toast({ title: "Image uploaded" });
  };

  const addAnnouncement = () => {
    if (!t) return;
    setT({ ...t, day_of_announcements_list: [...t.day_of_announcements_list, ""] });
  };
  const updateAnnouncement = (i: number, v: string) => {
    if (!t) return;
    const list = [...t.day_of_announcements_list];
    list[i] = v;
    setT({ ...t, day_of_announcements_list: list });
  };
  const removeAnnouncement = (i: number) => {
    if (!t) return;
    const list = t.day_of_announcements_list.filter((_, idx) => idx !== i);
    setT({ ...t, day_of_announcements_list: list });
  };

  const resetDesign = () => {
    if (!t) return;
    if (!confirm("Reset design colors and header image to defaults?")) return;
    setT({ ...t, day_of_bg_color: null, day_of_accent_color: null, day_of_font_color: null, day_of_header_image_url: null });
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = t ? `${baseUrl}/day-of/${t.id}/demo?preview=1` : "";

  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderTestEmail, setReminderTestEmail] = useState("");

  const sendDayBeforeReminder = async (mode: "test" | "all") => {
    if (!t) return;
    if (mode === "test" && !reminderTestEmail.trim()) {
      toast({ title: "Enter a test email address", variant: "destructive" });
      return;
    }
    if (mode === "all" && !confirm("Send the Day Before Event Reminder to every PAID player with an email on file?")) return;
    setSendingReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-day-before-reminder", {
        body: mode === "test"
          ? { tournament_id: t.id, test_email: reminderTestEmail.trim() }
          : { tournament_id: t.id },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      toast({ title: mode === "test" ? "Test reminder sent" : `Reminder sent to ${sent} player${sent === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setSendingReminder(false);
    }
  };
  const sendDayOfLinks = async (mode: "test" | "all") => {
    if (!t) return;
    if (mode === "all" && !confirm("Send the Day-of Event Page link to every registered player with an email on file?")) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-day-of-links", {
        body: mode === "test" ? { tournament_id: t.id, test_email: testEmail } : { tournament_id: t.id },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      toast({ title: mode === "test" ? "Test email sent" : `Sent to ${sent} player${sent === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px]">
      <div>
        <h1 className="text-2xl font-bold">Day of Event Page</h1>
        <p className="text-muted-foreground text-sm">A mobile-friendly page each player can open on event day. The live preview on the right shows what players will see — save changes to refresh.</p>
      </div>

      <div>
        <Label className="text-xs">Tournament</Label>
        <Select value={tournamentId ?? undefined} onValueChange={setTournamentId}>
          <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {tournaments.map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-4 items-start">
        <div className="space-y-6 min-w-0">
      {t && (
        <Card className="p-4 sm:p-5 space-y-6">
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
          </div>

          {/* DESIGN & BRANDING */}
          <section className="space-y-3 border-t pt-5">
            <Label className="text-base">Design &amp; Branding</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ColorField label="Background color" value={t.day_of_bg_color} onChange={(v) => setT({ ...t, day_of_bg_color: v })} placeholder="#1a5c38" />
              <ColorField label="Accent color" value={t.day_of_accent_color} onChange={(v) => setT({ ...t, day_of_accent_color: v })} placeholder="#F5A623" />
              <ColorField label="Font color" value={t.day_of_font_color} onChange={(v) => setT({ ...t, day_of_font_color: v })} placeholder="#FFFFFF" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Header image (optional)</Label>
              {t.day_of_header_image_url && (
                <div className="border rounded overflow-hidden max-w-md">
                  <img src={t.day_of_header_image_url} alt="Header preview" className="w-full" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={headerFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "header"); e.currentTarget.value = ""; }}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => headerFileRef.current?.click()} disabled={uploading === "header"}>
                  <Upload className="w-4 h-4 mr-1" /> {uploading === "header" ? "Uploading…" : "Upload header image"}
                </Button>
                {t.day_of_header_image_url && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setT({ ...t, day_of_header_image_url: null })}>Remove</Button>
                )}
              </div>
              <details>
                <summary className="text-xs text-muted-foreground cursor-pointer">Or paste an image URL</summary>
                <Input className="mt-1" value={t.day_of_header_image_url || ""} onChange={(e) => setT({ ...t, day_of_header_image_url: e.target.value })} placeholder="https://..." />
              </details>
            </div>
          </section>


          {/* WELCOME MESSAGE */}
          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Label className="text-base">Welcome Message</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setT({ ...t, day_of_welcome_title: DEFAULT_WELCOME_TITLE, day_of_welcome_message: DEFAULT_WELCOME_MESSAGE })}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Reset to Default Template
              </Button>
            </div>
            <Toggle
              label="Show welcome message on day-of page"
              checked={t.day_of_show_welcome}
              onChange={(v) => setT({ ...t, day_of_show_welcome: v })}
            />
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={t.day_of_welcome_title || ""}
                onChange={(e) => setT({ ...t, day_of_welcome_title: e.target.value })}
                placeholder={DEFAULT_WELCOME_TITLE}
              />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={t.day_of_welcome_message || ""}
                onChange={(e) => setT({ ...t, day_of_welcome_message: e.target.value })}
                rows={10}
                placeholder={DEFAULT_WELCOME_MESSAGE}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available placeholders: <code>[Tournament Name]</code>, <code>[Player Name]</code>, <code>[Tee Time]</code>, <code>[Starting Hole]</code>. They are replaced automatically on each player's page.
              </p>
            </div>
            <div>
              <Label className="text-xs">Fallback text when tee time / hole isn't set</Label>
              <Input
                value={t.day_of_placeholder_fallback ?? "TBD"}
                onChange={(e) => setT({ ...t, day_of_placeholder_fallback: e.target.value })}
                placeholder="TBD"
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">Shown in place of <code>[Tee Time]</code> or <code>[Starting Hole]</code> when a player doesn't have one assigned yet.</p>
            </div>
            <WelcomePreview t={t} />
          </section>



          {/* QUICK ACTION CARDS */}
          <section className="space-y-2 border-t pt-5">
            <Label className="text-base">Quick Action Cards</Label>
            <p className="text-xs text-muted-foreground">Toggle which 2x2 cards appear at the top of the player page.</p>
            <Toggle label='Show "Enter Your Scores" card' checked={t.day_of_show_scores_card} onChange={(v) => setT({ ...t, day_of_show_scores_card: v })} />
            <Toggle label='Show "Live Leaderboard" card' checked={t.day_of_show_leaderboard_card} onChange={(v) => setT({ ...t, day_of_show_leaderboard_card: v })} />
            <Toggle label='Show "Course Map" card' checked={t.day_of_show_coursemap_card} onChange={(v) => setT({ ...t, day_of_show_coursemap_card: v })} />
            <Toggle label='Show "Announcements" card' checked={t.day_of_show_announcements_card} onChange={(v) => setT({ ...t, day_of_show_announcements_card: v })} />
          </section>

          {/* SPONSOR SPOTLIGHT */}
          <section className="space-y-3 border-t pt-5">
            <Label className="text-base">Sponsor Spotlight</Label>
            <Toggle label="Show sponsor spotlight section" checked={t.day_of_show_sponsors} onChange={(v) => setT({ ...t, day_of_show_sponsors: v })} />
            <div>
              <Label className="text-xs">Section title</Label>
              <Input value={t.day_of_sponsor_title || ""} onChange={(e) => setT({ ...t, day_of_sponsor_title: e.target.value })} placeholder="Our Generous Sponsors" />
            </div>
            <div>
              <Label className="text-xs">Thank-you message</Label>
              <Input value={t.day_of_sponsor_thanks || ""} onChange={(e) => setT({ ...t, day_of_sponsor_thanks: e.target.value })} placeholder="Thank you to our sponsors for making this event possible!" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Layout</Label>
              <RadioGroup
                value={t.day_of_sponsor_layout || "grid"}
                onValueChange={(v) => setT({ ...t, day_of_sponsor_layout: v })}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2"><RadioGroupItem value="grid" id="layout-grid" /><Label htmlFor="layout-grid" className="font-normal cursor-pointer">Grid</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="carousel" id="layout-carousel" /><Label htmlFor="layout-carousel" className="font-normal cursor-pointer">Carousel</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="list" id="layout-list" /><Label htmlFor="layout-list" className="font-normal cursor-pointer">List</Label></div>
              </RadioGroup>
            </div>
          </section>


          {/* ANNOUNCEMENTS */}
          <section className="space-y-2 border-t pt-5">
            <Label className="text-base">Announcements</Label>
            <p className="text-xs text-muted-foreground">Short bulletin-style updates shown to players (e.g. "Lunch served at 12 PM").</p>
            <div className="space-y-2">
              {t.day_of_announcements_list.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={a} onChange={(e) => updateAnnouncement(i, e.target.value)} placeholder="Lunch served at 12:00 PM in the clubhouse" />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeAnnouncement(i)} aria-label="Remove">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addAnnouncement}>
              <Plus className="w-4 h-4 mr-1" /> Add announcement
            </Button>
            <details className="pt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">Or use rich text (advanced)</summary>
              <div className="mt-2">
                <RichTextEditor
                  value={t.day_of_announcements || ""}
                  onChange={(html) => setT({ ...t, day_of_announcements: html })}
                  placeholder="9:00am shotgun start. Lunch served at the turn."
                />
              </div>
            </details>
          </section>

          {/* COURSE MAP */}
          <section className="space-y-2 border-t pt-5">
            <Label className="text-base">Course Map</Label>
            <p className="text-xs text-muted-foreground">Image of your course layout so players can see hole locations from their phone.</p>
            {t.day_of_course_map_url && (
              <div className="border rounded overflow-hidden max-w-sm">
                <img src={t.day_of_course_map_url} alt="Course map preview" className="w-full" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={mapFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "map"); e.currentTarget.value = ""; }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => mapFileRef.current?.click()} disabled={uploading === "map"}>
                <Upload className="w-4 h-4 mr-1" /> {uploading === "map" ? "Uploading…" : "Upload course map"}
              </Button>
              {t.day_of_course_map_url && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setT({ ...t, day_of_course_map_url: null })}>Remove</Button>
              )}
            </div>
          </section>

          {/* LEADERBOARD */}
          <section className="space-y-2 border-t pt-5">
            <Label className="text-base">Leaderboard</Label>
            <Toggle label="Show leaderboard section" checked={t.day_of_show_leaderboard} onChange={(v) => setT({ ...t, day_of_show_leaderboard: v })} />
            <p className="text-xs text-muted-foreground">Leaderboard pulls from <code>/live/{t.slug}</code> automatically.</p>
          </section>

          {/* CONTACT */}
          <section className="space-y-3 border-t pt-5">
            <Label className="text-base">Contact Information</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Director name</Label>
                <Input value={t.day_of_director_name || ""} onChange={(e) => setT({ ...t, day_of_director_name: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div>
                <Label className="text-xs">Director phone</Label>
                <Input value={t.day_of_director_phone || ""} onChange={(e) => setT({ ...t, day_of_director_phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Director email</Label>
                <Input type="email" value={t.day_of_director_email || ""} onChange={(e) => setT({ ...t, day_of_director_email: e.target.value })} placeholder="director@example.com" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Emergency contact</Label>
                <Input value={t.day_of_emergency_contact || ""} onChange={(e) => setT({ ...t, day_of_emergency_contact: e.target.value })} placeholder="Pro Shop: (555) 987-6543" />
              </div>
            </div>
          </section>


          <div className="pt-2 flex flex-wrap items-center gap-3 border-t">
            <Button onClick={save} disabled={saving} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">{saving ? "Saving…" : "Save Changes"}</Button>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline"><ExternalLink className="w-4 h-4 mr-1" /> Preview Page</Button>
            </a>
            <Button type="button" variant="ghost" onClick={resetDesign}>Reset Design</Button>
          </div>

          <div className="border-t pt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Player access</p>
            <p>When a player scans their QR code or opens their email link, they go directly to their personalized day-of page. Share link template:</p>
            <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs break-all">{baseUrl}/day-of/{t.slug}/[scoring-code]</code>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="font-medium text-foreground">Send Reminder Email</p>
              <p className="text-sm text-muted-foreground">
                Sends the “Day Before Event Reminder” to every paid player with their personal tee time, starting hole,
                scoring code and a link to the event homepage. Edit the wording under Messages → Email Templates.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                type="email"
                placeholder="you@example.com"
                value={reminderTestEmail}
                onChange={(e) => setReminderTestEmail(e.target.value)}
                className="sm:max-w-[240px]"
              />
              <Button type="button" variant="outline" disabled={sendingReminder} onClick={() => sendDayBeforeReminder("test")}>
                Send test
              </Button>
              <Button type="button" disabled={sendingReminder} onClick={() => sendDayBeforeReminder("all")}>
                Send to all paid players
              </Button>
              <a href="/dashboard/email-templates?template=day_before" className="text-sm text-primary underline self-center">
                Edit template
              </a>
            </div>
          </div>

          <ParticipantEmailSender tournamentId={t.id} tournamentTitle={t.title} />

        </Card>
      )}
        </div>

        {/* LIVE PREVIEW PANE */}
        <div className="lg:sticky lg:top-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-semibold">Live Preview</Label>
            {t && (
              <a href={`${baseUrl}/day-of/${t.id}/demo?preview=1`} target="_blank" rel="noreferrer">
                <Button type="button" size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" /> Open</Button>
              </a>
            )}
          </div>
          <div className="border-[8px] border-gray-800 rounded-[28px] overflow-hidden bg-gray-800 shadow-xl">
            {t ? (
              <DayOfLivePreview t={t as any} />
            ) : (
              <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground bg-white">Select a tournament to preview</div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Preview updates instantly as you edit — uses sample player data.</p>
        </div>
      <StickySaveBar onSave={() => {}} />
    </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="font-normal cursor-pointer" onClick={() => onChange(!checked)}>{label}</Label>
    </div>
  );
}

function ColorField({ label, value, onChange, placeholder }: { label: string; value: string | null; onChange: (v: string | null) => void; placeholder: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border cursor-pointer bg-transparent"
        />
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder}
          className="flex-1"
        />
      </div>
    </div>
  );
}

function WelcomePreview({ t }: { t: T }) {
  const [testPlayer, setTestPlayer] = useState({
    name: "Sample Player",
    tee_time: "8:30 AM",
    hole: 1,
  });
  const fallback = t.day_of_placeholder_fallback || "TBD";
  const fill = (s: string) => (s || "")
    .split("[Tournament Name]").join(t.title || "")
    .split("[Player Name]").join(testPlayer.name || "Player")
    .split("[Tee Time]").join(testPlayer.tee_time || fallback)
    .split("[Starting Hole]").join(testPlayer.hole != null ? `#${testPlayer.hole}` : fallback);
  const DEFAULT_TITLE = "Welcome to [Tournament Name]!";
  const title = fill((t.day_of_welcome_title && t.day_of_welcome_title.trim()) || DEFAULT_TITLE);
  const msg = fill((t.day_of_welcome_message && t.day_of_welcome_message.trim()) || "");
  return (
    <div className="border rounded-lg bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Live Preview</Label>
        <div className="text-[11px] text-muted-foreground">Test data — only you see this</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-[11px]">Player Name</Label>
          <Input value={testPlayer.name} onChange={(e) => setTestPlayer({ ...testPlayer, name: e.target.value })} className="h-8" />
        </div>
        <div>
          <Label className="text-[11px]">Tee Time (blank = fallback)</Label>
          <Input value={testPlayer.tee_time} onChange={(e) => setTestPlayer({ ...testPlayer, tee_time: e.target.value })} className="h-8" />
        </div>
        <div>
          <Label className="text-[11px]">Starting Hole (blank = fallback)</Label>
          <Input
            type="number"
            value={testPlayer.hole as any}
            onChange={(e) => setTestPlayer({ ...testPlayer, hole: e.target.value === "" ? (null as any) : Number(e.target.value) })}
            className="h-8"
          />
        </div>
      </div>
      <div className="bg-card border rounded-md p-4 shadow-sm">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg || <span className="italic text-muted-foreground">No message yet — click "Reset to Default Template" to load one.</span>}</div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ExternalLink, Sparkles, Trash2, Upload, Image as ImageIcon, Send, Copy, RotateCw, Save, Eye, Ban } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ImageCropperDialog, fileToDataUrl } from "@/components/ui/image-cropper-dialog";

interface DemoTournamentRow {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  course_name: string | null;
  slug: string | null;
  custom_slug: string | null;
  organization_id: string;
  site_hero_image_url: string | null;
  created_at: string;
  description?: string | null;
  registration_fee_cents?: number | null;
  max_players?: number | null;
  scoring_format?: string | null;
  demo_prospect_email?: string | null;
  demo_prospect_name?: string | null;
  demo_conversion_token?: string | null;
  demo_conversion_sent_at?: string | null;
  demo_conversion_token_expires_at?: string | null;
  demo_conversion_used_at?: string | null;
  demo_conversion_discount_type?: string | null;
  demo_conversion_discount_value?: number | null;
  demo_conversion_is_test?: boolean | null;
  demo_converted_at?: string | null;
  show_sponsorships?: boolean | null;
}

type DiscountType = "none" | "free_pro" | "percentage" | "fixed";

const SCORING_FORMATS = [
  { value: "stroke_play", label: "Stroke Play" },
  { value: "scramble", label: "Scramble" },
  { value: "best_ball", label: "Best Ball" },
  { value: "stableford", label: "Stableford" },
  { value: "modified_stableford", label: "Modified Stableford" },
  { value: "match_play", label: "Match Play" },
  { value: "shamble", label: "Shamble" },
  { value: "chapman", label: "Chapman" },
];

export default function DemoConverter() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demos, setDemos] = useState<DemoTournamentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus mode: work on a single demo tournament at a time
  const [focusId, setFocusId] = useState<string | null>(null);

  // Inline edit of a demo tournament's public details
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DemoTournamentRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    location: "",
    course_name: "",
    registration_fee_dollars: "",
    max_players: "",
    description: "",
    site_hero_image_url: "",
    show_sponsorships: true,
  });
  const [seedingSponsors, setSeedingSponsors] = useState(false);

  const [form, setForm] = useState({
    tournament_name: "",
    event_date: "",
    location: "",
    course_name: "",
    registration_fee_dollars: "150",
    scoring_format: "scramble",
  });
  const [creating, setCreating] = useState(false);

  // image state
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // Conversion modal
  const [convOpen, setConvOpen] = useState(false);
  const [convTarget, setConvTarget] = useState<DemoTournamentRow | null>(null);
  const [convForm, setConvForm] = useState({
    prospect_email: "",
    prospect_name: "",
    discount_type: "none" as DiscountType,
    discount_value: 0,
  });
  const [convSending, setConvSending] = useState(false);

  // Demo access (view-only prospect links)
  type AccessRow = {
    id: string;
    tournament_id: string | null;
    prospect_email: string | null;
    prospect_phone?: string | null;
    delivery_method?: string | null;
    prospect_name: string | null;
    access_token: string;
    expires_at: string;
    last_accessed_at: string | null;
    access_count: number;
    revoked_at: string | null;
    created_at: string;
  };
  const [accessRows, setAccessRows] = useState<AccessRow[]>([]);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessTarget, setAccessTarget] = useState<DemoTournamentRow | null>(null);
  const EMPTY_ACCESS_FORM = {
    prospect_email: "",
    prospect_phone: "",
    prospect_name: "",
    days: "7",
    send_email: true,
    send_sms: false,
  };
  const [accessForm, setAccessForm] = useState(EMPTY_ACCESS_FORM);
  const [granting, setGranting] = useState(false);


  // Welcome email settings
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeIncludeOffer, setWelcomeIncludeOffer] = useState(true);
  const [welcomeSetupFee, setWelcomeSetupFee] = useState("199");
  const [welcomeSubject, setWelcomeSubject] = useState("Welcome to TeeVents – Let's get your tournament started!");
  const [welcomeHtml, setWelcomeHtml] = useState("");
  const [savingWelcome, setSavingWelcome] = useState(false);

  // Conversion history
  type LogRow = {
    id: string; tournament_id: string | null; tournament_name: string | null;
    prospect_email: string | null; prospect_name: string | null;
    organization_id: string | null; converted_to_live: boolean;
    converted_at: string; is_test: boolean;
  };
  const [history, setHistory] = useState<LogRow[]>([]);

  const DEFAULT_WELCOME_HTML = `<p>Hi {{name}},</p>
<p>I'm Rod, the founder of TeeVents. I'm here to make sure you get the most out of the platform.</p>
<p>{{tournament_block}}</p>
<p>Here's where to start:</p>
<p style="text-align:center;margin:24px 0">
  <a href="{{dashboard_url}}" style="background:#F5A623;color:#1a5c38;font-weight:700;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block">Open Your Dashboard</a>
</p>
<p>If you need help with anything – setting up your event, adding players, or configuring payments – just reply to this email. I'm happy to help.</p>
{{setup_offer}}
<p style="margin-top:24px">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>`;

  async function loadWelcomeSettings() {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["welcome_email_enabled", "welcome_email_include_setup_offer", "welcome_setup_fee_dollars", "welcome_email_subject", "welcome_email_html"]);
    let foundHtml = false;
    for (const r of data || []) {
      if (r.key === "welcome_email_enabled") setWelcomeEnabled((r.value as any) !== false);
      if (r.key === "welcome_email_include_setup_offer") setWelcomeIncludeOffer((r.value as any) !== false);
      if (r.key === "welcome_setup_fee_dollars") setWelcomeSetupFee(String(r.value ?? 199));
      if (r.key === "welcome_email_subject" && r.value) setWelcomeSubject(String(r.value));
      if (r.key === "welcome_email_html" && r.value) { setWelcomeHtml(String(r.value)); foundHtml = true; }
    }
    if (!foundHtml) setWelcomeHtml(DEFAULT_WELCOME_HTML);
  }

  async function saveWelcomeSettings() {
    setSavingWelcome(true);
    const rows = [
      { key: "welcome_email_enabled", value: welcomeEnabled as any },
      { key: "welcome_email_include_setup_offer", value: welcomeIncludeOffer as any },
      { key: "welcome_setup_fee_dollars", value: (Number(welcomeSetupFee) || 199) as any },
      { key: "welcome_email_subject", value: welcomeSubject as any },
      { key: "welcome_email_html", value: welcomeHtml as any },
    ];
    for (const r of rows) {
      await supabase.from("platform_settings").upsert(r, { onConflict: "key" });
    }
    setSavingWelcome(false);
    toast({ title: "Welcome email settings saved" });
  }

  async function sendWelcomeTest() {
    const email = prompt("Send test welcome email to which address?");
    if (!email) return;
    const { error } = await supabase.functions.invoke("send-organizer-welcome", {
      body: { email, full_name: "Test Coach", plan: "Base", tournament_name: "Test Tournament" },
    });
    if (error) toast({ title: "Test send failed", description: error.message, variant: "destructive" });
    else toast({ title: "Test email sent", description: `Check ${email}` });
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("demo_conversion_log")
      .select("id, tournament_id, tournament_name, prospect_email, prospect_name, organization_id, converted_to_live, converted_at, is_test")
      .order("converted_at", { ascending: false })
      .limit(100);
    setHistory((data as LogRow[]) || []);
  }


  function openConvert(d: DemoTournamentRow) {
    setConvTarget(d);
    setConvForm({
      prospect_email: d.demo_prospect_email || "",
      prospect_name: d.demo_prospect_name || "",
      discount_type: (d.demo_conversion_discount_type as DiscountType) || "none",
      discount_value: d.demo_conversion_discount_value || 0,
    });
    setConvOpen(true);
  }

  function offerLine(type: DiscountType, value: number): string | null {
    switch (type) {
      case "free_pro": return "🔥 Special offer: Free Pro upgrade ($399 value — 100% off)";
      case "percentage": return value > 0 ? `🔥 Special offer: ${value}% off Pro` : null;
      case "fixed": return value > 0 ? `🔥 Special offer: $${value} off Pro` : null;
      default: return null;
    }
  }

  async function sendConversion(testMode: boolean) {
    if (!convTarget) return;
    if (!testMode && !convForm.prospect_email) {
      toast({ title: "Prospect email required", variant: "destructive" });
      return;
    }
    setConvSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConvSending(false);
      toast({ title: "Please sign in again", description: "Your admin session expired.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("prepare-demo-conversion", {
      body: {
        tournament_id: convTarget.id,
        prospect_email: convForm.prospect_email,
        prospect_name: convForm.prospect_name || null,
        app_base_url: window.location.origin,
        test_mode: testMode,
        discount: { type: convForm.discount_type, value: convForm.discount_value },
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setConvSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({
      title: testMode ? "Test email sent" : "Signup link sent",
      description: testMode ? `Sent to your admin email. Link valid 24h.` : `Sent to ${convForm.prospect_email}. Link valid 72h.`,
    });
    setConvOpen(false);
    await loadDemos();
  }

  // ---- Demo access (view-only prospect links) ----
  async function loadAccess() {
    const { data } = await supabase
      .from("demo_access")
      .select("id, tournament_id, prospect_email, prospect_phone, delivery_method, prospect_name, access_token, expires_at, last_accessed_at, access_count, revoked_at, created_at")
      .order("created_at", { ascending: false });
    setAccessRows((data as AccessRow[]) || []);
  }

  function accessLinkFor(a: AccessRow) {
    const id = a.prospect_email || a.prospect_phone || "";
    return `${window.location.origin}/sample/access/${a.access_token}?email=${encodeURIComponent(id)}`;
  }

  function openAccess(d: DemoTournamentRow) {
    setAccessTarget(d);
    setAccessForm({ ...EMPTY_ACCESS_FORM });
    setAccessOpen(true);
    loadAccess();
  }

  async function grantAccess() {
    if (!accessTarget) return;
    const email = accessForm.prospect_email.trim();
    const phone = accessForm.prospect_phone.trim();
    if (!email && !phone) {
      toast({ title: "Enter an email address or a mobile number", variant: "destructive" });
      return;
    }
    if (accessForm.send_sms && !phone) {
      toast({ title: "Mobile number required to text the link", variant: "destructive" });
      return;
    }
    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-access-grant", {
        body: {
          tournament_id: accessTarget.id,
          prospect_email: email || null,
          prospect_phone: phone || null,
          prospect_name: accessForm.prospect_name.trim() || null,
          days: Number(accessForm.days) || 7,
          send_email: accessForm.send_email && !!email,
          send_sms: accessForm.send_sms && !!phone,
          origin: window.location.origin,
        },
      });
      if (error || (data as any)?.error) {
        toast({ title: "Grant failed", description: error?.message || (data as any)?.error, variant: "destructive" });
        return;
      }
      const link = (data as any)?.link as string;
      if (link) await navigator.clipboard.writeText(link).catch(() => null);
      const sent = [
        (data as any)?.emailed ? "email" : null,
        (data as any)?.texted ? "text" : null,
      ].filter(Boolean).join(" and ");
      toast({
        title: "Access granted",
        description: sent ? `Sent by ${sent}; link also copied to your clipboard.` : "Link copied to clipboard.",
      });
      setAccessForm({ ...EMPTY_ACCESS_FORM });
      await loadAccess();
    } finally {
      setGranting(false);
    }
  }

  async function revokeAccess(a: AccessRow) {
    if (!confirm(`Revoke demo access for ${a.prospect_email || a.prospect_phone}?`)) return;
    const { error } = await supabase
      .from("demo_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) {
      toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Access revoked" });
    await loadAccess();
  }

  async function resendAccess(a: AccessRow) {
    const demo = demos.find((d) => d.id === a.tournament_id);
    if (!demo) return;
    setAccessForm({
      ...EMPTY_ACCESS_FORM,
      prospect_email: a.prospect_email || "",
      prospect_phone: a.prospect_phone || "",
      prospect_name: a.prospect_name || "",
      send_email: !!a.prospect_email,
      send_sms: !a.prospect_email && !!a.prospect_phone,
    });
    setAccessTarget(demo);
    toast({ title: "Ready to resend", description: "Confirm the duration, then click Grant Access to issue a fresh link." });
  }

  function copyLink(d: DemoTournamentRow) {

    if (!d.demo_conversion_token) return;
    const url = `${window.location.origin}/claim-demo/${d.demo_conversion_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  }

  function statusOf(d: DemoTournamentRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (d.demo_converted_at) return { label: "✅ Claimed", variant: "default" };
    if (!d.demo_conversion_token) return { label: "—", variant: "outline" };
    if (d.demo_conversion_token_expires_at && new Date(d.demo_conversion_token_expires_at) < new Date()) {
      return { label: "⏰ Expired", variant: "destructive" };
    }
    if (d.demo_conversion_is_test) return { label: "🔬 Test sent", variant: "secondary" };
    return { label: "⏳ Pending", variant: "secondary" };
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      setAuthChecked(true);
      if (data) { loadDemos(); loadWelcomeSettings(); loadHistory(); }
    })();
  }, [navigate]);

  async function loadDemos() {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("id, title, date, location, course_name, slug, custom_slug, organization_id, site_hero_image_url, created_at, description, registration_fee_cents, max_players, scoring_format, demo_prospect_email, demo_prospect_name, demo_conversion_token, demo_conversion_sent_at, demo_conversion_token_expires_at, demo_conversion_used_at, demo_conversion_discount_type, demo_conversion_discount_value, demo_conversion_is_test, demo_converted_at, show_sponsorships")
      .eq("is_demo", true)
      .order("created_at", { ascending: false });
    setDemos((data as DemoTournamentRow[]) || []);
    setLoading(false);
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    const src = await fileToDataUrl(f);
    setRawImageSrc(src);
    setCropOpen(true);
  }

  async function handleCropped(file: File) {
    setCroppedFile(file);
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    setCroppedFile(null);
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(null);
    setRawImageSrc(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadHeroImage(): Promise<string | null> {
    if (!croppedFile) return null;
    const ts = Date.now();
    const safe = croppedFile.name.replace(/[^a-z0-9.]/gi, "_");
    const path = `demo-hero/${ts}_${safe}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, croppedFile, {
      contentType: croppedFile.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    return data.publicUrl;
  }

  async function createDemo() {
    if (!form.tournament_name.trim()) {
      toast({ title: "Tournament name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      let hero_image_url: string | null = null;
      try {
        hero_image_url = await uploadHeroImage();
      } catch (upErr: any) {
        toast({ title: "Image upload failed", description: upErr.message, variant: "destructive" });
        setCreating(false);
        return;
      }
      const fee_cents = Math.round(parseFloat(form.registration_fee_dollars || "0") * 100);
      const { data, error } = await supabase.functions.invoke("create-demo-real-tournament", {
        body: {
          tournament_name: form.tournament_name,
          event_date: form.event_date || null,
          location: form.location,
          course_name: form.course_name,
          registration_fee_cents: fee_cents,
          scoring_format: form.scoring_format,
          hero_image_url,
        },
      });
      if (error || (data as any)?.error) {
        toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
        return;
      }
      toast({ title: "Demo tournament created", description: "12 mock players added. Open the dashboard to start your walkthrough." });
      setForm({ ...form, tournament_name: "", event_date: "", location: "", course_name: "" });
      clearImage();
      await loadDemos();
    } finally {
      setCreating(false);
    }
  }

  async function deleteDemo(id: string) {
    if (!confirm("Delete this demo tournament and all its mock data?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id).eq("is_demo", true);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await loadDemos();
  }

  // Public links always resolve by tournament id so the exact selected demo opens,
  // even when several demos live in the same sandbox organization.
  function publicPath(d: DemoTournamentRow) {
    return `/tournament/${d.id}`;
  }
  function livePath(d: DemoTournamentRow) {
    return `/live/${d.id}`;
  }

  function openEdit(d: DemoTournamentRow) {
    setEditTarget(d);
    setEditForm({
      title: d.title || "",
      date: d.date || "",
      location: d.location || "",
      course_name: d.course_name || "",
      registration_fee_dollars: d.registration_fee_cents != null ? (d.registration_fee_cents / 100).toFixed(2) : "",
      max_players: d.max_players != null ? String(d.max_players) : "",
      description: d.description || "",
      site_hero_image_url: d.site_hero_image_url || "",
      show_sponsorships: d.show_sponsorships ?? true,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editForm.title.trim()) {
      toast({ title: "Tournament name required", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const feeStr = editForm.registration_fee_dollars.trim();
      const payload: Record<string, any> = {
        title: editForm.title.trim(),
        date: editForm.date || null,
        location: editForm.location || null,
        course_name: editForm.course_name || null,
        description: editForm.description || null,
        site_hero_image_url: editForm.site_hero_image_url || null,
        show_sponsorships: editForm.show_sponsorships,
      };
      if (feeStr) payload.registration_fee_cents = Math.round(parseFloat(feeStr) * 100);
      if (editForm.max_players.trim()) payload.max_players = parseInt(editForm.max_players, 10);

      const { error } = await supabase
        .from("tournaments")
        .update(payload as never)
        .eq("id", editTarget.id)
        .eq("is_demo", true);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Demo updated", description: "Changes now show on the demo dashboard and public page." });
      setEditOpen(false);
      setFocusId(editTarget.id);
      await loadDemos();
    } finally {
      setSavingEdit(false);
    }
  }

  const DEMO_TIERS = [
    { name: "Title Sponsor", price_cents: 500000, total_spots: 1, benefits: "Event naming rights • Logo on all signage • 2 foursomes • Podium recognition" },
    { name: "Gold Sponsor", price_cents: 250000, total_spots: 3, benefits: "Logo on leaderboard • 1 foursome • Social media feature" },
    { name: "Silver Sponsor", price_cents: 100000, total_spots: 6, benefits: "Logo on event page • Tee sign • Program listing" },
    { name: "Hole Sponsor", price_cents: 25000, total_spots: 18, benefits: "Branded sign on your sponsored hole" },
  ];
  const DEMO_SPONSORS = [
    { name: "Fairway Financial Group", tier: "Title Sponsor", amount: 5000 },
    { name: "Birdie Auto Group", tier: "Gold Sponsor", amount: 2500 },
    { name: "Clubhouse Coffee Co.", tier: "Silver Sponsor", amount: 1000 },
    { name: "Green Ridge Landscaping", tier: "Hole Sponsor", amount: 250 },
  ];

  async function seedSponsorshipContent() {
    if (!editTarget) return;
    setSeedingSponsors(true);
    try {
      const tid = editTarget.id;
      const { data: existingTiers } = await supabase
        .from("sponsorship_tiers")
        .select("name")
        .eq("tournament_id", tid);
      const haveTiers = new Set(((existingTiers as any[]) || []).map((t) => t.name));
      const newTiers = DEMO_TIERS.filter((t) => !haveTiers.has(t.name)).map((t, i) => ({
        tournament_id: tid,
        name: t.name,
        price_cents: t.price_cents,
        total_spots: t.total_spots,
        benefits: t.benefits,
        is_active: true,
        published_to_public: true,
        display_order: i + 1,
      }));
      if (newTiers.length) {
        const { error } = await supabase.from("sponsorship_tiers").insert(newTiers as never);
        if (error) throw error;
      }

      const { data: existingSponsors } = await supabase
        .from("tournament_sponsors")
        .select("name")
        .eq("tournament_id", tid);
      const haveSponsors = new Set(((existingSponsors as any[]) || []).map((s) => s.name));
      const newSponsors = DEMO_SPONSORS.filter((s) => !haveSponsors.has(s.name)).map((s, i) => ({
        tournament_id: tid,
        name: s.name,
        tier: s.tier,
        amount: s.amount,
        is_paid: true,
        show_on_leaderboard: true,
        show_on_scoring_page: true,
        display_order: i + 1,
      }));
      if (newSponsors.length) {
        const { error } = await supabase.from("tournament_sponsors").insert(newSponsors as never);
        if (error) throw error;
      }

      await supabase
        .from("tournaments")
        .update({ show_sponsorships: true } as never)
        .eq("id", tid)
        .eq("is_demo", true);
      setEditForm((f) => ({ ...f, show_sponsorships: true }));
      toast({
        title: "Sponsorship content added",
        description: `${newTiers.length} package(s) and ${newSponsors.length} sponsor(s) added to this demo.`,
      });
      await loadDemos();
    } catch (e: any) {
      toast({ title: "Could not add sponsorship content", description: e.message, variant: "destructive" });
    } finally {
      setSeedingSponsors(false);
    }
  }



  if (!authChecked) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
          <h1 className="text-xl font-semibold">Demo Converter</h1>
          <Badge variant="secondary" className="ml-2">Real tournaments for screen-share demos</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Demo Tournament</CardTitle>
            <CardDescription>
              Creates a fully functional, real tournament under your <strong>Demo Sandbox</strong> organization with 12 mock players pre-loaded. Every dashboard tab works exactly like a live tournament.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tournament Name</Label>
                <Input value={form.tournament_name} onChange={(e) => setForm({ ...form, tournament_name: e.target.value })} placeholder="Spring Charity Classic" />
              </div>
              <div>
                <Label>Event Date</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Pebble Beach, CA" />
              </div>
              <div>
                <Label>Course</Label>
                <Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="Pebble Beach Golf Links" />
              </div>
              <div>
                <Label>Registration Fee ($)</Label>
                <Input type="number" value={form.registration_fee_dollars} onChange={(e) => setForm({ ...form, registration_fee_dollars: e.target.value })} />
              </div>
              <div>
                <Label>Scoring Format</Label>
                <Select value={form.scoring_format} onValueChange={(v) => setForm({ ...form, scoring_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCORING_FORMATS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <Label>Hero Image (optional)</Label>
              <div className="text-xs text-muted-foreground">JPG, PNG, or WebP. Max 5MB. Recommended 16:9 (1920×1080).</div>
              <div className="flex flex-wrap items-start gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileChosen}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Choose File
                </Button>
                {croppedPreviewUrl ? (
                  <div className="relative">
                    <img src={croppedPreviewUrl} alt="Hero preview" className="w-64 h-36 object-cover rounded border border-border" />
                    <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80" onClick={clearImage}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-64 h-36 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                    <ImageIcon className="h-4 w-4 mr-1" /> No image
                  </div>
                )}
                {rawImageSrc && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCropOpen(true)}>
                    Re-crop
                  </Button>
                )}
              </div>
            </div>

            <Button onClick={createDemo} disabled={creating} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
              <Sparkles className="h-4 w-4 mr-2" />
              {creating ? "Creating…" : "Create Demo Tournament"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Demo Tournaments</CardTitle>
            <CardDescription>
              Select a tournament to focus on it, then use <strong>Edit Details</strong> to update what the prospect sees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {focusId && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 p-3">
                <Badge variant="secondary">Focused</Badge>
                <span className="text-sm font-medium">
                  {demos.find((d) => d.id === focusId)?.title || "Selected tournament"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Only this tournament's links and conversion records are shown.
                </span>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setFocusId(null)}>
                  Show all demos
                </Button>
              </div>
            )}
            {loading ? (
              <div>Loading…</div>
            ) : demos.length === 0 ? (
              <div className="text-sm text-muted-foreground">No demo tournaments yet. Create one above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Links</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(focusId ? demos.filter((d) => d.id === focusId) : demos).map((d) => (
                    <TableRow key={d.id} className={focusId === d.id ? "bg-secondary/5" : undefined}>
                      <TableCell>
                        {d.site_hero_image_url ? (
                          <img src={d.site_hero_image_url} alt="" className="w-16 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-10 rounded bg-muted" />
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setFocusId(focusId === d.id ? null : d.id)}
                        >
                          <div className="font-medium hover:underline">{d.title}</div>
                          <div className="text-xs text-muted-foreground">{d.course_name || d.location || ""}</div>
                        </button>
                      </TableCell>
                      <TableCell>{d.date || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setFocusId(d.id); openEdit(d); }}>
                            <Save className="h-3 w-3 mr-1" /> Edit Details
                          </Button>
                          <Button size="sm" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold" asChild>
                            <a href={`/dashboard?admin_org=${d.organization_id}&tournament_id=${d.id}`} target="_blank" rel="noreferrer">
                              Open Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/demo-converter/${d.id}`)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Prepare Demo
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openAccess(d)}>
                            <Eye className="h-3 w-3 mr-1" /> Manage Access
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#1a5c38] text-white hover:bg-[#1a5c38]/90"
                            disabled={!!d.demo_converted_at}
                            onClick={() => openConvert(d)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {d.demo_converted_at ? "Claimed" : d.demo_conversion_token ? "Resend Link" : "Convert to Live"}
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={publicPath(d)} target="_blank" rel="noreferrer">Public Site</a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={livePath(d)} target="_blank" rel="noreferrer">Live Leaderboard</a>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteDemo(d.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sent Conversions</CardTitle>
            <CardDescription>72-hour signup links sent to prospects. Test links last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const sent = demos
                .filter((d) => (focusId ? d.id === focusId : true))
                .filter((d) => d.demo_conversion_token || d.demo_converted_at);
              if (sent.length === 0) return <div className="text-sm text-muted-foreground">No conversion links sent yet.</div>;
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Prospect</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sent.map((d) => {
                      const s = statusOf(d);
                      const offer = offerLine((d.demo_conversion_discount_type as DiscountType) || "none", d.demo_conversion_discount_value || 0);
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.title}</TableCell>
                          <TableCell className="text-sm">{d.demo_prospect_email || "—"}</TableCell>
                          <TableCell className="text-xs">{offer ? offer.replace("🔥 Special offer: ", "") : "Standard pricing"}</TableCell>
                          <TableCell className="text-xs">{d.demo_conversion_sent_at ? new Date(d.demo_conversion_sent_at).toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-xs">{d.demo_conversion_token_expires_at ? new Date(d.demo_conversion_token_expires_at).toLocaleString() : "—"}</TableCell>
                          <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {d.demo_conversion_token && !d.demo_converted_at && (
                                <Button size="sm" variant="outline" onClick={() => copyLink(d)}><Copy className="h-3 w-3" /></Button>
                              )}
                              {!d.demo_converted_at && (
                                <Button size="sm" variant="outline" onClick={() => openConvert(d)}>
                                  <RotateCw className="h-3 w-3 mr-1" /> Resend
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion History</CardTitle>
            <CardDescription>Every demo that was converted (or test-converted) to a live tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No conversions yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Converted</TableHead>
                    <TableHead>Live Link</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.tournament_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div>{h.prospect_email || "—"}</div>
                        {h.prospect_name && <div className="text-xs text-muted-foreground">{h.prospect_name}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{new Date(h.converted_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {h.tournament_id ? (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/dashboard?admin_org=${h.organization_id || ""}`} target="_blank" rel="noreferrer">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {h.is_test ? (
                          <Badge variant="secondary">🔬 Test</Badge>
                        ) : h.converted_to_live ? (
                          <Badge>✅ Active</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Email Settings</CardTitle>
            <CardDescription>Controls the welcome email sent to new organizers on signup or after a demo claim.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Send welcome email to new organizers</div>
                <div className="text-xs text-muted-foreground">Triggered on both free and paid signups, and after demo conversion.</div>
              </div>
              <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Include optional setup service in welcome email</div>
                <div className="text-xs text-muted-foreground">Adds a white-glove setup offer with the price below.</div>
              </div>
              <Switch checked={welcomeIncludeOffer} onCheckedChange={setWelcomeIncludeOffer} />
            </div>
            <div className="max-w-xs">
              <Label>Setup Service Price ($)</Label>
              <Input
                type="number" min={0}
                value={welcomeSetupFee}
                onChange={(e) => setWelcomeSetupFee(e.target.value)}
                disabled={!welcomeIncludeOffer}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div>
                <Label>Email Subject</Label>
                <Input value={welcomeSubject} onChange={(e) => setWelcomeSubject(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Email Body (HTML)</Label>
                  <span className="text-xs text-muted-foreground">
                    Tokens: <code>{"{{name}}"}</code> <code>{"{{tournament_name}}"}</code> <code>{"{{tournament_block}}"}</code> <code>{"{{dashboard_url}}"}</code> <code>{"{{plan}}"}</code> <code>{"{{setup_offer}}"}</code>
                  </span>
                </div>
                <textarea
                  className="w-full min-h-[260px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={welcomeHtml}
                  onChange={(e) => setWelcomeHtml(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Live Preview</Label>
                <div
                  className="prose prose-sm max-w-none border rounded-md p-4 bg-white text-black"
                  dangerouslySetInnerHTML={{
                    __html: welcomeHtml
                      .replace(/\{\{name\}\}/g, "Coach Smith")
                      .replace(/\{\{plan\}\}/g, "Base")
                      .replace(/\{\{tournament_name\}\}/g, "Spring Charity Classic")
                      .replace(/\{\{tournament_block\}\}/g, 'Your tournament <strong>Spring Charity Classic</strong> is ready to go.')
                      .replace(/\{\{dashboard_url\}\}/g, "https://www.teevents.golf/dashboard")
                      .replace(/\{\{setup_offer\}\}/g, welcomeIncludeOffer
                        ? `<hr/><h3 style="color:#1a5c38">🔥 Want me to build your tournament for you?</h3><p>One-time white-glove setup: <strong>$${Number(welcomeSetupFee) || 199}</strong></p>`
                        : ""),
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={saveWelcomeSettings} disabled={savingWelcome} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
                <Save className="h-4 w-4 mr-1" /> {savingWelcome ? "Saving…" : "Save Settings"}
              </Button>
              <Button variant="outline" onClick={sendWelcomeTest}>
                <Send className="h-4 w-4 mr-1" /> Send Test Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demo Access — {accessTarget?.title}</DialogTitle>
            <DialogDescription>
              Grant a prospect view-only access to this dashboard. No password needed — they enter
              their email to get in, and nothing they do is saved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border rounded-md p-4 space-y-3">
              <div className="font-semibold">Grant Access</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Prospect Email</Label>
                  <Input
                    type="email"
                    value={accessForm.prospect_email}
                    onChange={(e) => setAccessForm({ ...accessForm, prospect_email: e.target.value })}
                    placeholder="prospect@example.com"
                  />
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input
                    type="tel"
                    value={accessForm.prospect_phone}
                    onChange={(e) => setAccessForm({ ...accessForm, prospect_phone: e.target.value })}
                    placeholder="(555) 555-1234"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Prospect Name</Label>
                  <Input
                    value={accessForm.prospect_name}
                    onChange={(e) => setAccessForm({ ...accessForm, prospect_name: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Email, mobile number, or both. Whichever you provide is what the prospect enters to open the sample.
              </p>
              <div className="max-w-xs">
                <Label>Access Duration</Label>
                <Select
                  value={accessForm.days}
                  onValueChange={(v) => setAccessForm({ ...accessForm, days: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <div className="text-sm font-medium">Email the access link to the prospect</div>
                  <div className="text-xs text-muted-foreground">
                    The link is always copied to your clipboard so you can send it yourself.
                  </div>
                </div>
                <Switch
                  checked={accessForm.send_email}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, send_email: v })}
                />
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <div className="text-sm font-medium">Text the access link to the prospect</div>
                  <div className="text-xs text-muted-foreground">
                    Sends an SMS to the mobile number above.
                  </div>
                </div>
                <Switch
                  checked={accessForm.send_sms}
                  onCheckedChange={(v) => setAccessForm({ ...accessForm, send_sms: v })}
                />
              </div>
              <Button
                onClick={grantAccess}
                disabled={granting}
                className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
              >
                {granting ? "Granting…" : "Grant Access"}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="font-semibold">Active Access</div>
              {(() => {
                const rows = accessRows.filter((a) => a.tournament_id === accessTarget?.id);
                if (rows.length === 0) {
                  return <div className="text-sm text-muted-foreground">No access granted yet.</div>;
                }
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((a) => {
                        const expired = new Date(a.expires_at) < new Date();
                        return (
                          <TableRow key={a.id}>
                            <TableCell>{a.prospect_name || "—"}</TableCell>
                            <TableCell className="text-sm">{a.prospect_email || "—"}</TableCell>
                            <TableCell className="text-sm">{a.prospect_phone || "—"}</TableCell>
                            <TableCell className="text-xs">
                              {new Date(a.expires_at).toLocaleDateString()}
                              {a.revoked_at ? (
                                <Badge variant="destructive" className="ml-2">Revoked</Badge>
                              ) : expired ? (
                                <Badge variant="secondary" className="ml-2">Expired</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {a.access_count}
                              {a.last_accessed_at && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(a.last_accessed_at).toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(accessLinkFor(a));
                                    toast({ title: "Link copied" });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                {!a.revoked_at && (
                                  <Button size="sm" variant="outline" onClick={() => revokeAccess(a)}>
                                    <Ban className="h-3 w-3 mr-1" /> Revoke
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => resendAccess(a)}>
                                  <RotateCw className="h-3 w-3 mr-1" /> Resend
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={convOpen} onOpenChange={setConvOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convert to Live Tournament — 72-Hour Offer</DialogTitle>
            <DialogDescription>{convTarget?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Prospect Email</Label>
                <Input
                  type="email"
                  value={convForm.prospect_email}
                  onChange={(e) => setConvForm({ ...convForm, prospect_email: e.target.value })}
                  placeholder="prospect@example.com"
                />
              </div>
              <div>
                <Label>Prospect Name</Label>
                <Input
                  value={convForm.prospect_name}
                  onChange={(e) => setConvForm({ ...convForm, prospect_name: e.target.value })}
                />
              </div>
            </div>

            <div className="border rounded-md p-3 space-y-3">
              <Label className="font-semibold">Offer Type</Label>
              <RadioGroup
                value={convForm.discount_type}
                onValueChange={(v) => setConvForm({ ...convForm, discount_type: v as DiscountType })}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="none" id="d-none" />
                  <span>No discount — standard pricing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="free_pro" id="d-free" />
                  <span>Free Pro upgrade ($399 value — 100% off)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="percentage" id="d-pct" />
                  <span>Percentage discount:</span>
                  <Input
                    type="number" min={1} max={100}
                    className="w-20 h-8"
                    value={convForm.discount_type === "percentage" ? convForm.discount_value || "" : ""}
                    onChange={(e) => setConvForm({ ...convForm, discount_type: "percentage", discount_value: Number(e.target.value) || 0 })}
                  />
                  <span>% off</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="fixed" id="d-fix" />
                  <span>Fixed discount: $</span>
                  <Input
                    type="number" min={1}
                    className="w-24 h-8"
                    value={convForm.discount_type === "fixed" ? convForm.discount_value || "" : ""}
                    onChange={(e) => setConvForm({ ...convForm, discount_type: "fixed", discount_value: Number(e.target.value) || 0 })}
                  />
                  <span>off</span>
                </label>
              </RadioGroup>
            </div>

            <div className="border rounded-md p-3 bg-muted/30 text-sm space-y-2">
              <div className="font-semibold">📧 Email Preview</div>
              <div className="text-xs text-muted-foreground">
                Subject: Claim your tournament – {convTarget?.title}
              </div>
              <div className="border-t pt-2 space-y-1">
                <div>Hi {convForm.prospect_name || "[Name]"},</div>
                <div>Your tournament <strong>{convTarget?.title}</strong> is ready to be claimed.</div>
                <div>👉 [Signup Link] — valid for 72 hours</div>
                {offerLine(convForm.discount_type, convForm.discount_value) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 px-2 py-1">
                    <strong>{offerLine(convForm.discount_type, convForm.discount_value)}</strong>
                  </div>
                )}
                <div>— Rod Jackson, TeeVents Golf</div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => sendConversion(true)} disabled={convSending}>
              🔬 Send Test (to myself, 24h)
            </Button>
            <Button
              className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
              onClick={() => sendConversion(false)}
              disabled={convSending}
            >
              <Send className="h-4 w-4 mr-1" />
              {convSending ? "Sending…" : "Send Signup Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit demo details */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Demo Details</DialogTitle>
            <DialogDescription>
              {editTarget?.title} — these values appear on the demo dashboard and the public tournament page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Tournament Name</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Course Name</Label>
              <Input value={editForm.course_name} onChange={(e) => setEditForm({ ...editForm, course_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Location</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <div>
              <Label>Entry Fee ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={editForm.registration_fee_dollars}
                onChange={(e) => setEditForm({ ...editForm, registration_fee_dollars: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Players</Label>
              <Input
                type="number"
                min="0"
                value={editForm.max_players}
                onChange={(e) => setEditForm({ ...editForm, max_players: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Hero Image URL</Label>
              <Input
                placeholder="https://…"
                value={editForm.site_hero_image_url}
                onChange={(e) => setEditForm({ ...editForm, site_hero_image_url: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background p-2 text-sm"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Show sponsorship section on the public page</div>
                  <div className="text-xs text-muted-foreground">
                    Lets prospects see how sponsorship packages are promoted on an event page.
                  </div>
                </div>
                <Switch
                  checked={editForm.show_sponsorships}
                  onCheckedChange={(v) => setEditForm({ ...editForm, show_sponsorships: v })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={seedingSponsors}
                onClick={seedSponsorshipContent}
              >
                {seedingSponsors ? "Adding…" : "Add sample sponsorship packages & sponsors"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Adds Title, Gold, Silver and Hole packages plus a few example sponsor logos so the
                sponsorship tab is populated in the demo.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editTarget && (
              <Button variant="outline" asChild>
                <a href={publicPath(editTarget)} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" /> View Public Page
                </a>
              </Button>
            )}
            <Button onClick={saveEdit} disabled={savingEdit} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
              <Save className="h-4 w-4 mr-1" /> {savingEdit ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <ImageCropperDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={rawImageSrc}
        defaultAspect="16:9"
        outputMime="image/jpeg"
        title="Crop Hero Image (16:9 recommended)"
        onCropped={handleCropped}
      />
    </div>
  );
}

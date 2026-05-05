import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, Sparkles, Image as ImageIcon, Eye, Camera, Download, Copy, Trash2, ExternalLink, Wand2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import html2canvas from "html2canvas";
import JSZip from "jszip";

// Sales-demo "host" organization (existing in DB)
const SALES_DEMO_ORG_ID = "80cc5e41-9305-4106-b535-269b1d449ac5";

const SAMPLE_FIRST_NAMES = ["John","Mike","David","James","Robert","Chris","Mark","Steve","Paul","Tom","Sarah","Jennifer","Lisa","Karen","Amy"];
const SAMPLE_LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Anderson","Wilson","Taylor","Moore","Jackson"];
const SHIRT_SIZES = ["M","L","XL","XXL"];

interface ParsedFlyer {
  tournament_name: string | null;
  date: string | null;
  course_name: string | null;
  location: string | null;
  fee_cents: number | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  raw_text?: string;
}

const FlyerToDemo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [demoSlug, setDemoSlug] = useState<string | null>(null);
  const [demoTournamentId, setDemoTournamentId] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [courseName, setCourseName] = useState("");
  const [location, setLocation] = useState("");
  const [feeDollars, setFeeDollars] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const heroImageRef = useRef<HTMLInputElement>(null);

  const previewRef = useRef<HTMLIFrameElement>(null);
  const dashboardRef = useRef<HTMLIFrameElement>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload a JPG or PNG image.", variant: "destructive" });
      return;
    }
    setHeroImageFile(f);
    setHeroImagePreview(URL.createObjectURL(f));
  };

  const uploadHeroImage = async (): Promise<string | null> => {
    if (!heroImageFile) return null;
    const ext = heroImageFile.name.split(".").pop() || "png";
    const path = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("flyer-uploads").upload(path, heroImageFile, {
      contentType: heroImageFile.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("flyer-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload a JPG or PNG image.", variant: "destructive" });
      return;
    }
    setFlyerFile(f);
    setFlyerPreview(URL.createObjectURL(f));
    setFlyerUrl(null);
    setDemoSlug(null);
    setDemoTournamentId(null);
  };

  const uploadFlyer = async (): Promise<string> => {
    if (!flyerFile) throw new Error("No flyer selected");
    const ext = flyerFile.name.split(".").pop() || "png";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("flyer-uploads").upload(path, flyerFile, {
      contentType: flyerFile.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("flyer-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleExtract = async () => {
    if (!flyerFile) return;
    setExtracting(true);
    try {
      const url = await uploadFlyer();
      setFlyerUrl(url);

      const { data, error } = await supabase.functions.invoke("extract-flyer-text", {
        body: { image_url: url },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      const parsed = data.data as ParsedFlyer;
      setName(parsed.tournament_name || "");
      setDate(parsed.date || "");
      setCourseName(parsed.course_name || "");
      setLocation(parsed.location || "");
      setFeeDollars(parsed.fee_cents != null ? (parsed.fee_cents / 100).toFixed(2) : "");
      setDescription(parsed.description || "");
      setContactEmail(parsed.contact_email || "");
      setContactPhone(parsed.contact_phone || "");

      toast({ title: "Flyer parsed", description: "Review and edit the fields below, then generate the demo." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Extraction failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const generateSampleRegistrations = async (tournamentId: string) => {
    const regs: any[] = [];
    for (let i = 0; i < 20; i++) {
      const first = SAMPLE_FIRST_NAMES[i % SAMPLE_FIRST_NAMES.length];
      const last = SAMPLE_LAST_NAMES[(i * 3) % SAMPLE_LAST_NAMES.length];
      regs.push({
        tournament_id: tournamentId,
        first_name: first,
        last_name: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        handicap: Math.floor(Math.random() * 30),
        shirt_size: SHIRT_SIZES[i % SHIRT_SIZES.length],
        payment_status: "paid",
        group_number: Math.floor(i / 4) + 1,
        group_position: (i % 4) + 1,
      });
    }
    const { error } = await supabase.from("tournament_registrations").insert(regs);
    if (error) throw error;
  };

  const handleCreateDemo = async () => {
    if (!name || !date) {
      toast({ title: "Missing fields", description: "Tournament name and date are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const slugBase = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "demo";
      const slug = `demo-${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

      const feeCents = feeDollars ? Math.round(parseFloat(feeDollars) * 100) : 0;

      const heroUrl = await uploadHeroImage();

      const { data: created, error: createErr } = await supabase
        .from("tournaments")
        .insert({
          organization_id: SALES_DEMO_ORG_ID,
          title: name,
          slug,
          date,
          location: location || null,
          course_name: courseName || null,
          description: description || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          registration_fee_cents: feeCents,
          registration_open: true,
          site_published: true,
          show_in_public_search: false,
          status: "published",
          template: "modern",
          is_demo: true,
          demo_admin_id: user.id,
          demo_flyer_url: flyerUrl,
          site_hero_title: name,
          site_hero_subtitle: courseName || location || null,
          site_hero_image_url: heroUrl,
        })
        .select("id, slug")
        .single();

      if (createErr) throw createErr;

      await generateSampleRegistrations(created.id);

      setDemoTournamentId(created.id);
      setDemoSlug(created.slug);
      toast({ title: "Demo generated!", description: "Sample tournament created with 20 mock registrations." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Generation failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Sections we capture from the public tournament site (matches ids in PublicTournament.tsx)
  const SCREENSHOT_SECTIONS: { id: string; label: string; filename: string }[] = [
    { id: "hero", label: "Hero", filename: "01-hero.png" },
    { id: "register", label: "Registration", filename: "02-registration.png" },
    { id: "leaderboard", label: "Leaderboard", filename: "03-leaderboard.png" },
    { id: "sponsors", label: "Sponsors", filename: "04-sponsors.png" },
    { id: "schedule", label: "Schedule", filename: "05-schedule.png" },
    { id: "about", label: "About", filename: "06-about.png" },
    { id: "location", label: "Location", filename: "07-location.png" },
    { id: "contact", label: "Contact", filename: "08-contact.png" },
  ];

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const captureSectionById = async (sectionId: string): Promise<Blob | null> => {
    const iframe = previewRef.current;
    if (!iframe) return null;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return null;
    const target = doc.getElementById(sectionId) as HTMLElement | null;
    if (!target) return null;

    // Scroll element into view inside iframe so lazy/in-view animations render
    target.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
    await wait(450);

    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      scale: 2,
      windowWidth: iframe.clientWidth,
      windowHeight: iframe.clientHeight,
      width: target.scrollWidth,
      height: target.scrollHeight,
    } as any);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const slugSafe = () => (name || "tournament").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

  const downloadBlob = (blob: Blob, filename: string) => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCaptureSection = async (sectionId: string, filename: string, label: string) => {
    try {
      const blob = await captureSectionById(sectionId);
      if (!blob) {
        toast({
          title: `${label} not found`,
          description: "That section isn't visible on this demo (it may be hidden by tab settings).",
          variant: "destructive",
        });
        return;
      }
      downloadBlob(blob, `${slugSafe()}-${filename}`);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Capture failed",
        description: "Browser security may block iframe capture. Open the demo in a new tab and use a screenshot tool.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAllZip = async () => {
    try {
      const zip = new JSZip();
      let added = 0;
      const missing: string[] = [];
      for (const s of SCREENSHOT_SECTIONS) {
        const blob = await captureSectionById(s.id);
        if (blob) {
          zip.file(s.filename, blob);
          added++;
        } else {
          missing.push(s.label);
        }
      }
      if (added === 0) throw new Error("Could not capture any sections from the iframe.");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${slugSafe()}-demo-screenshots.zip`);
      toast({
        title: "ZIP downloaded",
        description:
          `${added} screenshots packaged.` +
          (missing.length ? ` Skipped (not on this site): ${missing.join(", ")}.` : ""),
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "ZIP failed",
        description:
          "Browser security blocks cross-origin iframe capture in some browsers. Open the preview in a new tab and use your OS screenshot tool, or try Chrome.",
        variant: "destructive",
      });
    }
  };

  const captureDashboard = async (): Promise<Blob | null> => {
    const iframe = dashboardRef.current;
    if (!iframe) return null;
    const doc = iframe.contentDocument;
    if (!doc) return null;
    const target = (doc.querySelector("main") as HTMLElement) || doc.body;
    target.scrollIntoView?.({ behavior: "instant" as ScrollBehavior, block: "start" });
    await wait(300);
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      scale: 2,
      windowWidth: iframe.clientWidth,
      windowHeight: iframe.clientHeight,
      width: target.scrollWidth,
      height: target.scrollHeight,
    } as any);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const handleCaptureDashboard = async () => {
    try {
      const blob = await captureDashboard();
      if (!blob) {
        toast({ title: "Dashboard not ready", description: "Wait for the dashboard preview to load.", variant: "destructive" });
        return;
      }
      downloadBlob(blob, `${slugSafe()}-dashboard.png`);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Capture failed",
        description: "Open the dashboard in a new tab and use a screenshot tool.",
        variant: "destructive",
      });
    }
  };
    if (!demoTournamentId) return;
    if (!confirm("Delete this demo tournament and all its sample data?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", demoTournamentId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setDemoTournamentId(null);
    setDemoSlug(null);
    toast({ title: "Demo deleted" });
  };

  const previewUrl = demoSlug ? `${window.location.origin}/t/${demoSlug}` : null;

  const copyEmailTemplate = () => {
    const text = `Hi there,

I saw your flyer for ${name || "your tournament"} and put together a quick preview of what your event website could look like with TeeVents — at no cost to start.

Live preview: ${previewUrl}

With TeeVents you get:
• A branded tournament website
• Online registration + automatic payments
• Live leaderboard & scoring
• Sponsor management

Start free at https://teevents.golf/get-started

Want a 15-minute demo?`;
    navigator.clipboard.writeText(text);
    toast({ title: "Email template copied" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wand2 className="w-7 h-7 text-primary" />
              Flyer-to-Demo Generator
            </h1>
            <p className="text-muted-foreground text-sm">
              Upload a prospect's flyer → AI extracts details → generate a pixel-perfect sample tournament site.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Upload + edit */}
          <div className="space-y-6">
            {/* Step 1 */}
            <Card className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">1</span>
                Upload Flyer
              </h2>
              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
                {flyerPreview ? (
                  <img src={flyerPreview} alt="Flyer preview" className="max-h-72 mx-auto rounded shadow" />
                ) : (
                  <div className="text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">JPG or PNG of a tournament flyer</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mt-4 flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {flyerFile ? "Change Flyer" : "Choose File"}
                  </Button>
                  <Button onClick={handleExtract} disabled={!flyerFile || extracting}>
                    {extracting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Extract with AI</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">2</span>
                Review & Edit
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Tournament Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., HBCU Golf Classic" />
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Registration Fee ($)</Label>
                  <Input type="number" step="0.01" value={feeDollars} onChange={(e) => setFeeDollars(e.target.value)} placeholder="150.00" />
                </div>
                <div className="col-span-2">
                  <Label>Course Name</Label>
                  <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Pebble Beach Golf Links" />
                </div>
                <div className="col-span-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Pebble Beach, CA" />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
                <div className="col-span-2 border-t pt-3 mt-1">
                  <Label>Hero Background Image (optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Replaces the default green background on the demo site's hero. Use a course or event photo for a richer look.
                  </p>
                  {heroImagePreview && (
                    <img src={heroImagePreview} alt="Hero preview" className="max-h-32 rounded mb-2 border" />
                  )}
                  <input
                    ref={heroImageRef}
                    type="file"
                    accept="image/*"
                    onChange={handleHeroImageChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => heroImageRef.current?.click()}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {heroImageFile ? "Change Image" : "Choose Image"}
                    </Button>
                    {heroImageFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setHeroImageFile(null); setHeroImagePreview(null); }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={handleCreateDemo} disabled={creating || !name || !date} className="flex-1">
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-2" />Generate Demo Site</>
                  )}
                </Button>
                {demoTournamentId && (
                  <Button variant="outline" onClick={handleDeleteDemo}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete
                  </Button>
                )}
              </div>
            </Card>

            {/* Step 4: Screenshots & Send */}
            {demoSlug && previewUrl && (
              <Card className="p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-xs">3</span>
                  Capture Screenshots & Send
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Tip: For best results capturing the iframe, use Chrome. If capture fails, open the preview in a new tab and screenshot manually.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SCREENSHOT_SECTIONS.map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleCaptureSection(s.id, s.filename, s.label)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {s.label}
                    </Button>
                  ))}
                  <Button size="sm" onClick={handleDownloadAllZip} className="col-span-2">
                    <Download className="w-4 h-4 mr-2" />Download all as ZIP
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex gap-2">
                    <Input value={previewUrl} readOnly className="text-xs" />
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(previewUrl); toast({ title: "Link copied" }); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={copyEmailTemplate}>
                    <Copy className="w-4 h-4 mr-2" />Copy prospect email template
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: Live preview */}
          <div className="space-y-3">
            <Card className="p-5">
              <h2 className="font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Renders the same template a real organizer would publish — pixel-perfect.
              </p>
            </Card>
            <div className="rounded-lg border overflow-hidden bg-white" style={{ height: "calc(100vh - 220px)", minHeight: 600 }}>
              {previewUrl ? (
                <iframe
                  ref={previewRef}
                  src={previewUrl}
                  className="w-full h-full"
                  title="Tournament demo preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8 text-center">
                  Generate a demo to see the live preview here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FlyerToDemo;

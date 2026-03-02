import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Eye,
  Upload,
  Palette,
  Type,
  Image,
  Phone,
  Globe,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface SiteSettings {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  date: string | null;
  location: string | null;
  course_name: string | null;
  site_published: boolean | null;
  site_logo_url: string | null;
  site_hero_title: string | null;
  site_hero_subtitle: string | null;
  site_primary_color: string | null;
  site_secondary_color: string | null;
  site_hero_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  schedule_info: string | null;
  registration_url: string | null;
  registration_open: boolean | null;
  template: string | null;
}

const SiteBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "content" | "contact">("branding");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as unknown as SiteSettings);
        setLoading(false);
      });
  }, [id]);

  const updateField = (field: keyof SiteSettings, value: string | boolean | null) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        site_published: settings.site_published,
        site_logo_url: settings.site_logo_url,
        site_hero_title: settings.site_hero_title,
        site_hero_subtitle: settings.site_hero_subtitle,
        site_primary_color: settings.site_primary_color,
        site_secondary_color: settings.site_secondary_color,
        site_hero_image_url: settings.site_hero_image_url,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        schedule_info: settings.schedule_info,
        registration_url: settings.registration_url,
        registration_open: settings.registration_open,
        description: settings.description,
        location: settings.location,
        course_name: settings.course_name,
        date: settings.date || null,
        template: settings.template || "classic",
      })
      .eq("id", settings.id);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Site saved!", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  const handleFileUpload = useCallback(
    async (file: File, type: "logo" | "hero") => {
      if (!settings || !org) return;
      const setter = type === "logo" ? setUploadingLogo : setUploadingHero;
      setter(true);

      const ext = file.name.split(".").pop();
      const path = `${org.orgId}/${settings.id}/${type}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("tournament-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setter(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      const field = type === "logo" ? "site_logo_url" : "site_hero_image_url";
      updateField(field, urlData.publicUrl);
      setter(false);
      toast({ title: "Uploaded!", description: `${type === "logo" ? "Logo" : "Hero image"} uploaded successfully.` });
    },
    [settings, org, toast]
  );

  const publicUrl = settings?.slug ? `/t/${settings.slug}` : null;

  const tabs = [
    { key: "branding" as const, label: "Branding", icon: Palette },
    { key: "content" as const, label: "Content", icon: Type },
    { key: "contact" as const, label: "Contact", icon: Phone },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-muted-foreground">Tournament not found.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/dashboard/tournaments"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Tournaments
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Site Builder — {settings.title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!settings.registration_open}
              onCheckedChange={(v) => updateField("registration_open", v)}
            />
            <span className="text-sm font-medium text-foreground">
              Registration {settings.registration_open ? "Open" : "Closed"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!settings.site_published}
              onCheckedChange={(v) => updateField("site_published", v)}
            />
            <span className="text-sm font-medium text-foreground">
              {settings.site_published ? "Published" : "Draft"}
            </span>
          </div>
          {publicUrl && settings.site_published && (
            <Button variant="outline" size="sm" asChild>
              <Link to={publicUrl} target="_blank">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Site
              </Link>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-1.5">Save</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card rounded-lg border border-border p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          {activeTab === "branding" && (
            <>
              <h2 className="text-lg font-display font-bold text-foreground">Branding & Colors</h2>

              {/* Logo Upload */}
              <div>
                <Label>Tournament Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.site_logo_url ? (
                    <img
                      src={settings.site_logo_url}
                      alt="Logo"
                      className="h-16 w-16 object-contain rounded-lg border border-border bg-muted"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-muted rounded-lg border border-dashed border-border flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "logo");
                      }}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors">
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Logo
                    </span>
                  </label>
                </div>
              </div>

              {/* Hero Image Upload */}
              <div>
                <Label>Hero Background Image</Label>
                <div className="mt-2">
                  {settings.site_hero_image_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-border mb-3">
                      <img
                        src={settings.site_hero_image_url}
                        alt="Hero"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg border border-dashed border-border flex items-center justify-center mb-3">
                      <span className="text-sm text-muted-foreground">No hero image</span>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "hero");
                      }}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors">
                      {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Hero Image
                    </span>
                  </label>
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <Label>Site Template</Label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { id: "classic", name: "Classic Green", desc: "Centered logo, golf green tones, 3 CTA buttons", colors: ["#1a5c38", "#c8a84e"] },
                    { id: "modern", name: "Modern Navy", desc: "Logo in nav, right-aligned hero, bold accents", colors: ["#1e3a5f", "#e8b931"] },
                    { id: "charity", name: "Charity Warmth", desc: "Centered banner, warm tones, 2 CTA buttons", colors: ["#8b2500", "#d4a017"] },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => updateField("template", tpl.id)}
                      className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                        (settings.template || "classic") === tpl.id
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex gap-1.5 mb-2">
                        <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: tpl.colors[0] }} />
                        <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: tpl.colors[1] }} />
                      </div>
                      <p className="text-xs font-semibold text-foreground">{tpl.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      id="primaryColor"
                      value={settings.site_primary_color || "#1a5c38"}
                      onChange={(e) => updateField("site_primary_color", e.target.value)}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={settings.site_primary_color || "#1a5c38"}
                      onChange={(e) => updateField("site_primary_color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Accent Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={settings.site_secondary_color || "#c8a84e"}
                      onChange={(e) => updateField("site_secondary_color", e.target.value)}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={settings.site_secondary_color || "#c8a84e"}
                      onChange={(e) => updateField("site_secondary_color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "content" && (
            <>
              <h2 className="text-lg font-display font-bold text-foreground">Site Content</h2>

              <div>
                <Label htmlFor="heroTitle">Hero Title</Label>
                <Input
                  id="heroTitle"
                  value={settings.site_hero_title || ""}
                  onChange={(e) => updateField("site_hero_title", e.target.value)}
                  placeholder={settings.title}
                />
              </div>

              <div>
                <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                <Input
                  id="heroSubtitle"
                  value={settings.site_hero_subtitle || ""}
                  onChange={(e) => updateField("site_hero_subtitle", e.target.value)}
                  placeholder="e.g. Join us for a day of golf and giving back"
                />
              </div>

              <div>
                <Label htmlFor="description">Event Description</Label>
                <Textarea
                  id="description"
                  value={settings.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Tell visitors about your tournament..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courseName">Golf Course</Label>
                  <Input
                    id="courseName"
                    value={settings.course_name || ""}
                    onChange={(e) => updateField("course_name", e.target.value)}
                    placeholder="Pine Valley Golf Club"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={settings.location || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Dallas, TX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="eventDate">Event Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={settings.date || ""}
                  onChange={(e) => updateField("date", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="schedule">Schedule / Timeline</Label>
                <Textarea
                  id="schedule"
                  value={settings.schedule_info || ""}
                  onChange={(e) => updateField("schedule_info", e.target.value)}
                  placeholder={"10:00 AM — Registration\n11:00 AM — Shotgun Start\n4:00 PM — Awards Dinner"}
                  rows={5}
                />
              </div>

              <div>
                <Label htmlFor="registrationUrl">Registration URL (external)</Label>
                <Input
                  id="registrationUrl"
                  value={settings.registration_url || ""}
                  onChange={(e) => updateField("registration_url", e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link to an external registration page, or leave blank to use built-in registration (coming soon).
                </p>
              </div>
            </>
          )}

          {activeTab === "contact" && (
            <>
              <h2 className="text-lg font-display font-bold text-foreground">Contact Info</h2>

              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contact_email || ""}
                  onChange={(e) => updateField("contact_email", e.target.value)}
                  placeholder="tournament@yourorg.com"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={settings.contact_phone || ""}
                  onChange={(e) => updateField("contact_phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </>
          )}
        </div>

        {/* Live Preview Panel */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
            {publicUrl && (
              <span className="text-xs text-muted-foreground ml-auto">
                {window.location.origin}{publicUrl}
              </span>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {/* Mini Preview */}
            <div
              className="relative h-48 flex items-center justify-center"
              style={{
                backgroundColor: settings.site_primary_color || "#1a5c38",
                backgroundImage: settings.site_hero_image_url
                  ? `url(${settings.site_hero_image_url})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {settings.site_hero_image_url && (
                <div className="absolute inset-0 bg-black/50" />
              )}
              <div className="relative z-10 text-center px-4">
                {settings.site_logo_url && (
                  <img
                    src={settings.site_logo_url}
                    alt=""
                    className="h-12 w-12 mx-auto mb-2 object-contain"
                  />
                )}
                <h3
                  className="text-xl font-bold font-display"
                  style={{ color: "#ffffff" }}
                >
                  {settings.site_hero_title || settings.title}
                </h3>
                {(settings.site_hero_subtitle) && (
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {settings.site_hero_subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-6 space-y-6">
              {/* Event Details */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: settings.site_primary_color || "#1a5c38" }}>
                  Event Details
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {settings.date && (
                    <p>📅 {new Date(settings.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                  )}
                  {settings.course_name && <p>⛳ {settings.course_name}</p>}
                  {settings.location && <p>📍 {settings.location}</p>}
                </div>
              </div>

              {settings.description && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: settings.site_primary_color || "#1a5c38" }}>
                    About
                  </h4>
                  <p className="text-sm text-muted-foreground">{settings.description}</p>
                </div>
              )}

              {settings.schedule_info && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: settings.site_primary_color || "#1a5c38" }}>
                    Schedule
                  </h4>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-body">
                    {settings.schedule_info}
                  </pre>
                </div>
              )}

              {/* CTA Button Preview */}
              {settings.registration_url && (
                <div className="text-center pt-2">
                  <span
                    className="inline-block px-6 py-2.5 rounded-md text-sm font-semibold"
                    style={{
                      backgroundColor: settings.site_secondary_color || "#c8a84e",
                      color: settings.site_primary_color || "#1a5c38",
                    }}
                  >
                    Register Now
                  </span>
                </div>
              )}

              {/* Contact Preview */}
              {(settings.contact_email || settings.contact_phone) && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: settings.site_primary_color || "#1a5c38" }}>
                    Contact
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {settings.contact_email && <p>✉️ {settings.contact_email}</p>}
                    {settings.contact_phone && <p>📞 {settings.contact_phone}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteBuilder;

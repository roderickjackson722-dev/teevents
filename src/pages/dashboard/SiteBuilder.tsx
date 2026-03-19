import { useEffect, useState, useCallback } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
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
  Check,
  Printer,
} from "lucide-react";
import { SITE_TEMPLATES } from "@/lib/siteTemplates";
import { PRINTABLE_FONTS, PRINTABLE_LAYOUTS } from "@/components/printables/types";
import { Badge } from "@/components/ui/badge";

const DnsStatusChecker = ({ domain }: { domain: string | null }) => {
  const [dnsStatus, setDnsStatus] = useState<"idle" | "checking" | "connected" | "misconfigured" | "not_found" | "error">("idle");
  const [dnsMessage, setDnsMessage] = useState("");

  const checkDns = async () => {
    if (!domain) return;
    setDnsStatus("checking");
    setDnsMessage("");
    try {
      const res = await supabase.functions.invoke("check-dns", {
        body: { domain },
      });
      if (res.error) throw res.error;
      const data = res.data as { status: string; message: string };
      setDnsStatus(data.status as any);
      setDnsMessage(data.message);
    } catch {
      setDnsStatus("error");
      setDnsMessage("Unable to check DNS status. Please try again later.");
    }
  };

  const statusConfig = {
    idle: { color: "secondary" as const, label: "Not Checked" },
    checking: { color: "secondary" as const, label: "Checking…" },
    connected: { color: "default" as const, label: "✅ Connected" },
    misconfigured: { color: "destructive" as const, label: "⚠️ Misconfigured" },
    not_found: { color: "secondary" as const, label: "⏳ Pending" },
    error: { color: "destructive" as const, label: "Error" },
  };

  const cfg = statusConfig[dnsStatus];

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">🔍 DNS Status</h4>
        <Badge variant={cfg.color}>{cfg.label}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={checkDns}
          disabled={dnsStatus === "checking"}
        >
          {dnsStatus === "checking" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Globe className="h-3.5 w-3.5 mr-1.5" />
          )}
          Check DNS Status
        </Button>
      </div>
      {dnsMessage && (
        <p className={`text-xs ${dnsStatus === "connected" ? "text-primary" : dnsStatus === "misconfigured" ? "text-destructive" : "text-muted-foreground"}`}>
          {dnsMessage}
        </p>
      )}
    </div>
  );
};

const CloudflareStatus = ({ domain, tournamentId }: { domain: string | null; tournamentId: string }) => {
  const [cfStatus, setCfStatus] = useState<"idle" | "checking" | "syncing" | "done">("idle");
  const [statusData, setStatusData] = useState<any>(null);

  const checkCfStatus = async () => {
    if (!domain) return;
    setCfStatus("checking");
    try {
      const res = await supabase.functions.invoke("manage-custom-hostname", {
        body: { action: "status", tournament_id: tournamentId, hostname: domain },
      });
      if (res.error) throw res.error;
      setStatusData(res.data);
    } catch {
      setStatusData({ status: "error", message: "Failed to check SSL hostname status." });
    }
    setCfStatus("done");
  };

  const syncHostname = async () => {
    if (!domain) return;
    setCfStatus("syncing");
    try {
      const res = await supabase.functions.invoke("manage-custom-hostname", {
        body: { action: "create", tournament_id: tournamentId, hostname: domain },
      });
      if (res.error) throw res.error;
      setStatusData(res.data);
    } catch {
      setStatusData({ status: "error", message: "Failed to register this hostname. Try saving again." });
    }
    setCfStatus("done");
  };

  const statusColors: Record<string, string> = {
    active: "text-primary",
    pending: "text-muted-foreground",
    not_registered: "text-muted-foreground",
    error: "text-destructive",
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">☁️ SSL & Hostname Status</h4>
        {statusData && (
          <Badge variant={statusData.status === "active" ? "default" : "secondary"}>
            {statusData.status === "active" ? "✅ Active" : statusData.status || "Unknown"}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={checkCfStatus} disabled={cfStatus === "checking" || cfStatus === "syncing"}>
          {cfStatus === "checking" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Globe className="h-3.5 w-3.5 mr-1.5" />
          )}
          Check SSL Status
        </Button>
        <Button size="sm" onClick={syncHostname} disabled={cfStatus === "checking" || cfStatus === "syncing"}>
          {cfStatus === "syncing" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1.5" />
          )}
          Register / Retry SSL
        </Button>
      </div>
      {statusData && (
        <p className={`text-xs ${statusColors[statusData.status] || "text-muted-foreground"}`}>
          {statusData.message}
          {statusData.ssl_status && statusData.ssl_status !== "unknown" && (
            <span className="block mt-1">SSL: {statusData.ssl_status}</span>
          )}
        </p>
      )}
    </div>
  );
};

interface SiteSettings {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  date: string | null;
  end_date: string | null;
  location: string | null;
  course_name: string | null;
  course_par: number | null;
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
  registration_fee_cents: number | null;
  custom_domain: string | null;
  printable_font: string | null;
  printable_layout: string | null;
  hole_pars: number[] | null;
  countdown_style: string | null;
}

const SiteBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [originalDomain, setOriginalDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "content" | "contact" | "domain" | "printables">("branding");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings(data as unknown as SiteSettings);
          setOriginalDomain((data as any).custom_domain || null);
        }
        setLoading(false);
      });
  }, [id]);

  const updateField = (field: keyof SiteSettings, value: string | boolean | number | number[] | null) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    if (!settings || demoGuard()) return;
    setSaving(true);

    const newDomain = settings.custom_domain || null;
    const domainChanged = newDomain !== originalDomain;

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
        end_date: (settings as any).end_date || null,
        template: settings.template || "classic",
        registration_fee_cents: settings.registration_fee_cents || 0,
        custom_domain: settings.custom_domain || null,
        printable_font: settings.printable_font || "georgia",
        printable_layout: settings.printable_layout || "classic",
        hole_pars: settings.hole_pars || null,
        countdown_style: settings.countdown_style || "glass",
      } as any)
      .eq("id", settings.id);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    try {
      if (domainChanged && originalDomain) {
        await supabase.functions.invoke("manage-custom-hostname", {
          body: { action: "delete", tournament_id: settings.id, hostname: originalDomain },
        });
      }

      if (newDomain) {
        const res = await supabase.functions.invoke("manage-custom-hostname", {
          body: { action: "create", tournament_id: settings.id, hostname: newDomain },
        });

        if (res.error) {
          throw res.error;
        }

        if (res.data?.success) {
          toast({
            title: "Custom domain synced",
            description:
              res.data.message || "Hostname registered. SSL certificate provisioning may take a few minutes.",
          });
        } else if (res.data?.error) {
          toast({
            title: "Domain registration issue",
            description: res.data.error,
            variant: "destructive",
          });
        }
      }

      setOriginalDomain(newDomain);
    } catch (cfErr) {
      console.error("Cloudflare hostname error:", cfErr);
      toast({
        title: "Domain saved, but registration failed",
        description: "Save succeeded, but the hostname could not be synced yet. Try saving again.",
        variant: "destructive",
      });
    }

    toast({ title: "Site saved!", description: "Your changes have been saved." });
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
    { key: "printables" as const, label: "Printables", icon: Printer },
    { key: "domain" as const, label: "Domain", icon: Globe },
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
                <p className="text-xs text-muted-foreground mb-2">Change your site layout at any time.</p>
                <div className="grid grid-cols-2 gap-3">
                  {SITE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => updateField("template", tpl.id)}
                      className={`relative text-left rounded-lg border-2 overflow-hidden transition-all ${
                        (settings.template || "classic") === tpl.id
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {(settings.template || "classic") === tpl.id && (
                        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      {/* Mini preview */}
                      <div className="relative h-16 w-full" style={{ backgroundColor: tpl.colors.primary }}>
                        <div className="absolute top-0 left-0 right-0 h-3 flex items-center px-2" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                          {tpl.preview.navStyle === "left-logo" && (
                            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
                          )}
                          <div className="flex gap-1 mx-auto">
                            {[0,1,2].map((i) => (
                              <div key={i} className="w-4 h-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.4)" }} />
                            ))}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0">
                          {Array.from({ length: tpl.preview.ctaCount }).map((_, i) => (
                            <div key={i} className="w-10 h-3" style={{ backgroundColor: i === 0 ? tpl.colors.secondary : tpl.colors.primary, opacity: i === 0 ? 1 : 0.8 }} />
                          ))}
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="flex gap-1 shrink-0">
                          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: tpl.colors.primary }} />
                          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: tpl.colors.secondary }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{tpl.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{tpl.description}</p>
                        </div>
                      </div>
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

              {/* Countdown Timer Style */}
              <div>
                <Label>Countdown Timer Style</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose how the event countdown appears on your tournament page.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "glass", name: "Glass", desc: "Frosted glass cards" },
                    { id: "solid", name: "Solid", desc: "Branded color blocks" },
                    { id: "minimal", name: "Minimal", desc: "Clean text with dividers" },
                    { id: "circle", name: "Circle", desc: "Circular countdown rings" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => updateField("countdown_style", style.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        (settings.countdown_style || "glass") === style.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">{style.name}</span>
                        {(settings.countdown_style || "glass") === style.id && (
                          <div className="bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{style.desc}</p>
                    </button>
                  ))}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDate">Start Date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={settings.date || ""}
                    onChange={(e) => updateField("date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={(settings as any).end_date || ""}
                    onChange={(e) => updateField("end_date" as any, e.target.value || null)}
                    min={settings.date || undefined}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank for single-day events</p>
                </div>
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
                  Link to an external registration page, or leave blank to use built-in registration.
                </p>
              </div>

              {!settings.registration_url && (
                <div>
                  <Label htmlFor="registrationFee">Registration Fee (USD)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      id="registrationFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.registration_fee_cents ? (settings.registration_fee_cents / 100).toFixed(2) : ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateField("registration_fee_cents" as any, isNaN(val) ? 0 : Math.round(val * 100));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave at $0 for free registration. Requires Stripe Connect in Settings.
                  </p>
                </div>
              )}
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

          {activeTab === "printables" && (
            <>
              <h2 className="text-lg font-display font-bold text-foreground">Printable Style</h2>
              <p className="text-sm text-muted-foreground -mt-4">
                Customize the look of printed materials like cart signs, scorecards, and badges.
              </p>

              {/* Font Selection */}
              <div>
                <Label>Print Font</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose a typeface for all printed materials.</p>
                <div className="grid grid-cols-1 gap-2">
                  {PRINTABLE_FONTS.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => updateField("printable_font", font.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                        (settings.printable_font || "georgia") === font.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold text-foreground">{font.name}</span>
                        <span className="block text-xs text-muted-foreground" style={{ fontFamily: font.preview }}>
                          The quick brown fox jumps over the lazy dog
                        </span>
                      </div>
                      {(settings.printable_font || "georgia") === font.id && (
                        <div className="bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Selection */}
              <div>
                <Label>Layout Preset</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose a visual style for scorecards and signs.</p>
                <div className="grid grid-cols-3 gap-3">
                  {PRINTABLE_LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => updateField("printable_layout", layout.id)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        (settings.printable_layout || "classic") === layout.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="mb-1">
                        {layout.id === "classic" && (
                          <div className="mx-auto w-12 h-8 border-2 rounded" style={{ borderColor: settings.site_primary_color || "#1a5c38" }} />
                        )}
                        {layout.id === "modern" && (
                          <div className="mx-auto w-12 h-8 border rounded border-gray-200 bg-gray-50" />
                        )}
                        {layout.id === "bold" && (
                          <div className="mx-auto w-12 h-8 rounded" style={{ backgroundColor: settings.site_primary_color || "#1a5c38" }} />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground">{layout.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{layout.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hole-by-Hole Par */}
              <div>
                <Label>Hole-by-Hole Par</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Set individual par values per hole. Leave blank to use course par ÷ holes.
                </p>
                <div className="grid grid-cols-9 gap-1.5">
                  {Array.from({ length: 18 }, (_, i) => {
                    const currentPars = settings.hole_pars || [];
                    return (
                      <div key={i} className="text-center">
                        <span className="block text-[10px] font-semibold text-muted-foreground mb-0.5">{i + 1}</span>
                        <Input
                          type="number"
                          min="1"
                          max="7"
                          className="h-8 px-1 text-center text-sm"
                          value={currentPars[i] ?? ""}
                          placeholder={String(Math.round((settings.course_par || 72) / 18))}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            const newPars = [...(settings.hole_pars || Array(18).fill(null))];
                            // Ensure array is 18 long
                            while (newPars.length < 18) newPars.push(null);
                            newPars[i] = val;
                            // If all null, clear the array
                            const allNull = newPars.every((p) => p === null);
                            updateField("hole_pars", allNull ? null : newPars as any);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                {settings.hole_pars && settings.hole_pars.some((p) => p != null) && (
                  <div className="flex items-center justify-between mt-3 p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">
                      Total Par: <strong className="text-foreground">
                        {settings.hole_pars.reduce((sum, p, i) => sum + (p ?? Math.round((settings.course_par || 72) / 18)), 0)}
                      </strong>
                    </span>
                    <button
                      onClick={() => updateField("hole_pars", null)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "domain" && (
            <>
              <h2 className="text-lg font-display font-bold text-foreground">Domain Settings</h2>

              {/* Default Subdomain */}
              <div className="bg-muted/50 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Default URL (always active)</Label>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your tournament is automatically available at:
                </p>
                {settings.slug ? (
                  <div className="flex items-center gap-2">
                    <code className="bg-background border border-border rounded px-3 py-1.5 text-sm font-mono text-foreground">
                      {window.location.origin}/t/{settings.slug}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/t/${settings.slug}`);
                        toast({ title: "Copied!", description: "URL copied to clipboard." });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Slug will be generated when you save.</p>
                )}
              </div>

              {/* "Already have a website?" explainer */}
              <div className="border border-primary/20 rounded-lg p-4 space-y-4 bg-primary/5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  🌐 Already have a website?
                </h3>
                <p className="text-sm text-muted-foreground">
                  If your organization already has a website, you don't need to replace it. Here's how to connect your tournament:
                </p>

                <div className="space-y-3">
                  {/* Option 1 */}
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Subdomain (Recommended)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Create a subdomain like <span className="font-mono text-foreground">golf.yourwebsite.com</span> or{" "}
                          <span className="font-mono text-foreground">tournament.yourwebsite.com</span> and point it here.
                          Your main website stays completely untouched — just add a "View Our Tournament" link that goes to the subdomain.
                        </p>
                        <p className="text-xs text-primary font-medium mt-1">
                          ✅ Best of both worlds — branded URL + your existing site is unaffected
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option 2 */}
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Link from your existing site</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          No DNS changes needed — simply add a link or button on your current website (e.g. on a{" "}
                          <span className="font-mono text-foreground">yourwebsite.com/golf-tournament</span> page) that links to your default TeeVents URL above.
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          ⚡ Fastest setup — zero DNS configuration required
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option 3 */}
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shrink-0 mt-0.5">3</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Dedicated domain</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Purchase a separate domain (e.g. <span className="font-mono text-foreground">mycharitygolf.com</span>) and point it entirely to TeeVents.
                          Great for annual events that deserve their own identity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-md p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>⚠️ Important:</strong> You cannot use a URL <em>path</em> like{" "}
                    <span className="font-mono">yourwebsite.com/tournaments</span> as a custom domain — DNS works at the domain level, not the page level.
                    Use a <strong>subdomain</strong> (Option 1) or a <strong>link</strong> (Option 2) instead.
                  </p>
                </div>
              </div>

              {/* Custom Domain Input */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Connect Custom Domain</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  For Option 1 or 3 above, enter the subdomain or domain you'd like to connect:
                </p>

                <div>
                  <Label htmlFor="customDomain">Domain Name</Label>
                  <Input
                    id="customDomain"
                    value={settings.custom_domain || ""}
                    onChange={(e) => updateField("custom_domain" as keyof SiteSettings, e.target.value.toLowerCase().trim())}
                    placeholder="golf.yourcharity.org"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Examples: <span className="font-mono">golf.yourwebsite.com</span>, <span className="font-mono">tournament.yourcharity.org</span>, or <span className="font-mono">mycharitygolf.com</span>
                  </p>
                </div>

                {settings.custom_domain && (
                  <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">!</span>
                      DNS Setup Required
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      To connect <span className="font-mono font-semibold text-foreground">{settings.custom_domain}</span>, add this DNS record at your domain registrar:
                    </p>

                    {/* Determine if subdomain or root domain */}
                    {(() => {
                      const parts = settings.custom_domain!.replace(/^www\./, "").split(".");
                      const isSubdomain = parts.length > 2;
                      return (
                        <div className="space-y-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 pr-4 font-semibold text-foreground">Type</th>
                                  <th className="text-left py-2 pr-4 font-semibold text-foreground">Name</th>
                                  <th className="text-left py-2 font-semibold text-foreground">Value</th>
                                </tr>
                              </thead>
                              <tbody className="font-mono text-xs">
                                {isSubdomain ? (
                                  <tr className="border-b border-border/50">
                                    <td className="py-2 pr-4">CNAME</td>
                                    <td className="py-2 pr-4">{parts[0]}</td>
                                    <td className="py-2">custom-domains.teevents.golf</td>
                                  </tr>
                                ) : (
                                  <tr className="border-b border-border/50">
                                    <td className="py-2 pr-4">A</td>
                                    <td className="py-2 pr-4">@</td>
                                    <td className="py-2">185.158.133.1</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground">
                              {isSubdomain ? (
                                <>
                                  <strong>Subdomain detected.</strong> Add a <strong>CNAME</strong> record pointing{" "}
                                  <span className="font-mono text-foreground">{parts[0]}</span> to{" "}
                                  <span className="font-mono text-foreground">custom-domains.teevents.golf</span>.
                                  Do <strong>not</strong> use an A record for subdomains.
                                </>
                              ) : (
                                <>
                                  <strong>Root domain detected.</strong> Add an <strong>A record</strong> pointing to{" "}
                                  <span className="font-mono text-foreground">185.158.133.1</span>.
                                  If you also want <span className="font-mono">www.{settings.custom_domain}</span>, add a CNAME for{" "}
                                  <span className="font-mono">www</span> → <span className="font-mono">custom-domains.teevents.golf</span>.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step-by-step instructions */}
                    <div className="border border-border rounded-lg p-4 space-y-3 bg-background">
                      <h4 className="text-sm font-semibold text-foreground">📋 Step-by-Step Setup</h4>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>
                          <strong className="text-foreground">Log in to your domain registrar</strong> — where you purchased your domain (GoDaddy, Namecheap, Cloudflare, etc.)
                        </li>
                        <li>
                          <strong className="text-foreground">Find DNS settings</strong> — look for "DNS Management" or "Advanced DNS"
                        </li>
                        <li>
                          <strong className="text-foreground">Add the DNS record</strong> shown in the table above
                        </li>
                        <li>
                          <strong className="text-foreground">Save here</strong> — click Save above to register your domain for SSL
                        </li>
                        <li>
                          <strong className="text-foreground">Wait for propagation</strong> — DNS changes take 15 minutes to 48 hours. Use the status buttons below to verify.
                        </li>
                      </ol>
                      <p className="text-xs text-muted-foreground italic">
                        💡 SSL certificates are provisioned automatically (5–30 min). During this time you may see a browser error — this is normal, just wait.
                      </p>
                    </div>

                    {/* DNS Status Checker */}
                    <DnsStatusChecker domain={settings.custom_domain} />

                    {/* Cloudflare SSL Status */}
                    <CloudflareStatus domain={settings.custom_domain} tournamentId={settings.id} />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Remove from Cloudflare first
                        if (settings.custom_domain) {
                          try {
                            await supabase.functions.invoke("manage-custom-hostname", {
                              body: { action: "delete", tournament_id: settings.id, hostname: settings.custom_domain },
                            });
                          } catch (err) {
                            console.error("Failed to remove hostname from Cloudflare:", err);
                          }
                        }
                        updateField("custom_domain" as keyof SiteSettings, null);
                        setOriginalDomain(null);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove Custom Domain
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Live Preview Panel */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Eye className="h-4 w-4 text-muted-foreground" />
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Live Preview
              </a>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
            )}
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary ml-auto"
              >
                {window.location.origin}{publicUrl}
              </a>
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

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import {
  FileImage, ExternalLink, Download, Copy, QrCode,
  Palette, FileText, Users, Calendar, MapPin, Megaphone,
} from "lucide-react";
import { format } from "date-fns";

interface Tournament {
  id: string;
  slug: string | null;
  title: string;
  date: string | null;
  location: string | null;
  course_name: string | null;
}

interface FlyerTemplate {
  id: string;
  name: string;
  description: string;
  size: string;
  icon: React.ReactNode;
  canvaTemplateId: string;
  color: string;
}

const DOMAIN = "www.teevents.golf";

const FLYER_TEMPLATES: FlyerTemplate[] = [
  {
    id: "simple",
    name: "Simple Tournament Flyer",
    description: "Clean design with event name, date, location, and QR code. Perfect for email blasts and community boards.",
    size: "8.5\" × 11\" (Letter)",
    icon: <FileText className="h-8 w-8" />,
    canvaTemplateId: "",
    color: "from-primary/20 to-primary/5",
  },
  {
    id: "sponsor",
    name: "Sponsor Showcase Flyer",
    description: "Highlights your sponsors with logo placements. Great for distribution at the course and to sponsors.",
    size: "8.5\" × 11\" (Letter)",
    icon: <Users className="h-8 w-8" />,
    canvaTemplateId: "",
    color: "from-secondary/20 to-secondary/5",
  },
  {
    id: "save-the-date",
    name: "Save the Date",
    description: "Minimal, elegant design for early promotion. Send months ahead to build anticipation.",
    size: "8.5\" × 11\" (Letter)",
    icon: <Calendar className="h-8 w-8" />,
    canvaTemplateId: "",
    color: "from-accent/20 to-accent/5",
  },
  {
    id: "hole-sign",
    name: "Hole Sponsor Sign",
    description: "Print-ready sign for placing on the course. Includes sponsor name, logo area, and hole number.",
    size: "11\" × 8.5\" (Landscape)",
    icon: <MapPin className="h-8 w-8" />,
    canvaTemplateId: "",
    color: "from-primary/20 to-secondary/5",
  },
  {
    id: "social",
    name: "Registration Reminder",
    description: "Social media optimized (1080×1080px). Share on Instagram, Facebook, and LinkedIn.",
    size: "1080 × 1080px (Social)",
    icon: <Megaphone className="h-8 w-8" />,
    canvaTemplateId: "",
    color: "from-secondary/20 to-primary/5",
  },
];

const FlyerStudio = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, slug, title, date, location, course_name")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setTournament(data);
        setLoading(false);
      });
  }, [org]);

  const registrationUrl = tournament?.slug
    ? `https://${DOMAIN}/t/${tournament.slug}`
    : "";

  const shortLink = tournament?.slug
    ? `teev.vent/${tournament.slug}`
    : "";

  const formattedDate = tournament?.date
    ? format(new Date(tournament.date), "MMMM d, yyyy")
    : "TBD";

  const handleEditInCanva = (template: FlyerTemplate) => {
    if (!template.canvaTemplateId) {
      toast({
        title: "Template not configured",
        description: "A Canva template ID hasn't been set for this template yet. Contact your admin to configure it.",
        variant: "destructive",
      });
      return;
    }
    window.open(
      `https://www.canva.com/design/${template.canvaTemplateId}/edit`,
      "_blank"
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const downloadQrPng = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 600);
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 600, 600);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${tournament?.slug || "tournament"}-qr.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Flyer Studio</h1>
        <p className="text-muted-foreground">Create a tournament first to start designing flyers.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-display font-bold text-foreground">Flyer Studio</h1>
          <Badge variant="secondary" className="text-xs">Premium</Badge>
        </div>
        <p className="text-muted-foreground">
          Select a template, customize with your tournament data, and edit in Canva to create professional flyers.
        </p>
      </div>

      {/* Tournament Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileImage className="h-5 w-5 text-secondary" />
            Tournament Data for Flyers
          </CardTitle>
          <CardDescription>
            Copy this info into your Canva templates or use "Edit in Canva" below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Info */}
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Tournament", value: tournament.title },
                  { label: "Date", value: formattedDate },
                  { label: "Location", value: tournament.location || tournament.course_name || "TBD" },
                  { label: "Registration URL", value: registrationUrl },
                  { label: "Short Link", value: shortLink },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                      <p className="text-sm font-medium text-foreground truncate max-w-[280px]">{item.value}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => copyToClipboard(item.value, item.label)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="custom-message" className="text-xs text-muted-foreground font-medium">
                  Custom Message (optional)
                </Label>
                <Textarea
                  id="custom-message"
                  placeholder="e.g. Register by May 1st for early bird pricing!"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="mt-1.5 text-sm"
                  rows={2}
                />
                {customMessage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => copyToClipboard(customMessage, "Custom message")}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy message
                  </Button>
                )}
              </div>
            </div>

            {/* Right: QR Code */}
            <div className="flex flex-col items-center gap-4">
              <div
                ref={qrRef}
                className="bg-white p-4 rounded-xl border border-border shadow-sm"
              >
                <QRCodeSVG
                  value={`${registrationUrl}?ref=flyer`}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                Right-click to save, or download below
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadQrPng}>
                  <Download className="h-4 w-4 mr-1" /> PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const svg = qrRef.current?.querySelector("svg");
                    if (!svg) return;
                    const blob = new Blob(
                      [new XMLSerializer().serializeToString(svg)],
                      { type: "image/svg+xml" }
                    );
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${tournament.slug || "tournament"}-qr.svg`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  <Download className="h-4 w-4 mr-1" /> SVG
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Gallery */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground mb-1">Flyer Templates</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a template, then click "Edit in Canva" to customize with your branding.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FLYER_TEMPLATES.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Preview area */}
              <div
                className={`h-40 bg-gradient-to-br ${template.color} flex items-center justify-center`}
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 rounded-full bg-background/80 flex items-center justify-center text-foreground">
                    {template.icon}
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background/70">
                    {template.size}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleEditInCanva(template)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Edit in Canva
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Palette className="h-5 w-5 text-secondary" />
            How to Use Flyer Studio
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Copy your tournament data above (name, date, location, QR code)</li>
            <li>Click <strong>"Edit in Canva"</strong> on any template</li>
            <li>Replace placeholder text and images with your data</li>
            <li>Add your logo and sponsor logos from your computer</li>
            <li>Customize colors to match your brand</li>
            <li>Download as PDF (for printing) or PNG (for sharing digitally)</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Tip: Use the QR code from above — it includes tracking so you can see how many people scan it in your Share & Promote analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlyerStudio;

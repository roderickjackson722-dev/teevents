import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import {
  FileImage, ExternalLink, Download, Copy, Palette, Image as ImageIcon,
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

interface DbTemplate {
  id: string;
  name: string;
  description: string | null;
  canva_template_id: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  size: string | null;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
}

const DOMAIN = "www.teevents.golf";

const FlyerStudio = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!org) return;
    const fetchAll = async () => {
      const [tourRes, tplRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, slug, title, date, location, course_name")
          .eq("organization_id", org.orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("flyer_templates")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (tourRes.data) setTournament(tourRes.data);
      setTemplates((tplRes.data as DbTemplate[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, [org]);

  const registrationUrl = tournament?.slug ? `https://${DOMAIN}/t/${tournament.slug}` : "";
  const shortLink = tournament?.slug ? `teev.vent/${tournament.slug}` : "";
  const formattedDate = tournament?.date ? format(new Date(tournament.date), "MMMM d, yyyy") : "TBD";

  const handleEditInCanva = (t: DbTemplate) => {
    if (!t.canva_template_id) {
      toast({ title: "Template not configured", description: "A Canva template ID hasn't been set yet.", variant: "destructive" });
      return;
    }
    window.open(`https://www.canva.com/design/${t.canva_template_id}/edit`, "_blank");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const downloadQrPng = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 600;
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
          <CardDescription>Copy this info into your Canva templates or use "Edit in Canva" below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(item.value, item.label)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="custom-message" className="text-xs text-muted-foreground font-medium">Custom Message (optional)</Label>
                <Textarea id="custom-message" placeholder="e.g. Register by May 1st for early bird pricing!" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="mt-1.5 text-sm" rows={2} />
                {customMessage && (
                  <Button variant="ghost" size="sm" className="mt-1" onClick={() => copyToClipboard(customMessage, "Custom message")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy message
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <QRCodeSVG value={`${registrationUrl}?ref=flyer`} size={180} level="H" includeMargin />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">Right-click to save, or download below</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadQrPng}>
                  <Download className="h-4 w-4 mr-1" /> PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const svg = qrRef.current?.querySelector("svg");
                  if (!svg) return;
                  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${tournament.slug || "tournament"}-qr.svg`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}>
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

        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No flyer templates available yet. Templates will appear here once configured by the platform team.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-[200px] w-full bg-muted flex items-center justify-center overflow-hidden">
                  {t.thumbnail_url ? (
                    <img
                      src={t.thumbnail_url}
                      alt={t.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div className={t.thumbnail_url ? "hidden flex-col items-center gap-1 text-muted-foreground" : "flex flex-col items-center gap-1 text-muted-foreground"}>
                    <ImageIcon className="h-12 w-12 opacity-40" />
                    <span className="text-xs">No image</span>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                    {t.is_premium && <Badge variant="secondary" className="text-[10px]">Pro</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  {t.size && <Badge variant="outline" className="text-[10px]">{t.size}</Badge>}
                  <Button size="sm" className="w-full text-xs" onClick={() => handleEditInCanva(t)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Edit in Canva
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode, Download, Copy, Share2, BarChart3,
  Smartphone, Monitor, Tablet, ExternalLink,
  Facebook, Linkedin, Mail, MessageCircle,
} from "lucide-react";

interface Tournament {
  id: string;
  slug: string | null;
  title: string;
  date: string | null;
  location: string | null;
  course_name: string | null;
}

interface ClickStats {
  total: number;
  qr_code: number;
  short_link: number;
  social: number;
  email: number;
  mobile: number;
  desktop: number;
  tablet: number;
}

const DOMAIN = "www.teevents.golf";

const SharePromote = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClickStats>({ total: 0, qr_code: 0, short_link: 0, social: 0, email: 0, mobile: 0, desktop: 0, tablet: 0 });
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, slug, title, date, location, course_name")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setTournament(data[0]);
        setLoading(false);
      });
  }, [org]);

  const fetchStats = useCallback(async () => {
    if (!tournament) return;
    const { data } = await supabase
      .from("tournament_clicks")
      .select("source, device_type")
      .eq("tournament_id", tournament.id);
    if (!data) return;
    const s: ClickStats = { total: data.length, qr_code: 0, short_link: 0, social: 0, email: 0, mobile: 0, desktop: 0, tablet: 0 };
    data.forEach((r: any) => {
      if (r.source === "qr_code") s.qr_code++;
      else if (r.source === "short_link") s.short_link++;
      else if (r.source?.startsWith("social")) s.social++;
      else if (r.source === "email") s.email++;
      if (r.device_type === "mobile") s.mobile++;
      else if (r.device_type === "desktop") s.desktop++;
      else if (r.device_type === "tablet") s.tablet++;
    });
    setStats(s);
  }, [tournament]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const registrationUrl = tournament?.slug ? `https://${DOMAIN}/t/${tournament.slug}` : "";
  const qrUrl = registrationUrl ? `${registrationUrl}?ref=qr` : "";

  const downloadQR = (format: "png" | "svg") => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    if (format === "svg") {
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${tournament?.slug || "tournament"}-qr.svg`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }

    const canvas = document.createElement("canvas");
    const size = 900; // 300px * 3 for ~300 DPI
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${tournament?.slug || "tournament"}-qr.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = URL.createObjectURL(svgBlob);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const eventDate = tournament?.date
    ? new Date(tournament.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "[Date]";

  const socialCaptions = {
    facebook: `⛳ Join us for ${tournament?.title || "[Tournament Name]"} on ${eventDate} at ${tournament?.course_name || tournament?.location || "[Location]"}!\n\nRegister here: ${registrationUrl}?ref=facebook\n\n#GolfTournament #CharityGolf`,
    linkedin: `⛳ ${tournament?.title || "[Tournament Name]"} - ${eventDate}\n\nRegister: ${registrationUrl}?ref=linkedin\n\n#GolfTournament`,
    email: `Hello golfers,\n\nJoin us for ${tournament?.title || "[Tournament Name]"} on ${eventDate} at ${tournament?.course_name || tournament?.location || "[Location]"}.\n\nRegister here: ${registrationUrl}?ref=email\n\nWe look forward to seeing you!`,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-20">
        <QrCode className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournament found</h3>
        <p className="text-muted-foreground">Create a tournament first to generate share links and QR codes.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Share & Promote</h1>
        <p className="text-muted-foreground mt-1">Generate QR codes, share links, and track engagement for <strong>{tournament.title}</strong>.</p>
      </div>

      <Tabs defaultValue="qr-code" className="space-y-6">
        <TabsList>
          <TabsTrigger value="qr-code"><QrCode className="h-4 w-4 mr-1.5" />QR Code</TabsTrigger>
          <TabsTrigger value="social"><Share2 className="h-4 w-4 mr-1.5" />Social & Email</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" />Analytics</TabsTrigger>
        </TabsList>

        {/* ── QR Code Tab ── */}
        <TabsContent value="qr-code">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="font-display">Tournament QR Code</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div ref={qrRef} className="bg-white p-4 rounded-lg border border-border">
                  <QRCodeSVG
                    value={qrUrl}
                    size={280}
                    level="H"
                    includeMargin
                    fgColor="#1a5c38"
                  />
                </div>
                <p className="text-sm font-semibold text-foreground text-center">{tournament.title}</p>
                <p className="text-xs text-muted-foreground break-all text-center">{registrationUrl}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" onClick={() => downloadQR("png")}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> PNG (Print)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadQR("svg")}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> SVG (Vector)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!qrRef.current) return;
                    const svg = qrRef.current.querySelector("svg");
                    if (!svg) return;
                    const canvas = document.createElement("canvas");
                    const size = 600;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d")!;
                    const img = new Image();
                    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
                    img.onload = () => {
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, size, size);
                      ctx.drawImage(img, 0, 0, size, size);
                      canvas.toBlob((blob) => {
                        if (!blob) return;
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `${tournament?.slug || "tournament"}-qr.jpg`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }, "image/jpeg", 0.92);
                    };
                    img.src = URL.createObjectURL(svgBlob);
                  }}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> JPG (Web)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(qrUrl, "QR link")}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">Share Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Registration Page", url: registrationUrl, ref: "" },
                  { label: "QR Code Link", url: `${registrationUrl}?ref=qr`, ref: "qr" },
                  { label: "Facebook Link", url: `${registrationUrl}?ref=facebook`, ref: "facebook" },
                  { label: "LinkedIn Link", url: `${registrationUrl}?ref=linkedin`, ref: "linkedin" },
                  { label: "Email Link", url: `${registrationUrl}?ref=email`, ref: "email" },
                ].map((link) => (
                  <div key={link.label} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground break-all">{link.url}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(link.url, link.label)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Social & Email Tab ── */}
        <TabsContent value="social">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Facebook, label: "Facebook Post", color: "text-blue-600", caption: socialCaptions.facebook },
              { icon: Linkedin, label: "LinkedIn Post", color: "text-blue-700", caption: socialCaptions.linkedin },
              { icon: Mail, label: "Email Template", color: "text-primary", caption: socialCaptions.email },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-base">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg mb-3 max-h-40 overflow-y-auto">
                    {item.caption}
                  </pre>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(item.caption, item.label)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Caption
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-base">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  Text Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg mb-3">
{`⛳ ${tournament.title} - ${eventDate}
Register: ${registrationUrl}?ref=sms`}
                </pre>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(`⛳ ${tournament.title} - ${eventDate}\nRegister: ${registrationUrl}?ref=sms`, "Text message")}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "QR Scans", value: stats.qr_code, icon: QrCode, color: "text-primary" },
              { label: "Link Clicks", value: stats.short_link, icon: ExternalLink, color: "text-blue-600" },
              { label: "Social", value: stats.social, icon: Share2, color: "text-purple-600" },
              { label: "Email", value: stats.email, icon: Mail, color: "text-orange-600" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-5 text-center">
                  <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Total Clicks</CardTitle></CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{stats.total}</p>
                <p className="text-sm text-muted-foreground mt-1">All-time tracked clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Device Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Mobile", value: stats.mobile, icon: Smartphone },
                  { label: "Desktop", value: stats.desktop, icon: Monitor },
                  { label: "Tablet", value: stats.tablet, icon: Tablet },
                ].map((d) => (
                  <div key={d.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <d.icon className="h-4 w-4" /> {d.label}
                    </div>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SharePromote;

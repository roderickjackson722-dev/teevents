import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, Tv, Loader2 } from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  tournamentId: string;
  tournamentSlug: string | null;
}

export default function LiveDisplayShareCard({ tournamentId, tournamentSlug }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("live_display_enabled, live_display_refresh_seconds")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEnabled((data as any).live_display_enabled ?? true);
          setRefreshSeconds((data as any).live_display_refresh_seconds ?? 10);
        }
        setLoading(false);
      });
  }, [tournamentId]);

  const liveUrl = tournamentSlug
    ? `${window.location.origin}/live/${tournamentSlug}`
    : "";

  const copyLink = () => {
    if (!liveUrl) return;
    navigator.clipboard.writeText(liveUrl);
    toast({ title: "Display link copied!" });
  };

  const downloadQR = () => {
    const canvas = document.getElementById("live-display-qr") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `live-display-${tournamentSlug || "tournament"}.png`;
    link.click();
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        live_display_enabled: enabled,
        live_display_refresh_seconds: Math.max(5, Math.min(60, refreshSeconds)),
      } as any)
      .eq("id", tournamentId);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Display settings saved" });
    }
    setSaving(false);
  };

  if (!tournamentSlug) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tv className="h-4 w-4" /> Live Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Publish this tournament to enable the live display URL.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tv className="h-4 w-4" /> Live Display & Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/40 border border-border">
              <div>
                <Label className="text-sm">Enable public display URL</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow anyone with the link to view the live leaderboard on a TV or projector.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div>
              <Label className="text-sm mb-1 block">Public Display URL</Label>
              <div className="flex items-center gap-2">
                <Input value={liveUrl} readOnly className="flex-1 bg-muted text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink} title="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Open this on a TV, projector, or any browser. The page auto-refreshes for live scores.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <div>
                <Label className="text-sm mb-1 block">Auto-refresh interval (seconds)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={refreshSeconds}
                  onChange={(e) => setRefreshSeconds(parseInt(e.target.value) || 10)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">Min 5s, max 60s. Default 10s.</p>
              </div>
              <div className="flex flex-col items-center sm:items-start">
                <Label className="text-sm mb-2 block">QR Code</Label>
                <div className="bg-card border border-border rounded-md p-3 inline-flex">
                  <QRCodeSVG value={liveUrl} size={120} />
                  <QRCodeCanvas id="live-display-qr" value={liveUrl} size={512} className="hidden" />
                </div>
                <Button variant="outline" size="sm" onClick={downloadQR} className="mt-2">
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PNG
                </Button>
              </div>
            </div>

            <Button onClick={saveSettings} disabled={saving} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Display Settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Award, Upload, Loader2, X, DollarSign, Check } from "lucide-react";
import { createBrandingRemovalCheckout, getBrandingStatus } from "@/lib/brandingRemoval.functions";


interface Props {
  tournamentId: string;
  orgId: string;
}

type Row = {
  leaderboard_show_sponsor: boolean;
  leaderboard_sponsor_name: string | null;
  leaderboard_sponsor_logo_url: string | null;
  leaderboard_sponsor_label: string | null;
  leaderboard_title: string | null;
};

export default function LeaderboardSponsorCard({ tournamentId, orgId }: Props) {
  const [row, setRow] = useState<Row>({
    leaderboard_show_sponsor: false,
    leaderboard_sponsor_name: "",
    leaderboard_sponsor_logo_url: "",
    leaderboard_sponsor_label: "Presented by",
    leaderboard_title: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [brandingRemoved, setBrandingRemoved] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      try {
        // Returning from Stripe Checkout: confirm the payment right here.
        const params = new URLSearchParams(window.location.search);
        const sid = params.get("branding_session_id");
        if (sid) {
          const v: any = await verifyBrandingRemoval({ data: { sessionId: sid } });
          if (v?.verified) {
            setBrandingRemoved(true);
            toast({ title: "Payment confirmed — TeeVents branding removed for this event" });
          }
          params.delete("branding_session_id");
          params.delete("tournament_id");
          const qs = params.toString();
          window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
        } else if (params.get("branding_canceled")) {
          toast({ title: "Checkout canceled — no charge was made" });
          params.delete("branding_canceled");
          params.delete("tournament_id");
          const qs = params.toString();
          window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
        }

        const res: any = await getBrandingStatus({ data: { tournamentId } });
        if (res?.removed) {
          setBrandingRemoved(true);
          return;
        }
        // Safety net for abandoned redirects — a completed Stripe payment still applies.
        const rec: any = await reconcileBrandingPayment({ data: { tournamentId } });
        setBrandingRemoved(!!rec?.removed);
      } catch {
        /* non-blocking */
      }
    })();
  }, [tournamentId]);

  const handleBrandingPurchase = async () => {
    setBrandingLoading(true);
    try {
      const res: any = await createBrandingRemovalCheckout({
        data: {
          tournamentId,
          origin: window.location.origin,
          returnPath: window.location.pathname,
        },
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      toast({ title: "Could not start checkout", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Could not start checkout", description: e?.message, variant: "destructive" });
    } finally {
      setBrandingLoading(false);
    }
  };


  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("leaderboard_show_sponsor, leaderboard_sponsor_name, leaderboard_sponsor_logo_url, leaderboard_sponsor_label, leaderboard_title")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRow(data as Row);
        setLoading(false);
      });
  }, [tournamentId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tournaments")
      .update({
        leaderboard_show_sponsor: row.leaderboard_show_sponsor,
        leaderboard_sponsor_name: row.leaderboard_sponsor_name || null,
        leaderboard_sponsor_logo_url: row.leaderboard_sponsor_logo_url || null,
        leaderboard_sponsor_label: row.leaderboard_sponsor_label || "Presented by",
        leaderboard_title: row.leaderboard_title || null,
        // Mirror into the shared "Presented by" fields used by reports/printables.
        presented_by: row.leaderboard_sponsor_name || null,
        presented_by_logo_url: row.leaderboard_sponsor_logo_url || null,
      } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (error) return toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    toast({ title: "Leaderboard sponsor saved" });
  };


  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${orgId}/${tournamentId}/leaderboard-sponsor-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      setRow((r) => ({ ...r, leaderboard_sponsor_logo_url: data.publicUrl }));
      toast({ title: "Logo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Leaderboard Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="font-semibold text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Turn Your Leaderboard into Revenue
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            The "Presented by" space on your live leaderboard and mobile scoring can be sold as a sponsorship
            opportunity. Use this space to recognize your title sponsor and increase your event revenue.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/help/step-by-step">Learn More</Link>
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="font-semibold text-sm">Show "Presented by" on leaderboard</p>
            <p className="text-xs text-muted-foreground">Highlights a headline sponsor at the top of the live leaderboard.</p>
          </div>

          <Switch
            checked={row.leaderboard_show_sponsor}
            onCheckedChange={(v) => setRow((r) => ({ ...r, leaderboard_show_sponsor: v }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Leaderboard Title (optional)</Label>
            <Input
              value={row.leaderboard_title || ""}
              onChange={(e) => setRow((r) => ({ ...r, leaderboard_title: e.target.value }))}
              placeholder="Defaults to tournament name"
            />
          </div>
          <div>
            <Label>Display As</Label>
            <Select
              value={row.leaderboard_sponsor_label || "Presented by"}
              onValueChange={(v) => setRow((r) => ({ ...r, leaderboard_sponsor_label: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Presented by">Presented by</SelectItem>
                <SelectItem value="Sponsored by">Sponsored by</SelectItem>
                <SelectItem value="In partnership with">In partnership with</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Sponsor Name</Label>
          <Input
            value={row.leaderboard_sponsor_name || ""}
            onChange={(e) => setRow((r) => ({ ...r, leaderboard_sponsor_name: e.target.value }))}
            placeholder="Acme Corporation"
          />
        </div>

        <div>
          <Label>Sponsor Logo</Label>
          <div className="flex items-center gap-4 mt-1">
            {row.leaderboard_sponsor_logo_url ? (
              <div className="relative">
                <img src={row.leaderboard_sponsor_logo_url} alt="Sponsor logo" className="h-16 max-w-[220px] object-contain bg-white rounded border p-1" />
                <button
                  type="button"
                  onClick={() => setRow((r) => ({ ...r, leaderboard_sponsor_logo_url: "" }))}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-16 w-40 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">No logo</div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {row.leaderboard_sponsor_logo_url ? "Replace" : "Upload"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Recommended: 400x160 PNG with transparent background.</p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Remove TeeVents branding — $500</p>
              <p className="text-xs text-muted-foreground mt-1">
                One-time fee for this event. Hides the TeeVents logo and tagline from your live leaderboard
                and mobile scoring pages, leaving the space entirely to your own sponsor.
              </p>
            </div>
            {brandingRemoved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary whitespace-nowrap">
                <Check className="h-3 w-3" /> Branding removed
              </span>
            ) : (
              <Button size="sm" onClick={handleBrandingPurchase} disabled={brandingLoading} className="whitespace-nowrap">
                {brandingLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Purchase
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Sponsor Settings
          </Button>
        </div>
      </CardContent>
    </Card>

  );
}

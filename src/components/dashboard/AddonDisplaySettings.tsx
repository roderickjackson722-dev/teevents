import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy, Loader2, MapPin, Save } from "lucide-react";
import { toast } from "sonner";

type DisplayLocation = "registration" | "addon_page" | "both";

/** Lets organizers choose where add-ons appear and copy the dedicated add-on page link. */
export default function AddonDisplaySettings({
  tournamentId,
  demoGuard,
}: {
  tournamentId: string;
  demoGuard?: () => boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<DisplayLocation>("both");
  const [saved, setSaved] = useState<DisplayLocation>("both");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("tournaments") as any)
        .select("add_on_display_location, slug, custom_slug")
        .eq("id", tournamentId)
        .maybeSingle();
      if (cancelled) return;
      const value = (data?.add_on_display_location as DisplayLocation) || "both";
      setLocation(value);
      setSaved(value);
      setSlug(data?.custom_slug || data?.slug || "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const addonUrl = `https://teevents.golf/t/${slug || "{tournament_slug}"}/add-ons`;

  const save = async () => {
    if (demoGuard && demoGuard()) return;
    setSaving(true);
    const { error } = await (supabase.from("tournaments") as any)
      .update({ add_on_display_location: location })
      .eq("id", tournamentId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setSaved(location);
      toast.success("Add-on display settings saved!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading add-on settings…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-5">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Add-On Display Settings</h3>
      </div>

      <div className="space-y-3">
        <Label className="text-sm">Where would you like add-ons to appear?</Label>
        <RadioGroup value={location} onValueChange={(v) => setLocation(v as DisplayLocation)} className="space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="registration" id="addon-loc-registration" />
            <Label htmlFor="addon-loc-registration" className="font-normal cursor-pointer">
              Show on registration page only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="addon_page" id="addon-loc-page" />
            <Label htmlFor="addon-loc-page" className="font-normal cursor-pointer">
              Show on dedicated add-on page only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="both" id="addon-loc-both" />
            <Label htmlFor="addon-loc-both" className="font-normal cursor-pointer">
              Show on both registration page and dedicated add-on page
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <Label className="text-sm">Add-On Page URL</Label>
        <div className="flex gap-2">
          <Input readOnly value={addonUrl} className="font-mono text-xs" />
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(addonUrl);
              toast.success("Link copied!");
            }}
            disabled={!slug}
          >
            <Copy className="h-4 w-4 mr-1" /> Copy Link
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link so participants can buy add-ons (like mulligans) without going through registration.
        </p>
      </div>

      <Button onClick={save} disabled={saving || location === saved}>
        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Save Settings
      </Button>
    </div>
  );
}

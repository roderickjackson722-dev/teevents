import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, ExternalLink } from "lucide-react";

interface Props {
  league: any;
  onSaved: () => void;
}

const DEFAULTS = {
  primary_color: "#1a5c38",
  accent_color: "#F5A623",
  font_color: "#FFFFFF",
};

export default function LeagueCustomizeTab({ league, onSaved }: Props) {
  const [form, setForm] = useState<any>({
    league_name: league.league_name || "",
    tagline: league.tagline || "",
    welcome_message: league.welcome_message || "",
    logo_url: league.logo_url || "",
    banner_url: league.banner_url || "",
    primary_color: league.primary_color || DEFAULTS.primary_color,
    accent_color: league.accent_color || DEFAULTS.accent_color,
    font_color: league.font_color || DEFAULTS.font_color,
    show_schedule: league.show_schedule !== false,
    show_standings: league.show_standings !== false,
    show_results: league.show_results !== false,
    show_register: league.show_register !== false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const uploadImage = async (file: File, kind: "logo" | "banner") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `leagues/${league.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await (supabase as any).storage.from("tournament-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = (supabase as any).storage.from("tournament-assets").getPublicUrl(path);
      set(kind === "logo" ? "logo_url" : "banner_url", data.publicUrl);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("golf_leagues").update(form).eq("id", league.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Page updated" });
    onSaved();
  };

  const reset = () => {
    setForm((f: any) => ({ ...f, ...DEFAULTS, tagline: "", welcome_message: "", show_schedule: true, show_standings: true, show_results: true, show_register: true }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>League Name</Label>
            <Input value={form.league_name} onChange={(e) => set("league_name", e.target.value)} />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Mondays at Pinehurst — All skill levels welcome" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>League Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url && <img src={form.logo_url} alt="" className="h-14 w-14 rounded object-cover border" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logo")} disabled={uploading === "logo"} />
              </div>
            </div>
            <div>
              <Label>Header Image (1920×400)</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.banner_url && <img src={form.banner_url} alt="" className="h-14 w-24 rounded object-cover border" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "banner")} disabled={uploading === "banner"} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(["primary_color", "accent_color", "font_color"] as const).map((k) => (
              <div key={k}>
                <Label className="capitalize">{k.replace("_", " ")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form[k]} onChange={(e) => set(k, e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
                  <Input value={form[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Page Layout</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            ["show_schedule", "Show schedule on homepage"],
            ["show_standings", "Show standings on homepage"],
            ["show_results", "Show results from previous events"],
            ["show_register", "Show registration link on homepage"],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={!!form[k]} onCheckedChange={(v) => set(k, v)} />
            </div>
          ))}
          <div>
            <Label>Welcome Message</Label>
            <Textarea rows={4} value={form.welcome_message} onChange={(e) => set("welcome_message", e.target.value)} placeholder="Welcome to the Weekly Golf League! We play every Monday at 6:00 PM. All skill levels welcome." />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
        {league.league_slug && (
          <Button variant="outline" asChild>
            <a href={`/league/${league.league_slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Preview Page
            </a>
          </Button>
        )}
        <Button variant="ghost" onClick={reset}>Reset to Default</Button>
      </div>
    </div>
  );
}

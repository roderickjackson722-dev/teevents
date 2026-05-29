import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Mail, Trash2, RefreshCw, Eye, Upload, X } from "lucide-react";
import { MOCK_LEADERBOARD, MOCK_PARTICIPANTS, MOCK_SPONSORS, slugify } from "@/lib/sampleMockData";
import { SendProspectModal } from "@/components/admin/SendProspectModal";

interface SampleRow {
  id: string;
  unique_slug: string;
  tournament_name: string;
  event_date: string | null;
  location: string | null;
  view_count: number;
  last_accessed_at: string | null;
  created_at: string;
}

const DEFAULT_FORM = {
  tournament_name: "",
  event_date: "",
  location: "",
  description: "",
  logo_url: "",
  hero_image_url: "",
  scoring_format: "Scramble",
  registration_fee_cents: 25000,
  team_fee_cents: 100000,
};

function ImageUploadField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [uploading, setUploading] = useState(false);
  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `sample-mockups/${label}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-2">
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-20 rounded border object-contain bg-muted" />
          <button type="button" onClick={() => onChange("")} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-md px-3 py-2 text-sm hover:bg-muted/50">
        <Upload className="h-4 w-4" />
        <span>{uploading ? "Uploading..." : value ? "Replace image" : "Upload image"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </label>
    </div>
  );
}

export default function SampleGenerator() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState<SampleRow | null>(null);

  async function loadSamples() {
    const { data } = await supabase
      .from("sample_tournaments")
      .select("id, unique_slug, tournament_name, event_date, location, view_count, last_accessed_at, created_at")
      .order("created_at", { ascending: false });
    setSamples((data as SampleRow[]) || []);
  }

  useEffect(() => { loadSamples(); }, []);

  function buildLink(slug: string) {
    return `${window.location.origin}/sample/${slug}`;
  }

  async function ensureUniqueSlug(base: string, ignoreId?: string): Promise<string> {
    let slug = base || `mockup-${Date.now()}`;
    let i = 0;
    while (true) {
      const { data } = await supabase
        .from("sample_tournaments")
        .select("id")
        .eq("unique_slug", slug)
        .maybeSingle();
      if (!data || data.id === ignoreId) return slug;
      i += 1;
      slug = `${base}-${i}`;
    }
  }

  async function seedMockData(sampleId: string) {
    await supabase.from("sample_participants").delete().eq("sample_tournament_id", sampleId);
    await supabase.from("sample_sponsors").delete().eq("sample_tournament_id", sampleId);
    await supabase.from("sample_leaderboard").delete().eq("sample_tournament_id", sampleId);
    await supabase.from("sample_participants").insert(MOCK_PARTICIPANTS.map(p => ({ ...p, sample_tournament_id: sampleId })));
    await supabase.from("sample_sponsors").insert(MOCK_SPONSORS.map(s => ({ ...s, sample_tournament_id: sampleId })));
    await supabase.from("sample_leaderboard").insert(MOCK_LEADERBOARD.map(l => ({ ...l, sample_tournament_id: sampleId })));
  }

  async function handleSave() {
    if (!form.tournament_name.trim()) { toast.error("Tournament name is required"); return; }
    setSaving(true);
    try {
      const slug = await ensureUniqueSlug(slugify(form.tournament_name), editingId || undefined);
      const payload = {
        tournament_name: form.tournament_name,
        event_date: form.event_date || null,
        location: form.location || null,
        description: form.description || null,
        logo_url: form.logo_url || null,
        hero_image_url: form.hero_image_url || null,
        scoring_format: form.scoring_format,
        registration_fee_cents: form.registration_fee_cents,
        team_fee_cents: form.team_fee_cents,
        unique_slug: slug,
      };
      let id = editingId;
      if (editingId) {
        await supabase.from("sample_tournaments").update(payload).eq("id", editingId);
      } else {
        const { data, error } = await supabase
          .from("sample_tournaments")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        await seedMockData(id);
      }
      toast.success(editingId ? "Mockup updated" : "Mockup generated");
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await loadSamples();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this mockup?")) return;
    await supabase.from("sample_tournaments").delete().eq("id", id);
    toast.success("Deleted");
    loadSamples();
  }

  async function handleRegenerate(id: string) {
    await seedMockData(id);
    toast.success("Mock data regenerated");
  }

  function handleEdit(s: SampleRow) {
    setEditingId(s.id);
    supabase.from("sample_tournaments").select("*").eq("id", s.id).single().then(({ data }) => {
      if (data) {
        setForm({
          tournament_name: data.tournament_name || "",
          event_date: data.event_date || "",
          location: data.location || "",
          description: data.description || "",
          logo_url: data.logo_url || "",
          hero_image_url: data.hero_image_url || "",
          scoring_format: data.scoring_format || "Scramble",
          registration_fee_cents: data.registration_fee_cents || 25000,
          team_fee_cents: data.team_fee_cents || 100000,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(buildLink(slug));
    toast.success("Link copied");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Mockup" : "Create Custom Mockup"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tournament Name *</Label>
              <Input value={form.tournament_name} onChange={e => setForm({ ...form, tournament_name: e.target.value })} placeholder="Jack Sinnott Golf Tournament" />
            </div>
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Running Deer Golf Club, NJ" />
            </div>
            <div>
              <Label>Scoring Format</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.scoring_format} onChange={e => setForm({ ...form, scoring_format: e.target.value })}>
                {["Scramble", "Best Ball", "Stroke Play", "Stableford", "Shamble", "Modified Stableford"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label>Player Fee (cents)</Label>
              <Input type="number" value={form.registration_fee_cents} onChange={e => setForm({ ...form, registration_fee_cents: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Team Fee (cents)</Label>
              <Input type="number" value={form.team_fee_cents} onChange={e => setForm({ ...form, team_fee_cents: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Living for a cause..." />
            </div>
            <div>
              <Label>Logo Image</Label>
              <ImageUploadField
                value={form.logo_url}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                label="logo"
              />
            </div>
            <div>
              <Label>Hero Image</Label>
              <ImageUploadField
                value={form.hero_image_url}
                onChange={(url) => setForm({ ...form, hero_image_url: url })}
                label="hero"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              {saving ? "Saving..." : editingId ? "Save Changes" : "Generate Sample Tournament"}
            </Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(DEFAULT_FORM); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Mockups ({samples.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {samples.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mockups yet — generate your first one above.</p>
          ) : (
            <div className="space-y-3">
              {samples.map(s => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 border rounded-md p-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{s.tournament_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.event_date && new Date(s.event_date).toLocaleDateString()} • {s.location || "—"}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">{buildLink(s.unique_slug)}</div>
                  </div>
                  <Badge variant="outline">{s.view_count} views</Badge>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => window.open(buildLink(s.unique_slug), "_blank")}><Eye className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => copyLink(s.unique_slug)}><Copy className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setSendModal(s)}><Mail className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(s)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRegenerate(s.id)}><RefreshCw className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {sendModal && (
        <SendProspectModal
          open={!!sendModal}
          onClose={() => setSendModal(null)}
          tournamentName={sendModal.tournament_name}
          sampleLink={buildLink(sendModal.unique_slug)}
        />
      )}
    </div>
  );
}

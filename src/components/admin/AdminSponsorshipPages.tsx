import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2, Pencil, ExternalLink, Copy, Plus, Trash2, Upload, Eye,
} from "lucide-react";

interface ManagedTournament {
  id: string;
  title: string;
  slug: string | null;
  custom_slug: string | null;
  date: string | null;
  organizations?: { name: string } | null;
}

interface Tier {
  name: string;
  price_cents: number;
  description?: string;
  benefits?: string;
}

interface SponsorshipPage {
  id?: string;
  tournament_id: string;
  hero_title: string | null;
  hero_description: string | null;
  tiers_content: Tier[] | null;
  use_imported_tiers: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  pdf_url: string | null;
  custom_html: string | null;
  cta_register_label: string | null;
  published: boolean;
}

const emptyPage = (tournament_id: string): SponsorshipPage => ({
  tournament_id,
  hero_title: "",
  hero_description: "",
  tiers_content: [],
  use_imported_tiers: true,
  contact_email: "",
  contact_phone: "",
  contact_name: "",
  pdf_url: "",
  custom_html: "",
  cta_register_label: "Become a Sponsor",
  published: false,
});

interface Props {
  tournaments: ManagedTournament[];
}

export default function AdminSponsorshipPages({ tournaments }: Props) {
  const { toast } = useToast();
  const [pages, setPages] = useState<Record<string, SponsorshipPage>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SponsorshipPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("sponsorship_pages").select("*");
    const map: Record<string, SponsorshipPage> = {};
    (data || []).forEach((p: any) => { map[p.tournament_id] = p; });
    setPages(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEditor = (tournamentId: string) => {
    setEditingId(tournamentId);
    setDraft(pages[tournamentId] || emptyPage(tournamentId));
  };

  const closeEditor = () => { setEditingId(null); setDraft(null); };

  const saveDraft = async (publish?: boolean) => {
    if (!draft) return;
    setSaving(true);
    const payload: any = { ...draft };
    if (publish !== undefined) payload.published = publish;
    delete payload.id;
    const { error } = await supabase
      .from("sponsorship_pages")
      .upsert(payload, { onConflict: "tournament_id" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: publish === true ? "Published!" : publish === false ? "Unpublished" : "Saved" });
      await load();
      if (publish === undefined) closeEditor();
    }
    setSaving(false);
  };

  const handlePdfUpload = async (file: File) => {
    if (!draft) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${draft.tournament_id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("sponsorship-assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("sponsorship-assets").getPublicUrl(path);
      setDraft({ ...draft, pdf_url: data.publicUrl });
      toast({ title: "PDF uploaded" });
    }
    setUploading(false);
  };

  const updateTier = (idx: number, field: keyof Tier, val: any) => {
    if (!draft) return;
    const tiers = [...(draft.tiers_content || [])];
    tiers[idx] = { ...tiers[idx], [field]: val };
    setDraft({ ...draft, tiers_content: tiers });
  };

  const addTier = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      tiers_content: [...(draft.tiers_content || []), { name: "New Tier", price_cents: 0, description: "", benefits: "" }],
    });
  };

  const removeTier = (idx: number) => {
    if (!draft) return;
    const tiers = [...(draft.tiers_content || [])];
    tiers.splice(idx, 1);
    setDraft({ ...draft, tiers_content: tiers });
  };

  const copyLink = (slug: string | null) => {
    if (!slug) return;
    const url = `${window.location.origin}/sponsor/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (tournaments.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        No tournaments are currently flagged as <strong>Managed by TeeVents</strong>.
        Toggle a tournament in <em>All User Tournaments</em> to enable a sponsorship page.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Tournament</th>
              <th className="text-left p-3">Organization</th>
              <th className="text-center p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tournaments.map(t => {
              const page = pages[t.id];
              const slug = t.custom_slug || t.slug;
              return (
                <tr key={t.id}>
                  <td className="p-3">
                    <div className="font-medium">{t.title}</div>
                    {t.date && <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground">{t.organizations?.name || "—"}</td>
                  <td className="p-3 text-center">
                    {!page ? (
                      <Badge variant="outline">Not started</Badge>
                    ) : page.published ? (
                      <Badge className="bg-primary text-primary-foreground">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openEditor(t.id)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {page ? "Edit" : "Create"}
                      </Button>
                      {slug && (
                        <a href={`/sponsor/${slug}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost"><Eye className="h-3.5 w-3.5 mr-1" />Preview</Button>
                        </a>
                      )}
                      {page?.published && slug && (
                        <Button size="sm" variant="ghost" onClick={() => copyLink(slug)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />Copy Link
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editingId} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sponsorship Page</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-5">
              <div>
                <Label>Hero Title</Label>
                <Input
                  value={draft.hero_title || ""}
                  placeholder="Sponsor the Spring Classic"
                  onChange={e => setDraft({ ...draft, hero_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Hero Description</Label>
                <Textarea
                  rows={3}
                  value={draft.hero_description || ""}
                  placeholder="Short paragraph describing the sponsorship opportunity."
                  onChange={e => setDraft({ ...draft, hero_description: e.target.value })}
                />
              </div>

              {/* Tiers */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Sponsorship Tiers</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={draft.use_imported_tiers}
                      onCheckedChange={(v) => setDraft({ ...draft, use_imported_tiers: v })}
                    />
                    <span className="text-xs text-muted-foreground">Auto-import from organizer</span>
                  </div>
                </div>
                {draft.use_imported_tiers ? (
                  <p className="text-sm text-muted-foreground">
                    Tiers will be pulled from the organizer's existing sponsorship tiers. Switch off to override.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(draft.tiers_content || []).map((tier, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-3 grid sm:grid-cols-2 gap-2">
                        <Input placeholder="Tier name" value={tier.name}
                          onChange={e => updateTier(idx, "name", e.target.value)} />
                        <Input type="number" placeholder="Price (USD)" value={tier.price_cents / 100 || ""}
                          onChange={e => updateTier(idx, "price_cents", Math.round(Number(e.target.value) * 100))} />
                        <Input className="sm:col-span-2" placeholder="Short description" value={tier.description || ""}
                          onChange={e => updateTier(idx, "description", e.target.value)} />
                        <Textarea className="sm:col-span-2" rows={3} placeholder="Benefits (one per line)"
                          value={tier.benefits || ""} onChange={e => updateTier(idx, "benefits", e.target.value)} />
                        <Button size="sm" variant="ghost" className="sm:col-span-2 justify-self-end text-destructive"
                          onClick={() => removeTier(idx)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Remove tier
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={addTier}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add Tier
                    </Button>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="border-t pt-4">
                <Label className="text-base">Contact Information</Label>
                <div className="grid sm:grid-cols-3 gap-2 mt-2">
                  <Input placeholder="Contact name" value={draft.contact_name || ""}
                    onChange={e => setDraft({ ...draft, contact_name: e.target.value })} />
                  <Input type="email" placeholder="Email" value={draft.contact_email || ""}
                    onChange={e => setDraft({ ...draft, contact_email: e.target.value })} />
                  <Input type="tel" placeholder="Phone" value={draft.contact_phone || ""}
                    onChange={e => setDraft({ ...draft, contact_phone: e.target.value })} />
                </div>
              </div>

              {/* PDF */}
              <div className="border-t pt-4">
                <Label className="text-base">Prospectus PDF</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input type="file" accept="application/pdf"
                    onChange={e => e.target.files?.[0] && handlePdfUpload(e.target.files[0])} />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {draft.pdf_url && (
                  <a href={draft.pdf_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-xs text-primary mt-2">
                    <ExternalLink className="h-3 w-3" /> Current PDF
                  </a>
                )}
              </div>

              {/* CTA + custom HTML */}
              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label>"Become a Sponsor" Button Label</Label>
                  <Input value={draft.cta_register_label || ""}
                    onChange={e => setDraft({ ...draft, cta_register_label: e.target.value })} />
                </div>
                <div>
                  <Label>Custom HTML (optional)</Label>
                  <Textarea rows={4} placeholder="<p>Additional branding or gallery HTML</p>"
                    value={draft.custom_html || ""}
                    onChange={e => setDraft({ ...draft, custom_html: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Admin-only field. Use trusted HTML — it is rendered as-is on the public page.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end border-t pt-4">
                <Button variant="ghost" onClick={closeEditor} disabled={saving}>Cancel</Button>
                <Button variant="outline" onClick={() => saveDraft()} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save Draft
                </Button>
                {draft.published ? (
                  <Button variant="secondary" onClick={() => saveDraft(false)} disabled={saving}>Unpublish</Button>
                ) : (
                  <Button onClick={() => saveDraft(true)} disabled={saving}>Publish</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

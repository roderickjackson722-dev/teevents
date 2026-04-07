import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Upload, Pencil, Trash2, Eye, ExternalLink, Loader2, X, Image as ImageIcon,
} from "lucide-react";

interface FlyerTemplate {
  id: string;
  name: string;
  description: string | null;
  canva_template_id: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  size: string | null;
  category: string | null;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: Omit<FlyerTemplate, "id"> = {
  name: "",
  description: "",
  canva_template_id: "",
  thumbnail_url: "",
  preview_url: "",
  size: '8.5" × 11" (Letter)',
  category: "general",
  is_premium: false,
  is_active: true,
  sort_order: 0,
};

const AdminFlyerTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<FlyerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<FlyerTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [importPreview, setImportPreview] = useState<Omit<FlyerTemplate, "id">[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("flyer_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    setTemplates((data as FlyerTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEdit = (t?: FlyerTemplate) => {
    if (t) {
      setEditId(t.id);
      setForm({
        name: t.name,
        description: t.description || "",
        canva_template_id: t.canva_template_id || "",
        thumbnail_url: t.thumbnail_url || "",
        preview_url: t.preview_url || "",
        size: t.size || '8.5" × 11" (Letter)',
        category: t.category || "general",
        is_premium: t.is_premium,
        is_active: t.is_active,
        sort_order: t.sort_order,
      });
    } else {
      setEditId(null);
      setForm({ ...emptyForm, sort_order: templates.length });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editId) {
      await supabase.from("flyer_templates").update(form as any).eq("id", editId);
    } else {
      await supabase.from("flyer_templates").insert(form as any);
    }
    setSaving(false);
    setEditOpen(false);
    fetchTemplates();
    toast({ title: editId ? "Template updated" : "Template created" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this flyer template?")) return;
    await supabase.from("flyer_templates").delete().eq("id", id);
    fetchTemplates();
    toast({ title: "Template deleted" });
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return {
        name: obj.name || "",
        description: obj.description || "",
        canva_template_id: obj.canva_template_id || "",
        thumbnail_url: obj.thumbnail_url || obj.preview_url || "",
        preview_url: obj.preview_url || "",
        size: obj.size || '8.5" × 11" (Letter)',
        category: obj.category || "general",
        is_premium: obj.is_premium === "true",
        is_active: obj.is_active !== "false",
        sort_order: parseInt(obj.sort_order) || 0,
      } as Omit<FlyerTemplate, "id">;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvData(text);
      setImportPreview(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (importPreview.length === 0) return;
    setSaving(true);
    await supabase.from("flyer_templates").insert(importPreview as any[]);
    setSaving(false);
    setImportOpen(false);
    setCsvData("");
    setImportPreview([]);
    fetchTemplates();
    toast({ title: `${importPreview.length} templates imported` });
  };

  if (loading) return <div className="text-muted-foreground p-4">Loading templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Flyer Templates ({templates.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="h-4 w-4 mr-1" /> Add Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No flyer templates yet. Add one or bulk import from CSV.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className={`overflow-hidden ${!t.is_active ? "opacity-50" : ""}`}>
              <div
                className="h-36 bg-muted flex items-center justify-center cursor-pointer"
                onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}
              >
                {t.thumbnail_url ? (
                  <img src={t.thumbnail_url} alt={t.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-sm font-semibold text-foreground leading-tight">{t.name}</h4>
                  <div className="flex gap-1 flex-shrink-0">
                    {t.is_premium && <Badge variant="secondary" className="text-[9px]">Pro</Badge>}
                    {!t.is_active && <Badge variant="outline" className="text-[9px]">Hidden</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {t.canva_template_id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={`https://www.canva.com/design/${t.canva_template_id}/edit`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Template" : "Add Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Canva Template ID</Label>
                <Input value={form.canva_template_id || ""} onChange={(e) => setForm({ ...form, canva_template_id: e.target.value })} placeholder="D1234567890" />
              </div>
              <div>
                <Label>Size</Label>
                <Input value={form.size || ""} onChange={(e) => setForm({ ...form, size: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Thumbnail URL</Label>
              <Input value={form.thumbnail_url || ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
              {/* Live thumbnail preview */}
              <div className="mt-2 h-[200px] w-[150px] rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
                {form.thumbnail_url ? (
                  <img
                    src={form.thumbnail_url}
                    alt="Thumbnail preview"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; (e.target as HTMLImageElement).nextElementSibling?.classList.add("hidden"); }}
                  />
                ) : null}
                <div className={form.thumbnail_url ? "hidden flex-col items-center gap-1 text-muted-foreground" : "flex flex-col items-center gap-1 text-muted-foreground"}>
                  <ImageIcon className="h-8 w-8 opacity-40" />
                  <span className="text-[10px]">No preview</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Preview URL</Label>
              <Input value={form.preview_url || ""} onChange={(e) => setForm({ ...form, preview_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_premium} onCheckedChange={(v) => setForm({ ...form, is_premium: v })} />
                <Label>Premium Only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editId ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
                {previewTemplate.preview_url || previewTemplate.thumbnail_url ? (
                  <img
                    src={previewTemplate.preview_url || previewTemplate.thumbnail_url || ""}
                    alt={previewTemplate.name}
                    className="max-h-[500px] object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground text-sm">No preview image available</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Canva ID:</span> {previewTemplate.canva_template_id || "—"}</div>
                <div><span className="text-muted-foreground">Size:</span> {previewTemplate.size || "—"}</div>
                <div><span className="text-muted-foreground">Premium:</span> {previewTemplate.is_premium ? "Yes" : "No"}</div>
                <div><span className="text-muted-foreground">Active:</span> {previewTemplate.is_active ? "Yes" : "No"}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPreviewOpen(false); openEdit(previewTemplate); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit Template
                </Button>
                {previewTemplate.canva_template_id && (
                  <Button size="sm" asChild>
                    <a href={`https://www.canva.com/design/${previewTemplate.canva_template_id}/edit`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Test Canva Link
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: name, description, canva_template_id, preview_url, thumbnail_url, size, sort_order, is_premium, is_active
            </p>
            <div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="text-sm" />
            </div>
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{importPreview.length} templates to import:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {importPreview.map((t, i) => (
                    <div key={i} className="text-xs flex items-center justify-between">
                      <span>{t.name}</span>
                      <div className="flex gap-1">
                        {t.is_premium && <Badge variant="secondary" className="text-[9px]">Pro</Badge>}
                        <span className="text-muted-foreground">#{t.sort_order}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview([]); setCsvData(""); }}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={importPreview.length === 0 || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Import {importPreview.length} Templates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFlyerTemplates;

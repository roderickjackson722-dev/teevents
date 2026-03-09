import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookTemplate, Plus, Loader2, Trash2, Pencil, Upload, Image, Zap, Store } from "lucide-react";
import { categories, categoryLabel, fmt, type ProductTemplate } from "./types";

interface Props {
  selectedTournament: string;
  onQuickAdd: () => void;
}

export default function TemplateLibrary({ selectedTournament, onQuickAdd }: Props) {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ProductTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState(getDefaults(null));

  function getDefaults(t: ProductTemplate | null) {
    return t
      ? { name: t.name, description: t.description || "", default_price: t.default_price.toString(), image_url: t.image_url || "", category: t.category, vendor_name: t.vendor_name || "", vendor_url: t.vendor_url || "", vendor_notes: t.vendor_notes || "" }
      : { name: "", description: "", default_price: "", image_url: "", category: "merchandise", vendor_name: "", vendor_url: "", vendor_notes: "" };
  }

  const fetchTemplates = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const { data } = await supabase
      .from("product_templates")
      .select("*")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false });
    setTemplates((data as ProductTemplate[]) || []);
    setLoading(false);
  }, [org]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!org) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${org.orgId}/templates/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    setUploading(false);
  }, [org, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      organization_id: org.orgId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      default_price: parseFloat(form.default_price) || 0,
      image_url: form.image_url || null,
      category: form.category,
      vendor_name: form.vendor_name.trim() || null,
      vendor_url: form.vendor_url.trim() || null,
      vendor_notes: form.vendor_notes.trim() || null,
    };
    if (editTemplate) {
      const { error } = await supabase.from("product_templates").update(payload).eq("id", editTemplate.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Template updated" });
    } else {
      const { error } = await supabase.from("product_templates").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Template saved" });
    }
    setForm(getDefaults(null));
    setEditTemplate(null);
    setDialogOpen(false);
    fetchTemplates();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("product_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Template removed" });
  };

  const handleQuickAdd = async (template: ProductTemplate) => {
    if (!selectedTournament) { toast({ title: "Select a tournament first", variant: "destructive" }); return; }
    setAdding(template.id);
    const { error } = await supabase.from("tournament_store_products").insert({
      tournament_id: selectedTournament,
      name: template.name,
      description: template.description,
      price: template.default_price,
      image_url: template.image_url,
      category: template.category,
      vendor_name: template.vendor_name,
      vendor_url: template.vendor_url,
      template_id: template.id,
      is_active: true,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `"${template.name}" added to store` }); onQuickAdd(); }
    setAdding(null);
  };

  const openEdit = (t: ProductTemplate) => {
    setEditTemplate(t);
    setForm(getDefaults(t));
    setDialogOpen(true);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookTemplate className="h-5 w-5 text-secondary" />
          <h3 className="font-display font-bold text-foreground">Product Templates</h3>
          <span className="text-xs text-muted-foreground">Save reusable products & quick-add to any tournament</span>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setForm(getDefaults(null)); setEditTemplate(null); } }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editTemplate ? "Edit Template" : "New Product Template"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tournament Polo" required maxLength={200} /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Default Price ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: e.target.value })} placeholder="0.00" />
              </div>

              {/* Vendor / Source */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Store className="h-4 w-4 text-secondary" /> Vendor / Source</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="e.g. Nike, Local Shop" maxLength={200} /></div>
                  <div><Label>Vendor URL</Label><Input value={form.vendor_url} onChange={(e) => setForm({ ...form, vendor_url: e.target.value })} placeholder="https://vendor.com" maxLength={500} /></div>
                </div>
                <div className="mt-3">
                  <Label>Vendor Notes</Label>
                  <Textarea value={form.vendor_notes} onChange={(e) => setForm({ ...form, vendor_notes: e.target.value })} placeholder="Order lead time, contact info, min quantities..." rows={2} maxLength={500} />
                </div>
              </div>

              {/* Image */}
              <div>
                <Label>Image</Label>
                <div className="mt-2 flex items-center gap-4">
                  {form.image_url ? <img src={form.image_url} alt="" className="h-16 w-16 object-cover rounded border border-border bg-muted" /> : (
                    <div className="h-16 w-16 bg-muted rounded border border-dashed border-border flex items-center justify-center"><Image className="h-5 w-5 text-muted-foreground" /></div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                    </span>
                  </label>
                </div>
              </div>

              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details, sizes, etc." rows={2} maxLength={500} /></div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editTemplate ? "Update Template" : "Save Template"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No templates yet. Save your first reusable product above.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="border border-border rounded-lg p-3 bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                {t.image_url ? (
                  <img src={t.image_url} alt="" className="h-10 w-10 rounded object-cover border border-border flex-shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <BookTemplate className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabel(t.category)} · {fmt(t.default_price)}</p>
                  {t.vendor_name && <p className="text-xs text-secondary truncate mt-0.5">via {t.vendor_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border">
                <Button variant="default" size="sm" className="flex-1 h-7 text-xs" disabled={adding === t.id || !selectedTournament} onClick={() => handleQuickAdd(t)}>
                  {adding === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                  Quick Add
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete template?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete the "{t.name}" template.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

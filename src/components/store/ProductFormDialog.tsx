import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, Image } from "lucide-react";
import { categories, type Product } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editProduct: Product | null;
  selectedTournament: string;
  onSaved: () => void;
}

export default function ProductFormDialog({ open, onOpenChange, editProduct, selectedTournament, onSaved }: Props) {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(getDefaults(editProduct));

  function getDefaults(p: Product | null) {
    return p
      ? {
          name: p.name, description: p.description || "", price: p.price.toString(),
          image_url: p.image_url || "", category: p.category, is_active: p.is_active ?? true,
          purchase_url: p.purchase_url || "", vendor_name: p.vendor_name || "", vendor_url: p.vendor_url || "",
        }
      : {
          name: "", description: "", price: "", image_url: "", category: "merchandise",
          is_active: true, purchase_url: "", vendor_name: "", vendor_url: "",
        };
  }

  // Reset form when dialog opens with new product
  const handleOpenChange = (v: boolean) => {
    if (!v) setForm(getDefaults(null));
    onOpenChange(v);
  };

  // Sync form when editProduct changes
  if (open && editProduct && form.name !== editProduct.name) {
    setForm(getDefaults(editProduct));
  }

  const handleImageUpload = useCallback(async (file: File) => {
    if (!org || !selectedTournament) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${org.orgId}/${selectedTournament}/store/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    setUploading(false);
  }, [org, selectedTournament, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      tournament_id: selectedTournament,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      image_url: form.image_url || null,
      category: form.category,
      is_active: form.is_active,
      purchase_url: form.purchase_url.trim() || null,
      vendor_name: form.vendor_name.trim() || null,
      vendor_url: form.vendor_url.trim() || null,
    };
    if (editProduct) {
      const { error } = await supabase.from("tournament_store_products").update(payload).eq("id", editProduct.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Product updated" });
    } else {
      const { error } = await supabase.from("tournament_store_products").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Product added" });
    }
    setForm(getDefaults(null));
    handleOpenChange(false);
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tournament Polo" required maxLength={200} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price ($) *</Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" required />
            </div>
            <div className="flex items-end pb-2 gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} id="active-toggle" />
              <Label htmlFor="active-toggle" className="text-sm cursor-pointer">{form.is_active ? "Active" : "Inactive"}</Label>
            </div>
          </div>

          {/* Vendor / Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor / Source</Label>
              <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="e.g. Nike, Local Print Shop" maxLength={200} />
            </div>
            <div>
              <Label>Vendor URL</Label>
              <Input value={form.vendor_url} onChange={(e) => setForm({ ...form, vendor_url: e.target.value })} placeholder="https://vendor-site.com" maxLength={500} />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Product Image</Label>
            <div className="mt-2 flex items-center gap-4">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-16 w-16 object-cover rounded border border-border bg-muted" />
              ) : (
                <div className="h-16 w-16 bg-muted rounded border border-dashed border-border flex items-center justify-center">
                  <Image className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label>Purchase URL</Label>
            <Input value={form.purchase_url} onChange={(e) => setForm({ ...form, purchase_url: e.target.value })} placeholder="https://store.example.com/product" maxLength={500} />
            <p className="text-xs text-muted-foreground mt-1">Link to external store or checkout page</p>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product details, sizes available, etc." rows={2} maxLength={500} />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editProduct ? "Update Product" : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Plus, Trash2, Pencil, Save, X, Loader2, Upload, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PlatformProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface AdminStoreProps {
  products: PlatformProduct[];
  callAdminApi: (action: string, body?: Record<string, unknown>) => Promise<any>;
  onRefresh: () => Promise<void>;
}

export default function AdminStore({ products, callAdminApi, onRefresh }: AdminStoreProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // New product form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("merchandise");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `platform-store/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    return publicUrl;
  };

  const addProduct = async () => {
    if (!name.trim() || !price) return;
    setCreating(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
        setUploading(false);
        if (!imageUrl) { setCreating(false); return; }
      }
      await callAdminApi("add-platform-product", {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        category,
        image_url: imageUrl,
        sort_order: products.length,
      });
      setName(""); setDescription(""); setPrice(""); setCategory("merchandise"); setImageFile(null);
      await onRefresh();
      toast({ title: "Product added!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: PlatformProduct) => {
    setEditing(p.id);
    setEditName(p.name);
    setEditDescription(p.description || "");
    setEditPrice(p.price.toString());
    setEditCategory(p.category);
    setEditImageFile(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !editPrice) return;
    try {
      let imageUrl: string | undefined;
      if (editImageFile) {
        setUploading(true);
        const url = await uploadImage(editImageFile);
        setUploading(false);
        if (!url) return;
        imageUrl = url;
      }
      await callAdminApi("update-platform-product", {
        id,
        name: editName.trim(),
        description: editDescription.trim() || null,
        price: parseFloat(editPrice),
        category: editCategory,
        ...(imageUrl && { image_url: imageUrl }),
      });
      setEditing(null);
      await onRefresh();
      toast({ title: "Product updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await callAdminApi("toggle-platform-product", { id, is_active: !isActive });
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await callAdminApi("delete-platform-product", { id });
      await onRefresh();
      toast({ title: "Product deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const categories = ["merchandise", "apparel", "accessories", "food-beverage", "other"];

  return (
    <div className="space-y-6">
      {/* Add Product Form */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="font-display font-bold text-lg mb-4">Add New Product</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Product Name *" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Price *" type="number" step="0.01" min="0.50" value={price} onChange={e => setPrice(e.target.value)} />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
          <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          <div className="sm:col-span-2">
            <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <Button onClick={addProduct} disabled={creating || !name.trim() || !price} className="mt-3">
          {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          Add Product
        </Button>
      </div>

      {/* Product List */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="font-display font-bold text-lg mb-4">Platform Store Products ({products.length})</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">No products yet. Add your first product above.</p>
        ) : (
          <div className="space-y-3">
            {products.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(p => (
              <div key={p.id} className="border border-border rounded-lg p-4">
                {editing === p.id ? (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                      <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" step="0.01" placeholder="Price" />
                      <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-background">
                        {categories.map(c => <option key={c} value={c}>{c.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                      </select>
                      <Input type="file" accept="image/*" onChange={e => setEditImageFile(e.target.files?.[0] || null)} />
                    </div>
                    <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} placeholder="Description" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(p.id)} disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{p.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {p.is_active ? "Active" : "Hidden"}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">{p.category.replace(/-/g, " ")}</span>
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                      <p className="text-sm font-medium text-primary mt-1">${p.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => toggleActive(p.id, p.is_active)} title={p.is_active ? "Hide" : "Show"}>
                        {p.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

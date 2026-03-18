import { useEffect, useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShoppingBag, Trophy, Plus, Loader2, Trash2, Pencil, ExternalLink,
  Package, Tag, Store as StoreIcon,
} from "lucide-react";
import { type Product, type Tournament, categoryLabel, fmt } from "@/components/store/types";
import ProductFormDialog from "@/components/store/ProductFormDialog";
import TemplateLibrary from "@/components/store/TemplateLibrary";

const Store = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  const fetchProducts = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const { data } = await supabase
      .from("tournament_store_products")
      .select("*")
      .eq("tournament_id", selectedTournament)
      .order("sort_order", { ascending: true });
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [selectedTournament]);

  const handleOpenEdit = (product: Product) => {
    setEditProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    await supabase.from("tournament_store_products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Product removed" });
  };

  const handleToggleActive = async (product: Product) => {
    const newVal = !product.is_active;
    await supabase.from("tournament_store_products").update({ is_active: newVal }).eq("id", product.id);
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: newVal } : p));
  };

  const activeCount = products.filter((p) => p.is_active).length;

  if (loading && tournaments.length === 0) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to manage store products.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tournament Store</h1>
          <p className="text-muted-foreground mt-1">Manage merchandise and products for your tournament.</p>
        </div>
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[240px] bg-card">
            <Trophy className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total Products</span>
            <Package className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{products.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Active Listings</span>
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-display font-bold text-primary">{activeCount}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Categories</span>
            <Tag className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-display font-bold text-secondary">
            {new Set(products.map((p) => p.category)).size}
          </p>
        </motion.div>
      </div>

      {/* Template Library */}
      <TemplateLibrary selectedTournament={selectedTournament} onQuickAdd={fetchProducts} />

      {/* Add Button */}
      <div className="mb-6">
        <Button onClick={() => { setEditProduct(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />Add Product
        </Button>
      </div>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditProduct(null); }}
        editProduct={editProduct}
        selectedTournament={selectedTournament}
        onSaved={fetchProducts}
      />

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">Add merchandise and products for your tournament.</p>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add First Product</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow ${!product.is_active ? "opacity-60" : ""}`}
            >
              {product.image_url ? (
                <div className="aspect-video bg-muted">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-display font-bold text-foreground truncate">{product.name}</h4>
                  <span className="text-sm font-mono font-semibold text-primary whitespace-nowrap">
                    {fmt(product.price)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {categoryLabel(product.category)}
                  </span>
                  {!product.is_active && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                      Inactive
                    </span>
                  )}
                  {product.vendor_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                      <StoreIcon className="h-3 w-3" />
                      {product.vendor_name}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  {product.purchase_url && (
                    <a href={product.purchase_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {product.vendor_url && (
                    <a href={product.vendor_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-secondary transition-colors" title={`Visit ${product.vendor_name || "vendor"}`}>
                      <StoreIcon className="h-4 w-4" />
                    </a>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <Switch
                      checked={product.is_active ?? true}
                      onCheckedChange={() => handleToggleActive(product)}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove product?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{product.name}" from the store.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Store;

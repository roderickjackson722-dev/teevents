import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search, ShoppingCart, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmt } from "@/components/store/types";

interface PlatformProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_active: boolean;
  sort_order: number | null;
}

const categoryLabels: Record<string, string> = {
  merchandise: "Merchandise",
  apparel: "Apparel",
  accessories: "Accessories",
  "food-beverage": "Food & Beverage",
  signage: "Signage",
  other: "Other",
};

export default function PlatformProductsSection() {
  const { toast } = useToast();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("platform_store_products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setProducts((data as PlatformProduct[]) || []);
        setLoading(false);
      });
  }, []);

  const handlePurchase = async (product: PlatformProduct) => {
    setPurchasing(product.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      const { data, error } = await supabase.functions.invoke("create-platform-checkout", {
        body: { product_id: product.id, buyer_email: email },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const categories = [...new Set(products.map((p) => p.category))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Tournament Add On Store
        </h2>
        <p className="text-muted-foreground mt-1">
          Browse premium tournament products — signage, merchandise, and accessories to elevate your event.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
          >
            All ({products.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryLabels[cat] || cat} ({products.filter((p) => p.category === cat).length})
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No products match your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.4 }}
              className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow group"
            >
              {product.image_url ? (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-display font-bold text-foreground text-sm line-clamp-2">
                    {product.name}
                  </h4>
                  <span className="text-sm font-mono font-semibold text-primary whitespace-nowrap">
                    {fmt(product.price)}
                  </span>
                </div>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-2">
                  {categoryLabels[product.category] || product.category}
                </span>
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handlePurchase(product)}
                  disabled={purchasing === product.id}
                >
                  {purchasing === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                  )}
                  Purchase
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

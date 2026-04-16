import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search, ShoppingCart, ExternalLink, Truck, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmt } from "@/components/store/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import DirectorShopCheckoutModal from "@/components/store/DirectorShopCheckoutModal";
import { useSearchParams } from "react-router-dom";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [checkoutProduct, setCheckoutProduct] = useState<PlatformProduct | null>(null);
  const [purchaseVerified, setPurchaseVerified] = useState(false);
  const [verifiedProductName, setVerifiedProductName] = useState("");

  // Verify payment on return from Stripe
  useEffect(() => {
    const purchased = searchParams.get("purchased");
    const sessionId = searchParams.get("session_id");
    if (purchased === "true" && sessionId) {
      supabase.functions.invoke("verify-platform-purchase", {
        body: { session_id: sessionId },
      }).then(({ data }) => {
        if (data?.verified) {
          setPurchaseVerified(true);
          setVerifiedProductName(data.product_name || "your item");
        }
      }).catch(console.error).finally(() => {
        // Clean URL params
        searchParams.delete("purchased");
        searchParams.delete("session_id");
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, []);

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
      {/* Purchase success banner */}
      {purchaseVerified && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-200">Payment Confirmed!</p>
            <p className="text-sm text-green-800 dark:text-green-300">
              Your order for <strong>{verifiedProductName}</strong> has been received. Our team will contact you within 2 business days to confirm details.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Tournament Director Shop
        </h2>
        <p className="text-muted-foreground mt-1">
          Browse premium tournament products — signage, merchandise, and accessories to elevate your event.
        </p>
      </div>

      {/* Artwork disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-sm text-amber-900 dark:text-amber-200">
        <p className="font-bold mb-1.5">ARTWORK:</p>
        <p className="mb-2 leading-relaxed">
          After your order is placed, a representative will contact you within 2 business days to procure all sponsor event logos and creative direction necessary for product development and fulfillment. To maintain brand consistency, your selected products will be specifically designed to reflect and compliment the established logo branding for each sponsor.
        </p>
        <p className="mb-2">
          <span className="font-semibold">Preferred logo file formats:</span> Adobe Illustrator and CorelDraw (AI • EPS • SVG • CDR).{" "}
          <span className="font-semibold">Other acceptable file formats are high resolution:</span> (JPG • PNG • TIF)
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          If you are unable to provide each sponsor logo in one of the specified formats our art department can recreate the logo for a fee to ensure proper print quality. TeeVents is not liable for pixelated or blurry art reproduction caused by low resolution logos/graphics provided by the customer. Alternatively, you may opt to have the sponsor's name typed using plain text.
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
          {filtered.map((product, i) => {
            const isSignage = product.category === "signage";
            return (
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
                  {/* Shipping indicator */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Truck className="h-3 w-3" />
                    {isSignage ? (
                      <span>+$39.95 flat-rate shipping</span>
                    ) : (
                      <span>+$12.99 shipping</span>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mb-2">
                    6.25% sales tax calculated at checkout
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setCheckoutProduct(product)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Purchase
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FAQ Section */}
      <div className="mt-10 border-t border-border pt-8">
        <h3 className="text-lg font-display font-bold text-foreground mb-4">Frequently Asked Questions</h3>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="shipping">
            <AccordionTrigger className="text-sm font-semibold">Shipping</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Signage uses a flat rate of <strong>$39.95</strong> for standard ground shipping (UPS, FedEx, and USPS). All other products ship for <strong>$12.99</strong>.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="returns">
            <AccordionTrigger className="text-sm font-semibold">Returns &amp; Exchanges</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Generally, TeeVents does not accept any returns due to the nature of our business. Most items we sell are customized for the customer and therefore have no value to another person or business. In the event that a product is damaged or produced incorrectly or differently than the art proof, then we will gladly provide a refund for that product. Damaged products caused by shipping carriers do not qualify for a refund from TeeVents and should be filed with the carrier.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shipping-policy">
            <AccordionTrigger className="text-sm font-semibold">Shipping Policy &amp; Lead Times</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Lead times are <strong>two (2) business days</strong> for artwork and approval and <strong>ten (10) business days</strong> for production and shipping, which begins on the date the art proof is approved by the customer.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="custom-returns">
            <AccordionTrigger className="text-sm font-semibold">Can I return a custom/personalized sign or product?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              No, customized signage and/or products have no resale value since they are specific to a customer's event, tournament, golf course, school, person, etc. Therefore, we cannot accept returns on any product that has had a logo, text, graphic, photo or any type of personalization of any kind added to a standard/base product.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

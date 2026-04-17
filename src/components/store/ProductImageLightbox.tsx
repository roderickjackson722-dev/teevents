import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { fmt } from "@/components/store/types";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
}

interface Props {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductImageLightbox({ product, onClose, onAddToCart }: Props) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {product && (
          <div className="grid md:grid-cols-2">
            <div className="bg-muted flex items-center justify-center p-4 max-h-[70vh]">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground">No image available</div>
              )}
            </div>
            <div className="p-6 flex flex-col">
              <DialogTitle className="text-xl font-display font-bold mb-1">{product.name}</DialogTitle>
              <DialogDescription className="text-2xl font-mono font-semibold text-primary mb-4">
                {fmt(product.price)}
              </DialogDescription>
              {product.description && (
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 whitespace-pre-line">
                  {product.description}
                </p>
              )}
              <div className="mt-auto">
                <Button
                  className="w-full"
                  onClick={() => {
                    onAddToCart(product);
                    onClose();
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" /> Add to Cart
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

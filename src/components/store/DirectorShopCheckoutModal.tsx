import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string; price: number; category: string } | null;
}

export default function DirectorShopCheckoutModal({ open, onOpenChange, product }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setOrderNotes("");
    setLogoFile(null);
    setLogoPreview(null);
    setAcknowledged(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PNG, JPG, or SVG file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isValid = contactName.trim() && contactEmail.trim() && contactPhone.trim() && logoFile && acknowledged;

  const handleSubmit = async () => {
    if (!product || !isValid) return;
    setSubmitting(true);
    try {
      // Upload logo
      let logoUrl = "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `orders/${crypto.randomUUID()}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("director-shop-logos")
          .upload(path, logoFile, { contentType: logoFile.type });
        if (uploadErr) throw new Error("Logo upload failed: " + uploadErr.message);
        const { data: urlData } = supabase.storage.from("director-shop-logos").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      // Call checkout edge function
      const { data, error } = await supabase.functions.invoke("create-platform-checkout", {
        body: {
          product_id: product.id,
          buyer_email: contactEmail.trim(),
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          logo_url: logoUrl,
          order_notes: orderNotes.trim(),
        },
      });
      if (error) throw error;
      if (data?.url) {
        resetForm();
        onOpenChange(false);
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Order</DialogTitle>
          {product && (
            <p className="text-sm text-muted-foreground mt-1">{product.name}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>
            <div>
              <Label htmlFor="contact-name" className="text-xs">Full Name *</Label>
              <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <Label htmlFor="contact-email" className="text-xs">Email *</Label>
              <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div>
              <Label htmlFor="contact-phone" className="text-xs">Phone *</Label>
              <Input id="contact-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Upload Your Logo *</Label>
            <p className="text-xs text-muted-foreground">PNG, JPG, or SVG — max 5MB</p>
            {logoPreview ? (
              <div className="relative inline-block">
                <img src={logoPreview} alt="Logo preview" className="h-20 w-20 object-contain rounded border border-border" />
                <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Choose File
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="order-notes" className="text-xs">Additional Notes (optional)</Label>
            <Textarea id="order-notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions..." rows={3} />
          </div>

          {/* Acknowledgment */}
          <div className="flex items-start gap-2 rounded-lg border border-border p-3 bg-muted/30">
            <Checkbox id="ack-manual" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(!!v)} className="mt-0.5" />
            <Label htmlFor="ack-manual" className="text-xs leading-relaxed cursor-pointer">
              I understand that this order will be fulfilled manually by the TeeVents team. I will be contacted within 2 business days to confirm details.
            </Label>
          </div>

          <Button className="w-full" disabled={!isValid || submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Proceed to Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

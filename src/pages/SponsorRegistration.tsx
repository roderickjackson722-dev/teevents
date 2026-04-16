import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Award, CheckCircle, ExternalLink } from "lucide-react";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  benefits: string | null;
  display_order: number;
}

interface TournamentInfo {
  id: string;
  title: string;
  slug: string | null;
  organization_id: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const SponsorRegistrationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    description: "",
  });

  // Check for success redirect
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const sponsorSuccess = searchParams.get("sponsor_success");
    if (sponsorSuccess === "true" && sessionId) {
      setVerifying(true);
      supabase.functions.invoke("verify-sponsor-payment", {
        body: { session_id: sessionId },
      }).then(({ data, error }) => {
        if (data?.verified) {
          setVerified(true);
        } else {
          toast({ title: "Payment verification pending", description: "Your payment is being processed.", variant: "destructive" });
        }
        setVerifying(false);
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, title, slug, organization_id")
        .eq("slug", slug)
        .single();

      if (!t) { setLoading(false); return; }
      setTournament(t);

      const { data: tierData } = await supabase
        .from("sponsorship_tiers")
        .select("id, name, description, price_cents, benefits, display_order")
        .eq("tournament_id", t.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      setTiers((tierData as Tier[]) || []);
      if (tierData && tierData.length > 0) {
        const preselectedTier = searchParams.get("tier");
        const matchedTier = preselectedTier ? tierData.find((t: any) => t.id === preselectedTier) : null;
        setSelectedTier(matchedTier ? matchedTier.id : tierData[0].id);
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const handleLogoSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !tournament) return null;
    setUploading(true);
    const ext = logoFile.name.split(".").pop();
    const path = `sponsor-logos/${tournament.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, logoFile, { upsert: true });
    if (error) {
      toast({ title: "Logo upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return null;
    }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setUploading(false);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament || !selectedTier || !form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Upload logo if selected
    let logoUrl: string | null = null;
    if (logoFile) {
      logoUrl = await uploadLogo();
    }

    const { data, error } = await supabase.functions.invoke("create-sponsor-checkout", {
      body: {
        tournament_id: tournament.id,
        tier_id: selectedTier,
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        website_url: form.website_url || null,
        description: form.description || null,
        logo_url: logoUrl,
      },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    if (data?.checkout_url) {
      window.location.href = data.checkout_url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-xl p-8">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Thank You!</h1>
          <p className="text-muted-foreground mb-6">
            Your sponsorship for <strong>{tournament?.title}</strong> has been confirmed. The tournament organizer will be in touch with next steps.
          </p>
          <Button onClick={() => window.location.href = `/t/${slug}`}>
            Back to Tournament
          </Button>
        </div>
      </div>
    );
  }

  if (!tournament || tiers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-foreground mb-2">Sponsorship Not Available</h1>
          <p className="text-muted-foreground">Sponsorship registration is not currently open for this tournament.</p>
        </div>
      </div>
    );
  }

  const selected = tiers.find(t => t.id === selectedTier);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Award className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-display font-bold text-foreground">Become a Sponsor</h1>
          <p className="text-muted-foreground mt-1">{tournament.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tier Selection */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Select Your Sponsorship Level</h2>
            <div className="space-y-3">
              {tiers.map(tier => (
                <label
                  key={tier.id}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTier === tier.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="tier"
                      value={tier.id}
                      checked={selectedTier === tier.id}
                      onChange={() => setSelectedTier(tier.id)}
                      className="mt-1 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-foreground">{tier.name}</h3>
                        <span className="font-mono font-semibold text-primary">{fmt(tier.price_cents)}</span>
                      </div>
                      {tier.description && <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>}
                      {tier.benefits && (
                        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{tier.benefits}</div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Company Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  placeholder="ABC Corporation"
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Contact Name *</Label>
                <Input
                  value={form.contact_name}
                  onChange={e => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="John Smith"
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="john@abccorp.com"
                  required
                  maxLength={255}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={form.contact_phone}
                  onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  maxLength={20}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Website</Label>
                <Input
                  value={form.website_url}
                  onChange={e => setForm({ ...form, website_url: e.target.value })}
                  placeholder="https://www.abccorp.com"
                  maxLength={500}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Tell us about your company (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of your company..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Upload Your Logo</h2>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); }}
              />
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                {logoPreview ? (
                  <div className="flex items-center justify-center gap-4">
                    <img src={logoPreview} alt="" className="h-16 w-16 object-contain rounded" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{logoFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload your company logo</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — max 5MB</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Payment Summary & Submit */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-3">Payment Summary</h2>
            {selected && (
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{selected.name}</span>
                  <span className="font-mono">{fmt(selected.price_cents)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing fees</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono text-primary">{fmt(selected.price_cents)}</span>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={submitting || uploading || !selectedTier}>
              {(submitting || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Proceed to Payment
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Secure payment processed by Stripe. You'll be redirected to complete your payment.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SponsorRegistrationPage;

import { useEffect, useMemo, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/formatCurrency";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import { Loader2, Minus, Plus, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface AddonRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  max_per_golfer: number | null;
}

interface TournamentRow {
  id: string;
  title: string;
  slug: string | null;
  custom_slug: string | null;
  site_published: boolean | null;
  add_on_display_location: string | null;
  is_pro?: boolean | null;
  show_branding_footer?: boolean | null;
  branding_footer_admin_override?: boolean | null;
  branding_footer_admin_show?: boolean | null;
  branding_footer_custom_text?: string | null;
}

/** Falls back to parsing the URL when this page renders under a splat route (no typed slug param). */
function useAddonSlug() {
  const params = useParams<{ slug?: string; _splat?: string }>();
  if (params?.slug) return params.slug;
  const path = params?._splat || (typeof window !== "undefined" ? window.location.pathname : "");
  const parts = path.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "t" || p === "tournament");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  // /{slug}/add-ons style paths
  const addonIdx = parts.findIndex((p) => p === "add-ons");
  if (addonIdx > 0) return parts[addonIdx - 1];
  return "";
}

export default function PublicAddons() {
  const slug = useAddonSlug();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: t } = await (supabase.from("tournaments") as any)
        .select(
          "id, title, slug, custom_slug, site_published, add_on_display_location, is_pro, show_branding_footer, branding_footer_admin_override, branding_footer_admin_show, branding_footer_custom_text",
        )
        .or(`custom_slug.eq.${slug},slug.eq.${slug}`)
        .eq("site_published", true)
        .maybeSingle();
      if (cancelled) return;
      setTournament((t as TournamentRow) || null);
      if (t?.id) {
        const { data: rows } = await (supabase.from("tournament_registration_addons") as any)
          .select("id, name, description, price_cents, max_per_golfer")
          .eq("tournament_id", t.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (!cancelled) {
          const list = ((rows as AddonRow[]) || []).filter((a) => a.price_cents > 0);
          setAddons(list);
          // Deep link from emails/QR codes: /t/{slug}/add-ons?addon=<id> preselects it.
          if (typeof window !== "undefined") {
            const wanted = new URLSearchParams(window.location.search).get("addon");
            if (wanted && list.some((a) => a.id === wanted)) setCart((prev) => ({ ...prev, [wanted]: prev[wanted] || 1 }));
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Verify a completed purchase when returning from Stripe.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") !== "success") return;
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    (async () => {
      const { data } = await supabase.functions.invoke("verify-addon-order", {
        body: { session_id: sessionId, acct: params.get("acct") || undefined },
      });
      if ((data as any)?.verified) {
        setPurchased(true);
        setCart({});
      }
    })();
  }, []);

  const setQty = (id: string, qty: number) =>
    setCart((prev) => {
      const next = { ...prev };
      const clamped = Math.max(0, Math.min(50, qty));
      if (clamped === 0) delete next[id];
      else next[id] = clamped;
      return next;
    });

  const cartLines = useMemo(
    () =>
      addons
        .filter((a) => (cart[a.id] || 0) > 0)
        .map((a) => ({ addon: a, qty: cart[a.id] })),
    [addons, cart],
  );
  const subtotalCents = cartLines.reduce((sum, l) => sum + l.addon.price_cents * l.qty, 0);

  const checkout = async () => {
    if (!tournament) return;
    if (!buyerEmail.trim() || !buyerEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (cartLines.length === 0) {
      toast.error("Add at least one add-on to your cart");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-addon-checkout", {
        body: {
          tournament_id: tournament.id,
          buyer_name: buyerName.trim() || null,
          buyer_email: buyerEmail.trim(),
          items: cartLines.map((l) => ({ addon_id: l.addon.id, quantity: l.qty })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.url;
      if (!url) throw new Error("Could not start checkout");
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || "Checkout failed");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tournament not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This add-on page is not available.</p>
        </div>
      </div>
    );
  }

  const publicSlug = tournament.custom_slug || tournament.slug || slug;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            {tournament.title} — Add-Ons
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Enhance your tournament experience with these add-ons!
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {purchased && (
          <Card className="p-4 border-primary/40 bg-primary/5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Purchase confirmed!</p>
              <p className="text-sm text-muted-foreground">
                A confirmation email is on its way. Show it at check-in to claim your add-ons.
              </p>
            </div>
          </Card>
        )}

        {addons.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No add-ons are available for this tournament right now.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <a href={`/t/${publicSlug}`}>Back to tournament page</a>
            </Button>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {addons.map((a) => {
                const qty = cart[a.id] || 0;
                return (
                  <Card key={a.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{a.name}</span>
                          <Badge variant="secondary">{formatCents(a.price_cents)}</Badge>
                        </div>
                        {a.description && (
                          <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                        )}
                      </div>
                      {qty === 0 ? (
                        <Button onClick={() => setQty(a.id, 1)} className="shrink-0">
                          Add to Cart <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="icon" onClick={() => setQty(a.id, qty - 1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{qty}</span>
                          <Button variant="outline" size="icon" onClick={() => setQty(a.id, qty + 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold text-foreground">Your Cart</p>
              </div>
              {cartLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              ) : (
                <div className="space-y-1">
                  {cartLines.map((l) => (
                    <div key={l.addon.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {l.qty} × {l.addon.name}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCents(l.addon.price_cents * l.qty)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-border font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCents(subtotalCents)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Platform and processing fees are shown at checkout.
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="addon_name">Your Name</Label>
                  <Input
                    id="addon_name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="First and last name"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="addon_email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addon_email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={checkout}
                disabled={submitting || cartLines.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting…
                  </>
                ) : (
                  <>Proceed to Checkout — {formatCents(subtotalCents)}</>
                )}
              </Button>
            </Card>
          </>
        )}
      </main>

      <TeeventsFooter tournament={tournament} />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2, Sparkles, Globe, Users, Gavel, LayoutTemplate, Phone, Building2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useOrgContext } from "@/hooks/useOrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useTournamentAddons, type AddonKey } from "@/hooks/useTournamentAddons";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { createBrandingRemovalCheckout, verifyBrandingRemoval } from "@/lib/brandingRemoval.functions";

interface TournamentRow {
  id: string;
  title: string;
  date: string | null;
}

const ADDONS: { key: AddonKey; label: string; price: number; desc: string; icon: any }[] = [
  { key: "custom_domain", label: "Custom Domain", price: 99, desc: "Brand your tournament URL (golf.yourclub.com)", icon: Globe },
  { key: "unlimited_manual_entries", label: "Unlimited Manual Entries", price: 149, desc: "Free tier includes 10 — remove the cap.", icon: Users },
  { key: "auction_raffle", label: "Auction & Raffle", price: 149, desc: "Silent auction and 50/50 raffle with auto-draw", icon: Gavel },
  { key: "custom_event_page", label: "Custom Event Page Build Out", price: 99, desc: "Our team will work with you to build out a fully customized event page tailored to your tournament. This includes custom layout adjustments, color coordination, content placement, and branding to make your event page stand out. We'll handle the setup so you don't have to.", icon: LayoutTemplate },
  { key: "priority_support", label: "Priority Support", price: 99, desc: "Phone support, dedicated manager, 2-hr response", icon: Phone },
];
const BUNDLE_PRICE = 399;
const INDIVIDUAL_TOTAL = ADDONS.reduce((s, a) => s + a.price, 0);

const UpgradeFeaturesPage = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<AddonKey>>(new Set());
  const [wantsBundle, setWantsBundle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const addons = useTournamentAddons(selectedTournamentId);
  const [brandingRemoved, setBrandingRemoved] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);

  // Verify Stripe redirect
  useEffect(() => {
    const sid = searchParams.get("addon_session_id");
    if (!sid) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-addon-purchase", {
        body: { session_id: sid },
      });
      if (error || !data?.verified) {
        toast.error("Could not verify purchase. Please contact support.");
      } else {
        toast.success("Add-ons unlocked for this tournament!");
      }
      const next = new URLSearchParams(searchParams);
      next.delete("addon_session_id");
      next.delete("tournament_id");
      setSearchParams(next, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verify branding-removal Stripe redirect
  useEffect(() => {
    const sid = searchParams.get("branding_session_id");
    if (!sid) return;
    (async () => {
      try {
        const res: any = await verifyBrandingRemoval({ data: { sessionId: sid } });
        if (res?.verified) {
          setBrandingRemoved(true);
          toast.success("TeeVents branding removed for this tournament!");
        } else {
          toast.error("Payment not confirmed yet. Please contact support.");
        }
      } catch {
        toast.error("Could not verify the branding removal payment.");
      }
      const next = new URLSearchParams(searchParams);
      next.delete("branding_session_id");
      next.delete("tournament_id");
      setSearchParams(next, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("branding_canceled")) {
      toast.info("Checkout canceled");
      const next = new URLSearchParams(searchParams);
      next.delete("branding_canceled");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Current branding state for the selected tournament
  useEffect(() => {
    if (!selectedTournamentId) return;
    supabase
      .from("tournaments")
      .select("branding_removed")
      .eq("id", selectedTournamentId)
      .maybeSingle()
      .then(({ data }) => setBrandingRemoved(!!(data as any)?.branding_removed));
  }, [selectedTournamentId]);

  const handleBrandingPurchase = async () => {
    if (!selectedTournamentId) return toast.error("Pick a tournament first");
    setBrandingLoading(true);
    try {
      const res: any = await createBrandingRemovalCheckout({
        data: { tournamentId: selectedTournamentId, origin: window.location.origin },
      });
      if (res?.url) window.location.href = res.url;
    } catch (err: any) {
      toast.error(err?.message || "Could not start checkout");
    } finally {
      setBrandingLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("addon_canceled")) {
      toast.info("Checkout canceled");
      const next = new URLSearchParams(searchParams);
      next.delete("addon_canceled");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as TournamentRow[]) || [];
        setTournaments(rows);
        if (rows.length && !selectedTournamentId) setSelectedTournamentId(rows[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const toggle = (k: AddonKey) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelected(next);
    if (next.size > 0) setWantsBundle(false);
  };

  const toggleBundle = () => {
    const nb = !wantsBundle;
    setWantsBundle(nb);
    if (nb) setSelected(new Set());
  };

  const total = useMemo(() => {
    if (wantsBundle) return BUNDLE_PRICE;
    return Array.from(selected).reduce((s, k) => s + (ADDONS.find((a) => a.key === k)?.price ?? 0), 0);
  }, [selected, wantsBundle]);

  const handlePurchase = async () => {
    if (!selectedTournamentId) return toast.error("Pick a tournament first");
    const toPurchase = wantsBundle ? ["bundle"] : Array.from(selected);
    if (toPurchase.length === 0) return toast.error("Select at least one add-on");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-addons", {
        body: { tournament_id: selectedTournamentId, addons: toPurchase },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  const quota = addons.manualEntries;
  const quotaPct = quota.unlimited ? 100 : quota.totalLimit > 0 ? Math.min(100, (quota.used / quota.totalLimit) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Upgrade Features</h1>
        <p className="text-muted-foreground mt-1">
          Buy add-ons per tournament. One-time purchase, no subscription.
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-sm text-muted-foreground italic">
            No tournaments yet. Create one first, then come back to add features.
          </p>
        </div>
      ) : (
        <>
          {/* Tournament picker */}
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Applying add-ons to
            </label>
            <select
              className="mt-2 w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              value={selectedTournamentId ?? ""}
              onChange={(e) => {
                setSelectedTournamentId(e.target.value);
                setSelected(new Set());
                setWantsBundle(false);
              }}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.date ? `— ${t.date}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Manual entry usage */}
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground">Manual Entries</p>
                <p className="text-xs text-muted-foreground">
                  {quota.unlimited
                    ? "Unlimited manual entries unlocked"
                    : `You have used ${quota.used} of ${quota.totalLimit} free manual entries.`}
                  {quota.adminOverride > 0 && !quota.unlimited && (
                    <span className="ml-1">(includes {quota.adminOverride} admin-granted)</span>
                  )}
                </p>
              </div>
              {!quota.unlimited && quota.used >= quota.totalLimit && (
                <span className="text-xs font-semibold text-orange-600">Limit reached</span>
              )}
            </div>
            {!quota.unlimited && <Progress value={quotaPct} className="h-2" />}
            {!quota.unlimited && quota.used >= quota.totalLimit && (
              <p className="text-xs text-muted-foreground mt-3">
                You have used your 10 free manual entries. Additional manual entries will incur a 5% platform fee.
                Unlock unlimited entries below for a one-time $149.
              </p>
            )}
          </div>

          {/* Add-ons grid */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Add-on Features</h2>
            <ul className="space-y-3">
              {ADDONS.map((a) => {
                const owned = addons.hasAddon(a.key);
                const isChecked = selected.has(a.key);
                return (
                  <li
                    key={a.key}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      owned ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={owned || isChecked}
                      disabled={owned || wantsBundle}
                      onCheckedChange={() => toggle(a.key)}
                      className="mt-1"
                    />
                    <div className="flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-secondary/15 text-secondary">
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-semibold text-foreground text-sm">
                          {a.label}
                          {owned && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                              <Check className="h-3 w-3" /> Unlocked
                            </span>
                          )}
                        </p>
                        <p className="font-display font-bold text-foreground">${a.price}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Bundle */}
            <div
              className={`mt-4 rounded-lg border-2 p-4 flex items-start gap-3 cursor-pointer ${
                wantsBundle ? "border-secondary bg-secondary/10" : "border-secondary/40"
              }`}
              onClick={toggleBundle}
            >
              <Checkbox
                checked={addons.flags.bundle || wantsBundle}
                disabled={addons.flags.bundle}
                onCheckedChange={toggleBundle}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display font-bold text-foreground">Bundle — all add-ons</p>
                  <p className="font-display font-bold text-secondary text-lg">${BUNDLE_PRICE}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Includes every add-on. Save ${INDIVIDUAL_TOTAL - BUNDLE_PRICE} vs. individual purchase.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-display font-bold text-foreground text-lg">${total}</span>
              </p>
              <Button onClick={handlePurchase} disabled={loading || total === 0}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Purchase Selected Features
              </Button>
            </div>
          </div>

          {/* Branding removal */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">Remove TeeVents Branding — $99</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hides the TeeVents logo and tagline from your live leaderboard and mobile scoring pages.
                  One-time fee for this tournament.
                </p>
                {!brandingRemoved && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Currently showing: "TeeVents – The all-in-one platform for golf tournaments."
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch
                  checked={brandingRemoved}
                  disabled={brandingRemoved || brandingLoading}
                  onCheckedChange={(v) => { if (v) handleBrandingPurchase(); }}
                />
                {brandingRemoved ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <Check className="h-3 w-3" /> Branding removed
                  </span>
                ) : (
                  <Button size="sm" onClick={handleBrandingPurchase} disabled={brandingLoading}>
                    {brandingLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Remove for $99
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Running 5+ tournaments a year?</p>
                <p className="text-sm text-muted-foreground">Enterprise: unlimited events, white-label, dedicated manager.</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/enterprise-pricing">
                Enterprise <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default UpgradeFeaturesPage;

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, GraduationCap, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/formatCurrency";
import {
  COLLEGE_SCORING_CENTS,
  collegeScoringKey,
} from "@/lib/addonPricing";

const FEATURES = [
  "Unlimited divisions within your purchased tier (1–4)",
  "Team scoring — 5 players per team, best 4 scores count",
  "Up to 54 holes (3 rounds) per event, with per-round validation",
  "Fast Entry Mode with auto-tabbing for 100+ players",
  "Search and filter by team, player, or group",
  "Withdrawal (WD) and disqualification (DQ) statuses",
  "Live division and team standings as scores are entered",
  "Scoring staff logins with 6-digit passcodes (scoring access only)",
];

/** Dashboard → College Golf Scoring add-on detail & purchase page. */
const CollegeScoringAddon = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [title, setTitle] = useState("");
  const [paid, setPaid] = useState(false);
  const [ownedDivisions, setOwnedDivisions] = useState(0);
  const [divisions, setDivisions] = useState(1);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [discountCode, setDiscountCode] = useState("");

  const load = async () => {
    if (!tournamentId) return;
    const [{ data: t }, { data: prices }] = await Promise.all([
      (supabase.from("tournaments") as any)
        .select(
          "id, title, college_scoring_paid, college_scoring_divisions, college_scoring_divisions_purchased",
        )
        .eq("id", tournamentId)
        .maybeSingle(),
      supabase.from("admin_addon_pricing").select("addon_key, price_cents"),
    ]);
    setTitle(t?.title ?? "");
    setPaid(!!t?.college_scoring_paid);
    setOwnedDivisions(
      t?.college_scoring_divisions_purchased ?? t?.college_scoring_divisions ?? 0,
    );
    const map: Record<string, number> = {};
    for (const row of (prices as any[]) || []) map[row.addon_key] = row.price_cents;
    setOverrides(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // Confirm the Stripe redirect
  useEffect(() => {
    const sid = searchParams.get("addon_session_id");
    if (!sid) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-addon-purchase", {
        body: { session_id: sid },
      });
      if (error || !data?.verified) toast.error("Could not verify the purchase. Please contact support.");
      else toast.success("College Golf Scoring unlocked for this event!");
      const next = new URLSearchParams(searchParams);
      next.delete("addon_session_id");
      next.delete("tournament_id");
      setSearchParams(next, { replace: true });
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceCents = useMemo(
    () => overrides[collegeScoringKey(divisions)] ?? COLLEGE_SCORING_CENTS[divisions],
    [overrides, divisions],
  );

  const handlePurchase = async () => {
    if (!tournamentId) return;
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-addons", {
        body: {
          tournament_id: tournamentId,
          addons: ["college_scoring"],
          divisions,
          discount_code: discountCode.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message || "Could not start checkout");
    }
    setBuying(false);
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" /> College Golf Scoring
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-speed score validation and entry built for college events{title ? ` — ${title}` : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What's included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {paid ? (
        <Card className="border-primary/50">
          <CardContent className="py-6 space-y-3">
            <p className="font-semibold text-foreground inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> Unlocked for this event
              {ownedDivisions > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({ownedDivisions} division{ownedDivisions > 1 ? "s" : ""})
                </span>
              )}
            </p>
            <Button asChild size="sm">
              <Link to="/dashboard/college-scoring">
                Open College Golf Scoring <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose your divisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((d) => {
                const cents = overrides[collegeScoringKey(d)] ?? COLLEGE_SCORING_CENTS[d];
                const active = divisions === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDivisions(d)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      active ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {d} division{d > 1 ? "s" : ""}
                    </p>
                    <p className="font-display font-bold text-foreground text-lg">{formatCents(cents)}</p>
                  </button>
                );
              })}
            </div>

            <div className="max-w-xs">
              <Label htmlFor="addon-discount" className="text-xs">
                Discount code (optional)
              </Label>
              <Input
                id="addon-discount"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="TEEVENTS20"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Total:{" "}
                <span className="font-display font-bold text-foreground text-lg">
                  {formatCents(priceCents)}
                </span>{" "}
                one-time, this event
              </p>
              <Button onClick={handlePurchase} disabled={buying}>
                {buying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Purchase College Golf Scoring
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Payments are processed securely by Stripe. Pricing: 1 division $199, 2 divisions $375,
              3 divisions $550, 4 divisions $720.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CollegeScoringAddon;

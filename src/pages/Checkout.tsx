import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, BadgeDollarSign, BarChart3, Check, CreditCard, Gavel, Globe,
  GraduationCap, LayoutTemplate, Loader2, Lock, Megaphone, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createFlatRateCheckout } from "@/lib/flatRate.functions";
import { createBrandingRemovalCheckout } from "@/lib/brandingRemoval.functions";
import { COLLEGE_SCORING_CENTS, collegeScoringKey, dollars } from "@/lib/addonPricing";

type Flow = "free" | "flat_rate" | "branding_sponsor" | "addon" | "college_scoring";

interface CheckoutItem {
  slug: string;
  title: string;
  priceCents: number;
  unit: string;
  icon: any;
  flow: Flow;
  /** purchase-addons key for the `addon` flow */
  addonKey?: string;
  desc: string;
  features: string[];
}

/** Everything sellable from the pricing page, keyed by URL slug. */
export const CHECKOUT_ITEMS: Record<string, CheckoutItem> = {
  "no-cost-to-start": {
    slug: "no-cost-to-start",
    title: "No Cost To Start",
    priceCents: 0,
    unit: "to start",
    icon: Sparkles,
    flow: "free",
    desc: "The full tournament platform with a 5% platform fee per paid transaction. No upfront cost.",
    features: [
      "Full tournament management platform",
      "Branded tournament website & registration",
      "QR check-in, pairings, printables & payouts",
      "10 manual entries included",
    ],
  },
  "flat-rate-pro": {
    slug: "flat-rate-pro",
    title: "Flat-Rate Pro",
    priceCents: 39900,
    unit: "per event",
    icon: BadgeDollarSign,
    flow: "flat_rate",
    desc: "Pay once per tournament and we drop the 5% platform fee on every transaction.",
    features: ["No 5% platform fee", "Unlimited manual entries", "Unlimited transactions", "One-time, per event"],
  },
  "branding-removal": {
    slug: "branding-removal",
    title: "Branding Removal + Digital Sponsor",
    priceCents: 49900,
    unit: "per event",
    icon: Megaphone,
    flow: "branding_sponsor",
    desc: "Remove TeeVents branding and hand a title sponsor a turnkey digital package you can resell for $5k–$10k.",
    features: [
      "TeeVents logo & tagline hidden",
      'Custom "Presented by" text and logo',
      "Leaderboard & website placement",
      "Sponsor QR code, asset kit & outreach email",
    ],
  },
  "live-leaderboard": {
    slug: "live-leaderboard",
    title: "Live Leaderboard & Mobile Scoring",
    priceCents: 19900,
    unit: "per event",
    icon: BarChart3,
    flow: "addon",
    addonKey: "live_leaderboard",
    desc: "Real-time public leaderboard plus scoring from any phone for every group.",
    features: ["Live public leaderboard", "Mobile scoring — no app download", "QR scoring codes", "Monitor display view"],
  },
  "unlimited-manual-entries": {
    slug: "unlimited-manual-entries",
    title: "Unlimited Manual Entries",
    priceCents: 19900,
    unit: "per event",
    icon: Users,
    flow: "addon",
    addonKey: "unlimited_manual_entries",
    desc: "Remove the 10-entry cap on manual registrations, sponsors and side-event entries.",
    features: ["Unlimited manual players", "Unlimited manual sponsors", "Unlimited side-event entries"],
  },
  "auction-raffle": {
    slug: "auction-raffle",
    title: "Auction & Raffle",
    priceCents: 19900,
    unit: "per event",
    icon: Gavel,
    flow: "addon",
    addonKey: "auction_raffle",
    desc: "Silent auction and 50/50 raffle with mobile bidding and auto-draw at close.",
    features: ["Mobile bidding", "Raffle ticket sales", "Auto-draw at close"],
  },
  "custom-event-page": {
    slug: "custom-event-page",
    title: "Custom Event Page Build Out",
    priceCents: 19900,
    unit: "per event",
    icon: LayoutTemplate,
    flow: "addon",
    addonKey: "custom_event_page",
    desc: "Our team builds a fully customized event page — layout, colors, content placement and branding.",
    features: ["Done-for-you build", "Custom layout & colors", "Content placement & branding"],
  },
  "custom-domain": {
    slug: "custom-domain",
    title: "Custom Domain",
    priceCents: 9900,
    unit: "per event",
    icon: Globe,
    flow: "addon",
    addonKey: "custom_domain",
    desc: "Brand your tournament URL (e.g. golf.yourclub.com) instead of a teevents.golf link.",
    features: ["Your own domain", "SSL included", "We handle the setup"],
  },
  "college-scoring": {
    slug: "college-scoring",
    title: "College Golf Scoring & Leaderboard",
    priceCents: COLLEGE_SCORING_CENTS[1],
    unit: "per event",
    icon: GraduationCap,
    flow: "college_scoring",
    desc: "High-speed score validation and entry for college events — divisions, team rosters, live leaderboard and printables.",
    features: [
      "Mobile live scoring — no app download",
      "QR scoring codes & monitor leaderboard display",
      "Team rosters with custom counting scores",
      "Customizable printables & pairings templates",
    ],
  },
};

interface TournamentRow {
  id: string;
  title: string;
  date: string | null;
}

/**
 * Pricing-page checkout: the organizer lands here with the item they selected
 * already chosen, picks the tournament and pays with Stripe for that item —
 * instead of being dropped on a generic sign-up page.
 */
const Checkout = () => {
  const { item: slug = "" } = useParams<{ item: string }>();
  const [searchParams] = useSearchParams();
  const item = CHECKOUT_ITEMS[slug];

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [tournamentId, setTournamentId] = useState(searchParams.get("tournament_id") || "");
  const [divisions, setDivisions] = useState(1);
  const [discountCode, setDiscountCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setSignedIn(!!session);
      if (session?.user) {
        const { data: memberships } = await supabase
          .from("org_members")
          .select("organization_id")
          .eq("user_id", session.user.id);
        const orgIds = (memberships || []).map((m: any) => m.organization_id);
        if (orgIds.length) {
          const { data: rows } = await supabase
            .from("tournaments")
            .select("id, title, date")
            .in("organization_id", orgIds)
            .order("date", { ascending: false });
          const list = (rows || []) as TournamentRow[];
          setTournaments(list);
          setTournamentId((prev) => prev || upcomingFirst(list)[0]?.id || "");
        }
      }
      setCheckingAuth(false);
    })();
  }, []);

  const priceCents = useMemo(() => {
    if (!item) return 0;
    if (item.flow === "college_scoring") return COLLEGE_SCORING_CENTS[divisions];
    return item.priceCents;
  }, [item, divisions]);

  if (!item) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Item not found</h1>
          <Button asChild className="mt-6">
            <Link to="/plans">Back to pricing</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const startCheckout = async () => {
    if (item.flow === "free") return;
    if (!tournamentId) {
      toast.error("Select the tournament this purchase is for");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      if (item.flow === "flat_rate") {
        const res = await createFlatRateCheckout({ data: { tournamentId, origin } });
        if (res?.url) window.location.href = res.url;
      } else if (item.flow === "branding_sponsor") {
        const res = await createBrandingRemovalCheckout({
          data: { tournamentId, origin, returnPath: "/dashboard/upgrade" },
        });
        if (res?.url) window.location.href = res.url;
      } else {
        const addons = item.flow === "college_scoring" ? ["college_scoring"] : [item.addonKey];
        const { data, error } = await supabase.functions.invoke("purchase-addons", {
          body: {
            tournament_id: tournamentId,
            addons,
            divisions: item.flow === "college_scoring" ? divisions : undefined,
            discount_code: discountCode.trim() || undefined,
          },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        else throw new Error("Could not start checkout");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not start checkout");
    }
    setBusy(false);
  };

  const Icon = item.icon;

  return (
    <Layout>
      <SEO
        title={`Checkout — ${item.title} | TeeVents`}
        description={item.desc}
        path={`/checkout/${item.slug}`}
      />

      <section className="bg-primary pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/70 mb-3">Checkout</p>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">{item.title}</h1>
          <p className="text-primary-foreground/80 mt-3">{item.desc}</p>
        </div>
      </section>

      <section className="bg-primary/5 py-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-secondary" /> You selected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="font-display font-bold text-foreground text-2xl">
                    {priceCents === 0 ? "$0" : dollars(priceCents)}
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">{item.unit}</span>
                  </p>
                </div>

                <ul className="space-y-2">
                  {item.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {item.flow === "free" ? (
                  <Button asChild className="w-full">
                    <Link to="/get-started">
                      Create your account <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                ) : checkingAuth ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !signedIn ? (
                  <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign in to your organizer account to complete this purchase — we'll bring you right back to
                      this checkout.
                    </p>
                    <Button asChild className="w-full">
                      <Link to={`/get-started?redirect=/checkout/${item.slug}`}>
                        Sign in to continue <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Apply this purchase to</Label>
                      {tournaments.length === 0 ? (
                        <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                          You don't have a tournament yet.{" "}
                          <Link to="/dashboard/tournaments?new=1" className="text-primary underline">
                            Create one first
                          </Link>
                          , then come back to this checkout.
                        </div>
                      ) : (
                        <Select value={tournamentId} onValueChange={setTournamentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tournament" />
                          </SelectTrigger>
                          <SelectContent>
                            {upcomingFirst(tournaments).map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.title}
                                {t.date ? ` — ${t.date}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {item.flow === "college_scoring" && (
                      <div>
                        <Label className="text-xs">Divisions</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                          {[1, 2, 3, 4].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDivisions(d)}
                              className={`rounded-lg border p-3 text-left transition-colors ${
                                divisions === d
                                  ? "border-secondary bg-secondary/10"
                                  : "border-border hover:border-secondary/50"
                              }`}
                            >
                              <p className="text-xs font-semibold text-foreground">
                                {d} division{d > 1 ? "s" : ""}
                              </p>
                              <p className="font-display font-bold text-foreground">
                                {dollars(COLLEGE_SCORING_CENTS[d])}
                              </p>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Price key: {collegeScoringKey(divisions)}
                        </p>
                      </div>
                    )}

                    {(item.flow === "addon" || item.flow === "college_scoring") && (
                      <div className="max-w-xs">
                        <Label htmlFor="checkout-discount" className="text-xs">
                          Discount code (optional)
                        </Label>
                        <Input
                          id="checkout-discount"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          placeholder="TEEVENTS20"
                        />
                      </div>
                    )}

                    <Button
                      onClick={startCheckout}
                      disabled={busy || !tournamentId}
                      className="w-full"
                      size="lg"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay {dollars(priceCents)} with Stripe
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> 256-bit SSL
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> PCI Level 1 via Stripe
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <p className="text-center text-sm text-muted-foreground">
            Need something else?{" "}
            <Link to="/plans" className="text-primary underline">
              Back to pricing
            </Link>
          </p>
        </div>
      </section>
    </Layout>
  );
};

/** Upcoming events first; past events fall to the bottom of the picker. */
function upcomingFirst(list: TournamentRow[]): TournamentRow[] {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = list.filter((t) => (t.date || "9999") >= today).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const past = list.filter((t) => (t.date || "9999") < today).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return [...upcoming, ...past];
}

export default Checkout;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { computeFeeSplit, feeSplitLabel, type FeeSplit } from "@/lib/feeSplit";

const CHOICES: FeeSplit[] = ["player", "split", "organizer", "exact"];
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

type Props = {
  tournamentId: string;
  callAdminApi: (action?: string, body?: Record<string, unknown>) => Promise<any>;
};

export default function AdminFeeSplitSetting({ tournamentId, callAdminApi }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<FeeSplit>("player");
  const [choice, setChoice] = useState<FeeSplit>("player");
  const [noFeePlan, setNoFeePlan] = useState(false);
  const [rate, setRate] = useState(0.08);
  const [priceCents, setPriceCents] = useState(0);
  const [amount, setAmount] = useState("");
  const [savedPct, setSavedPct] = useState(8);
  const [pctInput, setPctInput] = useState("8");

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: t }, { data: tiers }] = await Promise.all([
        supabase.from("tournaments").select("fee_split, pricing_model, flat_rate_enabled, platform_fee_percent, registration_fee_cents").eq("id", tournamentId).maybeSingle() as any,
        supabase.from("tournament_registration_tiers").select("price_cents").eq("tournament_id", tournamentId).eq("is_active", true) as any,
      ]);
      if (!active) return;
      const split = (CHOICES.includes(t?.fee_split) ? t.fee_split : "player") as FeeSplit;
      setSaved(split); setChoice(split);
      setNoFeePlan(!!t?.flat_rate_enabled || ["per_event", "per_league", "enterprise"].includes(String(t?.pricing_model)));
      const pct = Number(t?.platform_fee_percent);
      const p0 = Number.isFinite(pct) && pct >= 0 && pct <= 20 ? pct : 8;
      setRate(p0 / 100); setSavedPct(p0); setPctInput(String(p0));
      const prices = [Number(t?.registration_fee_cents || 0), ...((tiers as any[]) || []).map((x) => Number(x.price_cents || 0))].filter((p) => p > 0);
      setPriceCents(prices.length ? Math.min(...prices) : 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [tournamentId]);

  async function save() {
    const p = Number(pctInput);
    if (!Number.isFinite(p) || p < 0 || p > 20) { toast.error("Enter a TeeVents fee between 0 and 20 percent."); return; }
    setSaving(true);
    try {
      await callAdminApi("set-fee-split", { tournament_id: tournamentId, fee_split: choice, platform_fee_percent: p });
      setSaved(choice); setSavedPct(p);
      toast.success("Fee setting saved. It applies to new registrations only.");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  if (noFeePlan) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground opacity-80">
        <div className="mb-1 flex items-center gap-2 font-medium"><DollarSign className="h-4 w-4" /> Checkout fee</div>
        No platform fee on this plan, so there is nothing to split.
      </div>
    );
  }

  const pctNum = Number(pctInput);
  const pctValid = pctInput.trim() !== "" && Number.isFinite(pctNum) && pctNum >= 0 && pctNum <= 20;
  const liveRate = pctValid ? pctNum / 100 : rate;
  const pct = Math.round(liveRate * 10000) / 100;
  const Preview = ({ c, small }: { c: FeeSplit; small?: boolean }) => {
    const r = computeFeeSplit(priceCents, liveRate, c);
    return (
      <div className={small ? "text-xs text-muted-foreground" : "text-sm"}>
        {small && <div className="font-medium">{feeSplitLabel(c, pct)}</div>}
        <div>Player pays at checkout: <strong>{money(r.charge)}</strong></div>
        <div>TeeVents fee ({pct}%): {money(r.teeFee)} — player {money(r.playerShare)}, organizer {money(r.organizerShare)}</div>
        <div>Stripe fee: {money(r.realStripe)}</div>
        <div>You receive, per registration: <strong>{money(r.organizerReceives)}</strong></div>
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><DollarSign className="h-4 w-4" /> Checkout fee (admin only)</div>
      <label className="flex flex-wrap items-center gap-2 text-sm">TeeVents platform fee for this event
        <input type="number" min="0" max="20" step="0.1" inputMode="decimal" value={pctInput} onChange={(e) => setPctInput(e.target.value)} className="w-20 rounded border border-input bg-background px-2 py-1" aria-label="TeeVents platform fee percent" />%
        <span className="text-xs text-muted-foreground">Default 8%. Stripe fee (2.9% + $0.30) is added on top.{savedPct !== 8 && ` Saved: ${savedPct}%.`}</span>
      </label>
      <div className="flex flex-col gap-1.5">
        {CHOICES.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name={`fee-split-${tournamentId}`} checked={choice === c} onChange={() => setChoice(c)} />
            {feeSplitLabel(c, pct)}{saved === c && <span className="text-xs text-muted-foreground">(saved)</span>}
          </label>
        ))}
      </div>
      {choice === "exact" && (() => {
        const cents = Math.round(Number(amount) * 100);
        const r = cents > 0 ? computeFeeSplit(cents, liveRate, "exact") : null;
        return (
          <div className="space-y-1 rounded-md border border-border bg-muted/30 p-2 text-sm">
            <label className="flex items-center gap-2 text-sm">Enter amount $
              <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="175.00" className="w-28 rounded border border-input bg-background px-2 py-1" aria-label="Enter amount" />
            </label>
            {r && (
              <div data-testid="exact-breakdown">
                <div className="text-xs text-muted-foreground">Preview for the {money(cents)} amount entered, per registration</div>
                <div>Customer pays at checkout: <strong>{money(r.charge)}</strong></div>
                <div>TeeVents fee, {pct}%: {money(r.teeFee)}</div>
                <div>Stripe fee, 2.9 percent plus 0.30 dollars: {money(r.realStripe)}</div>
                <div>Organizer receives: <strong>{money(r.organizerReceives)}</strong></div>
              </div>
            )}
          </div>
        );
      })()}
      {priceCents > 0 ? (
        <>
          <div className="text-xs text-muted-foreground">Preview for a {money(priceCents)} registration</div>
          <Preview c={choice} />
          <div className="grid gap-3 sm:grid-cols-2">
            {CHOICES.filter((c) => c !== choice).map((c) => <Preview key={c} c={c} small />)}
          </div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground">This event has no registration price yet, so there is no preview.</div>
      )}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={saving || !pctValid || (choice === saved && pctNum === savedPct)}>
          {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Save
        </Button>
        <span className="text-xs text-muted-foreground">Applies only to new registrations after saving.</span>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { computeFeeSplit, FEE_SPLIT_LABELS, type FeeSplit } from "@/lib/feeSplit";

const CHOICES: FeeSplit[] = ["player", "split", "organizer"];
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
      setRate(pct >= 0 && pct <= 20 ? pct / 100 : 0.08);
      const prices = [Number(t?.registration_fee_cents || 0), ...((tiers as any[]) || []).map((x) => Number(x.price_cents || 0))].filter((p) => p > 0);
      setPriceCents(prices.length ? Math.min(...prices) : 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [tournamentId]);

  async function save() {
    setSaving(true);
    try {
      await callAdminApi("set-fee-split", { tournament_id: tournamentId, fee_split: choice });
      setSaved(choice);
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

  const pct = Math.round(rate * 100);
  const Preview = ({ c, small }: { c: FeeSplit; small?: boolean }) => {
    const r = computeFeeSplit(priceCents, rate, c);
    return (
      <div className={small ? "text-xs text-muted-foreground" : "text-sm"}>
        {small && <div className="font-medium">{FEE_SPLIT_LABELS[c]}</div>}
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
      <div className="flex flex-col gap-1.5">
        {CHOICES.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name={`fee-split-${tournamentId}`} checked={choice === c} onChange={() => setChoice(c)} />
            {FEE_SPLIT_LABELS[c]}{saved === c && <span className="text-xs text-muted-foreground">(saved)</span>}
          </label>
        ))}
      </div>
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
        <Button size="sm" onClick={save} disabled={saving || choice === saved}>
          {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Save
        </Button>
        <span className="text-xs text-muted-foreground">Applies only to new registrations after saving.</span>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { TrendingUp, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoutingLog {
  id: string;
  created_at: string;
  context: string;
  routing_decision: string;
  gross_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  application_fee_cents: number;
  organizer_stripe_account_id: string | null;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const PlatformFeesPanel = ({ logs }: { logs: RoutingLog[] }) => {
  const stats = useMemo(() => {
    const dest = logs.filter((l) => l.routing_decision === "destination");
    const now = Date.now();
    const cleared = dest.filter((l) => now - new Date(l.created_at).getTime() > 7 * 86400000);
    const pending = dest.filter((l) => now - new Date(l.created_at).getTime() <= 7 * 86400000);
    const sumPlatform = (arr: RoutingLog[]) => arr.reduce((s, l) => s + (l.platform_fee_cents || 0), 0);
    const sumApp = (arr: RoutingLog[]) => arr.reduce((s, l) => s + (l.application_fee_cents || 0), 0);
    return {
      total: sumPlatform(dest),
      totalApp: sumApp(dest),
      cleared: sumPlatform(cleared),
      pending: sumPlatform(pending),
      pendingCount: pending.length,
      clearedCount: cleared.length,
      txCount: dest.length,
    };
  }, [logs]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            TeeVents Platform Fees (Stripe Connect)
          </h3>
          <p className="text-xs text-muted-foreground">
            Application fees collected on destination charges. Newly onboarded Connect accounts have a 2–7 day clearing window before funds appear in the TeeVents balance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-1.5"
        >
          <a href="https://dashboard.stripe.com/connect/application_fees" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            View in Stripe
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Total platform fee (5%)</p>
          <p className="text-xl font-bold text-foreground">{fmt(stats.total)}</p>
          <p className="text-[11px] text-muted-foreground">{stats.txCount} charges</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Total app fee (incl. Stripe)</p>
          <p className="text-xl font-bold text-foreground">{fmt(stats.totalApp)}</p>
          <p className="text-[11px] text-muted-foreground">platform fee + processing</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending clearance</p>
          <p className="text-xl font-bold text-amber-900">{fmt(stats.pending)}</p>
          <p className="text-[11px] text-amber-700">{stats.pendingCount} charges in 7-day window</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Cleared</p>
          <p className="text-xl font-bold text-emerald-900">{fmt(stats.cleared)}</p>
          <p className="text-[11px] text-emerald-700">{stats.clearedCount} charges &gt; 7 days old</p>
        </div>
      </div>
    </div>
  );
};

export default PlatformFeesPanel;

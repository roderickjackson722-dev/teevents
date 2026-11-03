import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { domainStage, domainExpiresAtMs, type DomainStage } from "@/lib/domainRenewal";

/** Shows the $99 web address renewal only when the address is due or archived. */
export function RenewDomainCard({ tournamentId, demoGuard }: { tournamentId: string; demoGuard?: () => boolean }) {
  const [stage, setStage] = useState<DomainStage>("none");
  const [expires, setExpires] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("custom_domain, date, end_date, custom_domain_expires_at")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setStage(domainStage(data as any));
        setExpires(domainExpiresAtMs(data as any));
      });
  }, [tournamentId]);

  if (stage !== "renewal_due" && stage !== "archived") return null;

  const renew = async () => {
    if (demoGuard?.()) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("purchase-addons", {
      body: { tournament_id: tournamentId, addons: ["custom_domain_renewal"] },
    });
    setBusy(false);
    if (err || data?.error || !data?.url) {
      setError("Could not start checkout. Please try again or contact support.");
      return;
    }
    window.location.href = data.url;
  };

  const dateLabel = expires ? new Date(expires).toLocaleDateString() : null;
  return (
    <div className="rounded-lg border-2 border-secondary bg-muted/40 p-4 space-y-3">
      <p className="font-semibold text-foreground">
        {stage === "archived" ? "Your web address has expired" : "Your web address is due for renewal"}
      </p>
      <p className="text-sm text-muted-foreground">
        {stage === "archived"
          ? "Visitors now go to your TeeVents event page. Renew to bring your custom web address back for one year."
          : `Your custom web address stays live until ${dateLabel ?? "its expiry date"}. Renew to keep it for one more year.`}
      </p>
      <Button variant="secondary" onClick={renew} disabled={busy}>
        {busy ? "Opening checkout..." : "Renew web address ($99)"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

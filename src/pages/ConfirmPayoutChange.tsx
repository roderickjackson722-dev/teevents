import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

interface RequestPreview {
  organization_name: string | null;
  change_type: string;
  old_value: string | null;
  requested_method: string | null;
  paypal_email: string | null;
  mailing_address: string | null;
  expires_at: string | null;
}

const friendlyMethod = (m: string | null) => {
  if (!m) return "—";
  if (m === "stripe") return "Stripe Connect";
  if (m === "paypal") return "PayPal";
  if (m === "check") return "Check by mail";
  return m;
};

export default function ConfirmPayoutChange() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RequestPreview | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This link is missing a token.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // GET-only preview: do NOT invoke the POST endpoint here, that would
        // apply the change before the organizer clicks "Confirm".
        const res = await fetch(
          `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/confirm-payout-change?token=${encodeURIComponent(token)}`,
          { headers: { "Content-Type": "application/json" } },
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          const msg = (json.error || "Could not validate this link") as string;
          if (/already been confirmed/i.test(msg)) {
            setAlreadyConfirmed(true);
          } else {
            throw new Error(msg);
          }
        } else {
          setPreview(json);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-payout-change", {
        body: { token },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Confirmation failed");
      setConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Confirm payout method change</CardTitle>
          </div>
          <CardDescription>
            Verify this change was requested by you before it takes effect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && !confirmed && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {!loading && preview && !confirmed && (
            <>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Organization:</span> <strong>{preview.organization_name || "—"}</strong></p>
                <p><span className="text-muted-foreground">Action:</span>{" "}
                  {preview.change_type === "remove_stripe"
                    ? <strong>Remove Stripe Connect payout account</strong>
                    : <strong>Switch payout method</strong>}
                </p>
                <p><span className="text-muted-foreground">Current:</span> {friendlyMethod(preview.old_value)}</p>
                <p><span className="text-muted-foreground">New:</span> {friendlyMethod(preview.requested_method)}</p>
                {preview.paypal_email && (
                  <p><span className="text-muted-foreground">PayPal email:</span> {preview.paypal_email}</p>
                )}
                {preview.mailing_address && (
                  <p><span className="text-muted-foreground">Mailing address:</span> {preview.mailing_address}</p>
                )}
              </div>
              <Button onClick={handleConfirm} disabled={confirming} className="w-full">
                {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm change
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                If you did not request this, close this page and contact{" "}
                <a className="underline" href="mailto:info@teevents.golf">info@teevents.golf</a>.
              </p>
            </>
          )}

          {confirmed && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-foreground">Payout method change confirmed</p>
              <p className="text-sm text-muted-foreground">
                Thanks for verifying. Your new payout method is now active and will be used for future payouts.
              </p>
              <Button asChild variant="outline">
                <Link to="/dashboard/payout-settings">Back to Payout Settings</Link>
              </Button>
            </div>
          )}

          {!loading && alreadyConfirmed && !confirmed && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-foreground">This change is already in place</p>
              <p className="text-sm text-muted-foreground">
                You've already confirmed this payout change from a previous email link, so there's nothing more to do here.
                You can review your current payout method any time in your dashboard.
              </p>
              <Button asChild variant="outline">
                <Link to="/dashboard/payout-settings">View Payout Settings</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

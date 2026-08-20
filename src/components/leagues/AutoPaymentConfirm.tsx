import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires the automatic league payment reconciliation the moment a payer returns from
 * Stripe Checkout (?pay=success&session_id=...), so the payment is marked paid and the
 * confirmation emails go out immediately — no manager action, no waiting on a webhook.
 * Mounted globally so it works on every return page (member portal, event register,
 * public league page, custom return URLs).
 */
export default function AutoPaymentConfirm() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pay") !== "success") return;
    fired.current = true;

    const sessionId = params.get("session_id") || undefined;
    let cancelled = false;

    const confirm = async (attempt = 0): Promise<void> => {
      try {
        const resp = await fetch("/api/public/league-payment-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
        });
        const data: any = await resp.json().catch(() => ({}));
        if (cancelled) return;
        if (data?.recovered || data?.emails) {
          toast.success("Payment confirmed — your confirmation email is on the way.");
          return;
        }
        // Stripe can lag a second or two behind the redirect; retry briefly.
        if (attempt < 3) {
          setTimeout(() => void confirm(attempt + 1), 2000 * (attempt + 1));
        }
      } catch {
        if (!cancelled && attempt < 3) {
          setTimeout(() => void confirm(attempt + 1), 2000 * (attempt + 1));
        }
      }
    };

    void confirm();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

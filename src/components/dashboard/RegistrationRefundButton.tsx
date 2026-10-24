import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { previewRegistrationRefund, confirmRegistrationRefund } from "@/lib/registrationRefund.functions";

type Quote = Awaited<ReturnType<typeof previewRegistrationRefund>>;
export const refundMoney = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function RefundFeeRecord({ breakdown }: { breakdown?: unknown }) {
  if (!breakdown || typeof breakdown !== "object") return null;
  const values = breakdown as Record<string, unknown>;
  const fields = ["refundAmountCents", "platformFeeKeptCents", "processingFeeKeptCents", "organizerCostCents"];
  if (!fields.every(field => typeof values[field] === "number")) return null;
  return <dl className="grid grid-cols-1 gap-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
    {["Refunded amount", "Platform fee kept", "Processing fee kept", "Original fees retained"].map((label, index) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{refundMoney(Number(values[fields[index]]))}</dd></div>)}
  </dl>;
}

export default function RegistrationRefundButton({ registrationId, requestId, amountCents, adminNotes, demoGuard, onRefund, label = "Approve & Refund", iconOnly = false, disabled = false }: {
  registrationId: string; requestId?: string; amountCents?: number; adminNotes?: string;
  demoGuard: () => boolean; onRefund: (fullyRefunded: boolean) => void | Promise<void>;
  label?: string; iconOnly?: boolean; disabled?: boolean;
}) {
  const preview = useServerFn(previewRegistrationRefund);
  const confirm = useServerFn(confirmRegistrationRefund);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const load = async (requestedAmount?: number) => {
    setLoading(true); setError(""); setQuote(null);
    try {
      const result = await preview({ data: { registrationId, requestId, amountCents: requestedAmount } });
      setQuote(result); setAmount((result.refundAmountCents / 100).toFixed(2));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not verify refund amounts."); }
    finally { setLoading(false); }
  };
  const issue = async () => {
    if (!quote || submitting || demoGuard()) return;
    setSubmitting(true); setError("");
    try {
      const result = await confirm({ data: { registrationId, requestId, amountCents: quote.refundAmountCents, quoteId: quote.quoteId, fingerprint: quote.fingerprint, adminNotes } });
      toast.success(result.succeeded ? "Refund processed successfully." : "Stripe refund is pending. Do not issue another refund.");
      setOpen(false); await onRefund(result.fullyRefunded);
    } catch (err) { setError(err instanceof Error ? err.message : "Refund could not be processed."); }
    finally { setSubmitting(false); }
  };
  const amountChanged = quote && Math.round(Number(amount) * 100) !== quote.refundAmountCents;
  return <>
    <Button variant={iconOnly ? "ghost" : "outline"} size={iconOnly ? "icon" : "sm"} title={iconOnly ? "Issue refund" : undefined} aria-label={iconOnly ? "Issue refund" : undefined} disabled={disabled} onClick={() => {
      if (demoGuard()) return;
      setOpen(true); void load(amountCents);
    }}><RotateCcw className="h-4 w-4" />{!iconOnly && label}</Button>
    <Dialog open={open} onOpenChange={value => { if (!submitting) setOpen(value); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl">
        <DialogHeader><DialogTitle>Confirm Refund</DialogTitle><DialogDescription>Review the verified amounts before issuing this refund.</DialogDescription></DialogHeader>
        {loading && <div className="flex items-center gap-2 py-4"><Loader2 className="h-4 w-4 animate-spin" />Verifying the original Stripe payment…</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {quote && <div className="space-y-4">
          <p className="font-medium">{quote.golferName}</p>
          <div className="space-y-2"><Label htmlFor={`refund-${registrationId}`}>Refund amount</Label><div className="flex flex-wrap gap-2">
            <Input id={`refund-${registrationId}`} type="number" min="0.01" max={quote.refundableCents / 100} step="0.01" value={amount} disabled={submitting} onChange={event => setAmount(event.target.value)} className="w-40" />
            {amountChanged && <Button variant="outline" disabled={submitting} onClick={() => void load(Math.round(Number(amount) * 100))}>Review amount</Button>}
          </div><p className="text-xs text-muted-foreground">Remaining registration amount: {refundMoney(quote.refundableCents)}</p></div>
          <p className="rounded-lg border border-secondary bg-secondary/10 p-4 text-sm leading-relaxed">
            Refunding this {refundMoney(quote.registrationAmountCents)} registration returns {refundMoney(quote.refundAmountCents)} to the golfer. TeeVents keeps its {refundMoney(quote.platformFeeKeptCents)} platform fee, and Stripe keeps its {refundMoney(quote.processingFeeKeptCents)} processing fee. Your cost for this refund is {refundMoney(quote.organizerCostCents)}.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{quote.feeScope} The refund cannot be undone.</p>
        </div>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={submitting} onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="secondary" disabled={!quote || loading || submitting || !!amountChanged} onClick={() => void issue()}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Confirm & Refund</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
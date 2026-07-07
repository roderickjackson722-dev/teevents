import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";

export type FeePaymentMethod = "deduct" | "instant";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  used: number;
  freeLimit: number;
  initialAmountCents: number;
  hasStripe?: boolean;
  onConfirm: (amountCents: number, method: FeePaymentMethod) => void | Promise<void>;
  submitting?: boolean;
}

export default function ManualEntryLimitModal({
  open, onOpenChange, used, freeLimit, initialAmountCents, hasStripe = true, onConfirm, submitting,
}: Props) {
  const [amountDollars, setAmountDollars] = useState<string>(((initialAmountCents || 0) / 100).toFixed(2));
  const [method, setMethod] = useState<FeePaymentMethod>("deduct");

  useEffect(() => {
    if (open) {
      setAmountDollars(((initialAmountCents || 0) / 100).toFixed(2));
      setMethod("deduct");
    }
  }, [open, initialAmountCents]);

  const amountCents = Math.max(0, Math.round(parseFloat(amountDollars || "0") * 100));
  const feeCents = Math.round(amountCents * 0.05);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Manual Entry Limit Reached
          </DialogTitle>
          <DialogDescription>
            You have used all {freeLimit} of your free manual entries for this tournament.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-1">
            <Label htmlFor="mem-amount">Transaction amount (USD)</Label>
            <Input
              id="mem-amount"
              type="number"
              min="0"
              step="0.01"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction amount</span>
              <span className="font-medium">${(amountCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">5% platform fee</span>
              <span className="font-semibold">${(feeCents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>How would you like to pay the fee?</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as FeePaymentMethod)}>
              <label className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${method === "deduct" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="deduct" id="mem-deduct" className="mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Deduct from next Stripe transaction <span className="text-xs text-muted-foreground">(recommended)</span></div>
                  <div className="text-muted-foreground text-xs">No upfront cost. The fee will be deducted from your next online payout.</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${method === "instant" ? "border-primary bg-primary/5" : "border-border"} ${!hasStripe ? "opacity-50 cursor-not-allowed" : ""}`}>
                <RadioGroupItem value="instant" id="mem-instant" className="mt-0.5" disabled={!hasStripe} />
                <div className="text-sm">
                  <div className="font-medium">Pay now via Stripe</div>
                  <div className="text-muted-foreground text-xs">
                    Pay the ${(feeCents / 100).toFixed(2)} fee immediately via Stripe Checkout.
                    {!hasStripe && " Requires a connected Stripe account."}
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(amountCents, method)}
            disabled={submitting || (method === "instant" && !hasStripe)}
          >
            Confirm & Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

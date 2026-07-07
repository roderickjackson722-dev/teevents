import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  used: number;
  freeLimit: number;
  initialAmountCents: number;
  hasStripe?: boolean;
  onConfirm: (amountCents: number) => void | Promise<void>;
  submitting?: boolean;
}

export default function ManualEntryLimitModal({
  open, onOpenChange, used, freeLimit, initialAmountCents, hasStripe = true, onConfirm, submitting,
}: Props) {
  const [amountDollars, setAmountDollars] = useState<string>(((initialAmountCents || 0) / 100).toFixed(2));

  useEffect(() => {
    if (open) setAmountDollars(((initialAmountCents || 0) / 100).toFixed(2));
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
            You have used {used} of your {freeLimit} free manual entries for this tournament.
          </DialogDescription>
        </DialogHeader>

        {!hasStripe ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            You have used your free manual entries. To add more, you need to connect a Stripe account so
            the 5% platform fee can be collected.
          </div>
        ) : (
          <div className="space-y-3 py-2 text-sm">
            <p>
              Additional manual entries incur a <strong>5% platform fee</strong> based on the transaction
              amount. The fee will be netted from your next Stripe payout.
            </p>
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
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">5% platform fee</span>
              <span className="font-semibold">${(feeCents / 100).toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(amountCents)}
            disabled={submitting || !hasStripe}
          >
            Confirm & Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

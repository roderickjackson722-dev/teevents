import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Loader2 } from "lucide-react";

export type PaymentOverride = "default" | "force_stripe" | "force_platform";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: any | null;
  onSavePaymentOverride: (id: string, value: PaymentOverride) => Promise<void>;
  onTogglePublicSearch: (id: string, value: boolean) => Promise<void>;
  onToggleManagedByTeevents: (id: string, value: boolean) => Promise<void>;
}

export default function AdminTournamentEditModal({
  open, onOpenChange, tournament,
  onSavePaymentOverride, onTogglePublicSearch, onToggleManagedByTeevents,
}: Props) {
  const [override, setOverride] = useState<PaymentOverride>("default");
  const [publicSearch, setPublicSearch] = useState(false);
  const [managed, setManaged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tournament) {
      setOverride((tournament.payment_method_override as PaymentOverride) || "default");
      setPublicSearch(!!tournament.show_in_public_search);
      setManaged(!!tournament.managed_by_teevents);
    }
  }, [tournament]);

  if (!tournament) return null;

  const stripeConnected = !!tournament.organizations?.stripe_account_id;
  const usingDefaultPlatform = override === "default" && !stripeConnected;
  const willError = override === "force_stripe" && !stripeConnected;

  const handleSave = async () => {
    setSaving(true);
    try {
      const tasks: Promise<any>[] = [];
      if (override !== (tournament.payment_method_override || "default")) {
        tasks.push(onSavePaymentOverride(tournament.id, override));
      }
      if (publicSearch !== !!tournament.show_in_public_search) {
        tasks.push(onTogglePublicSearch(tournament.id, publicSearch));
      }
      if (managed !== !!tournament.managed_by_teevents) {
        tasks.push(onToggleManagedByTeevents(tournament.id, managed));
      }
      await Promise.all(tasks);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{tournament.title}</span>
            <span className="text-muted-foreground"> · {tournament.organizations?.name || "—"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Payout / Stripe status */}
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="font-medium mb-1">Organizer payout status</div>
            {stripeConnected ? (
              <div className="text-primary text-xs">✅ Stripe Connect connected ({tournament.organizations?.stripe_account_id})</div>
            ) : (
              <div className="text-amber-700 text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No Stripe account — funds will be held by TeeVents until connected.
              </div>
            )}
          </div>

          {/* Payment routing override */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Payment Method for This Event</Label>
            <RadioGroup value={override} onValueChange={(v) => setOverride(v as PaymentOverride)}>
              <div className="flex items-start gap-2 py-1">
                <RadioGroupItem value="default" id="pm-default" className="mt-0.5" />
                <Label htmlFor="pm-default" className="font-normal cursor-pointer leading-tight">
                  <span className="font-medium">Use organizer's default</span>
                  <span className="block text-xs text-muted-foreground">Stripe if connected, otherwise TeeVents escrow.</span>
                </Label>
              </div>
              <div className="flex items-start gap-2 py-1">
                <RadioGroupItem value="force_stripe" id="pm-stripe" className="mt-0.5" />
                <Label htmlFor="pm-stripe" className="font-normal cursor-pointer leading-tight">
                  <span className="font-medium">Force Stripe (organizer)</span>
                  <span className="block text-xs text-muted-foreground">Registration will fail if organizer has no Stripe.</span>
                </Label>
              </div>
              <div className="flex items-start gap-2 py-1">
                <RadioGroupItem value="force_platform" id="pm-platform" className="mt-0.5" />
                <Label htmlFor="pm-platform" className="font-normal cursor-pointer leading-tight">
                  <span className="font-medium">Force TeeVents platform (escrow)</span>
                  <span className="block text-xs text-muted-foreground">Always route to TeeVents account; pay organizer manually later.</span>
                </Label>
              </div>
            </RadioGroup>

            {willError && (
              <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> Organizer has no Stripe — registrations will fail with this setting.
              </div>
            )}
            {usingDefaultPlatform && (
              <div className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> Using default — funds will be held by TeeVents.
              </div>
            )}
          </div>

          {/* Public search */}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Show on public search</Label>
              <p className="text-xs text-muted-foreground">Appears at /tournaments/search.</p>
            </div>
            <Switch checked={publicSearch} onCheckedChange={setPublicSearch} />
          </div>

          {/* Managed by TeeVents */}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Managed by TeeVents</Label>
              <p className="text-xs text-muted-foreground">Internal flag; flags this event under TeeVents Managed Tournaments.</p>
            </div>
            <Switch checked={managed} onCheckedChange={setManaged} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // Admin payout override state
  const [poEnabled, setPoEnabled] = useState(false);
  const [poMethod, setPoMethod] = useState<"stripe" | "paypal" | "check">("stripe");
  const [poPaypalEmail, setPoPaypalEmail] = useState("");
  const [poMailingAddress, setPoMailingAddress] = useState("");
  const [poReason, setPoReason] = useState("");
  const [poAck, setPoAck] = useState(false);
  const [poSaving, setPoSaving] = useState(false);
  const [poCurrentMethod, setPoCurrentMethod] = useState<string | null>(null);

  useEffect(() => {
    if (tournament) {
      setOverride((tournament.payment_method_override as PaymentOverride) || "default");
      setPublicSearch(!!tournament.show_in_public_search);
      setManaged(!!tournament.managed_by_teevents);
      setPoEnabled(false);
      setPoReason("");
      setPoAck(false);
      // Best-effort: read current preferred payout method
      const orgId = tournament.organizations?.id || tournament.organization_id;
      if (orgId) {
        supabase
          .from("organization_payout_methods")
          .select("preferred_method")
          .eq("organization_id", orgId)
          .maybeSingle()
          .then(({ data }) => setPoCurrentMethod((data as any)?.preferred_method || null));
      }
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

          {/* Admin Payout Override */}
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <Label className="text-sm font-semibold">Admin Payout Override</Label>
              </div>
              <Switch checked={poEnabled} onCheckedChange={setPoEnabled} />
            </div>
            <p className="text-xs text-muted-foreground">
              Force-change this organization's payout method. Bypasses the email confirmation flow.
              Logged to the admin override audit table. Use only when the organizer has lost access.
            </p>

            {poEnabled && (
              <div className="space-y-3 pt-1">
                <div className="text-xs text-muted-foreground">
                  Current method: <strong className="text-foreground">{poCurrentMethod || "—"}</strong>
                </div>

                <RadioGroup value={poMethod} onValueChange={(v) => setPoMethod(v as any)}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="stripe" id="po-stripe" />
                    <Label htmlFor="po-stripe" className="font-normal cursor-pointer text-sm">
                      Stripe Connect (organizer must already be connected)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="paypal" id="po-paypal" />
                    <Label htmlFor="po-paypal" className="font-normal cursor-pointer text-sm">PayPal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="check" id="po-check" />
                    <Label htmlFor="po-check" className="font-normal cursor-pointer text-sm">Check by mail</Label>
                  </div>
                </RadioGroup>

                {poMethod === "paypal" && (
                  <div>
                    <Label className="text-xs">PayPal email</Label>
                    <Input
                      type="email"
                      value={poPaypalEmail}
                      onChange={(e) => setPoPaypalEmail(e.target.value)}
                      placeholder="organizer@example.com"
                    />
                  </div>
                )}

                {poMethod === "check" && (
                  <div>
                    <Label className="text-xs">Mailing address</Label>
                    <Textarea
                      value={poMailingAddress}
                      onChange={(e) => setPoMailingAddress(e.target.value)}
                      rows={2}
                      placeholder="123 Main St, City, ST 00000"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Reason for override (required)</Label>
                  <Textarea
                    value={poReason}
                    onChange={(e) => setPoReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Organizer lost access to their Stripe account; switching to check per their phone request 2026-04-23."
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox id="po-ack" checked={poAck} onCheckedChange={(c) => setPoAck(c === true)} />
                  <label htmlFor="po-ack" className="text-xs text-muted-foreground cursor-pointer">
                    I understand this overrides the organizer's settings and bypasses email confirmation.
                  </label>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  disabled={poSaving || !poReason.trim() || !poAck}
                  onClick={async () => {
                    const orgId = tournament.organizations?.id || tournament.organization_id;
                    if (!orgId) { toast.error("Missing organization id"); return; }
                    setPoSaving(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("admin-payout-override", {
                        body: {
                          organization_id: orgId,
                          new_method: poMethod,
                          paypal_email: poMethod === "paypal" ? poPaypalEmail : null,
                          mailing_address: poMethod === "check" ? poMailingAddress : null,
                          reason: poReason,
                        },
                      });
                      if (error || data?.error) throw new Error(data?.error || error?.message);
                      toast.success("Payout method overridden and organizer notified.");
                      setPoEnabled(false);
                      setPoReason("");
                      setPoAck(false);
                      setPoCurrentMethod(poMethod);
                    } catch (e) {
                      toast.error((e as Error).message || "Override failed");
                    } finally {
                      setPoSaving(false);
                    }
                  }}
                >
                  {poSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Apply Override
                </Button>
              </div>
            )}
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

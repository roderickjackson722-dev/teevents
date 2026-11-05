import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendRegistrationPaymentLink } from "@/lib/registrationPayment.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export type PartnerRequestLite = { id: string; first_name: string; last_name: string; email: string; phone: string; team_size: number };
type Reg = { id: string; first_name: string; last_name: string; email: string; group_id: string | null; payment_status: string | null };

/**
 * Organizer-only: adds one partner-request person to a chosen roster player's team
 * as Pending, then emails them the existing payment link for that same entry.
 */
export default function PartnerMatchDialog({ tournamentId, request, onClose, onMatched }: {
  tournamentId: string;
  request: PartnerRequestLite | null;
  onClose: () => void;
  onMatched: (requestId: string) => void;
}) {
  const sendLink = useServerFn(sendRegistrationPaymentLink);
  const [step, setStep] = useState<1 | 2>(1);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request) return;
    setStep(1); setTargetId(""); setSearch("");
    Promise.all([
      supabase.from("tournament_registrations").select("id, first_name, last_name, email, group_id, payment_status").eq("tournament_id", tournamentId).order("last_name"),
      supabase.from("tournaments").select("registration_fee_cents").eq("id", tournamentId).maybeSingle(),
    ]).then(([r, t]) => {
      setRegs((r.data as Reg[]) || []);
      setAmount((((t.data as any)?.registration_fee_cents || 0) / 100).toFixed(2));
    });
  }, [request, tournamentId]);

  const groupCounts = useMemo(() => {
    const c: Record<string, number> = {};
    regs.forEach((r) => { if (r.group_id) c[r.group_id] = (c[r.group_id] || 0) + 1; });
    return c;
  }, [regs]);
  const teamSize = request?.team_size || 2;
  const candidates = regs.filter((r) => {
    const size = r.group_id ? groupCounts[r.group_id] : 1;
    if (size >= teamSize) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(q);
  });
  const target = regs.find((r) => r.id === targetId);

  const confirm = async () => {
    if (!request || !target) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 50) { toast.error("Enter a payment amount of at least $0.50."); return; }
    setBusy(true);
    try {
      let groupId = target.group_id;
      if (!groupId) {
        const { data: g, error: gErr } = await (supabase as any).from("registration_groups")
          .insert({ tournament_id: tournamentId, group_name: `${target.last_name} Team` }).select("id").single();
        if (gErr || !g) throw new Error(gErr?.message || "Couldn't create the team");
        groupId = g.id as string;
        const { error: uErr } = await supabase.from("tournament_registrations").update({ group_id: groupId, group_leader: true } as any).eq("id", target.id);
        if (uErr) throw uErr;
      }
      const { data: added, error } = await supabase.from("tournament_registrations").insert({
        tournament_id: tournamentId,
        first_name: request.first_name,
        last_name: request.last_name,
        email: request.email.trim().toLowerCase(),
        phone: request.phone || null,
        payment_method: "online",
        payment_status: "pending",
        cash_payment_received: false,
        custom_answers: [],
        group_id: groupId,
        group_leader: false,
      } as any).select("id").single();
      if (error || !added) throw new Error(error?.message || "Couldn't add the player");
      await supabase.from("tournament_partner_requests").update({ status: "matched" }).eq("id", request.id);
      try {
        await sendLink({ data: { registrationId: added.id, recipientEmail: request.email, amountCents: cents, origin: window.location.origin } });
        toast.success(`${request.first_name} added to ${target.first_name} ${target.last_name}'s team as Pending. Payment link sent.`);
      } catch (e) {
        toast.error(`Added as Pending, but the payment link didn't send: ${e instanceof Error ? e.message : "try again from the roster"}`);
      }
      onMatched(request.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Choose a partner" : "Confirm partner match"}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Pick the roster player ${request?.first_name} ${request?.last_name} should join. Only teams with an open spot are shown.`
              : "Review before adding. You can go back if this isn't right."}
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-3">
            <Input placeholder="Search roster by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-md">
              {candidates.length === 0 && <p className="p-3 text-sm text-muted-foreground">No players with an open spot.</p>}
              {candidates.map((r) => (
                <button key={r.id} type="button" onClick={() => setTargetId(r.id)}
                  className={`w-full text-left p-3 text-sm hover:bg-muted ${targetId === r.id ? "bg-muted font-semibold" : ""}`}>
                  {r.first_name} {r.last_name}
                  <span className="block text-xs text-muted-foreground">{r.email} · {r.group_id ? `${groupCounts[r.group_id]} of ${teamSize} on team` : "Single registrant"} · {r.payment_status || "pending"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p><strong>{request?.first_name} {request?.last_name}</strong> will join <strong>{target?.first_name} {target?.last_name}</strong>'s team.</p>
            <p>They'll show on the roster as <strong>Pending</strong> until they pay, and a payment link for this same entry will be emailed to <strong>{request?.email}</strong>.</p>
            <div className="space-y-1">
              <Label htmlFor="partner-amount">Payment amount ($)</Label>
              <Input id="partner-amount" type="number" min="0.5" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={!targetId} onClick={() => setStep(2)}>Next</Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={() => setStep(1)}>Back</Button>
              <Button disabled={busy} onClick={confirm}>{busy ? "Adding…" : "Confirm and add"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

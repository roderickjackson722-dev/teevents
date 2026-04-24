import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Mail, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

interface Participant {
  id: string;
  trip_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_organizer: boolean;
  created_at: string;
}

interface Payment {
  participant_id: string | null;
  amount_cents: number;
  status: string;
  paid_at: string | null;
}

export default function AdminTripParticipantsDialog({
  tripId,
  tripTitle,
  shareToken,
  open,
  onOpenChange,
}: {
  tripId: string | null;
  tripTitle: string;
  shareToken: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const load = async () => {
    if (!tripId) return;
    setLoading(true);
    const [pRes, payRes] = await Promise.all([
      supabase
        .from("trip_participants")
        .select("id, trip_id, name, email, phone, is_organizer, created_at")
        .eq("trip_id", tripId)
        .order("created_at"),
      supabase
        .from("trip_payments")
        .select("participant_id, amount_cents, status, paid_at")
        .eq("trip_id", tripId),
    ]);
    setParticipants(pRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && tripId) load();
  }, [open, tripId]);

  const addParticipant = async () => {
    if (!tripId || !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("trip_participants").insert({
      trip_id: tripId,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    });
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ name: "", email: "", phone: "" });
    toast.success("Participant added");
    load();
  };

  const removeParticipant = async (id: string) => {
    if (!confirm("Remove this participant from the trip?")) return;
    const { error } = await supabase.from("trip_participants").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Participant removed");
    load();
  };

  const resendInvite = (p: Participant) => {
    if (!p.email) {
      toast.error("No email on file for this participant");
      return;
    }
    if (!shareToken) {
      toast.error("Trip has no share link yet");
      return;
    }
    const url = `${window.location.origin}/trips/public/${shareToken}`;
    const subject = encodeURIComponent(`You're invited: ${tripTitle}`);
    const body = encodeURIComponent(
      `Hi ${p.name},\n\nYou're invited to join ${tripTitle}.\n\nView trip details and confirm your spot here:\n${url}\n\nSee you there!`,
    );
    window.location.href = `mailto:${p.email}?subject=${subject}&body=${body}`;
    toast.success("Invite email opened");
  };

  const paymentFor = (participantId: string) => {
    const paid = payments.find((p) => p.participant_id === participantId && p.status === "succeeded");
    if (paid) return { state: "paid" as const, payment: paid };
    const pending = payments.find((p) => p.participant_id === participantId && p.status === "pending");
    if (pending) return { state: "pending" as const, payment: pending };
    return { state: "unpaid" as const, payment: null };
  };

  const totalPaidCents = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Participants — {tripTitle}</DialogTitle>
          <DialogDescription>
            Add or remove participants, resend invite emails, and view payment status.
          </DialogDescription>
        </DialogHeader>

        {/* Add participant */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-2 p-3 border rounded-lg bg-muted/30">
          <Input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Button onClick={addParticipant} disabled={adding}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Add
              </>
            )}
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <span>
            <strong>{participants.length}</strong> participants
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <strong>${(totalPaidCents / 100).toFixed(2)}</strong> collected
          </span>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No participants yet. Add one above.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium">Name</th>
                  <th className="p-2 font-medium">Email</th>
                  <th className="p-2 font-medium">Payment</th>
                  <th className="p-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const status = paymentFor(p.id);
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">
                        <div className="font-medium flex items-center gap-2">
                          {p.name}
                          {p.is_organizer && (
                            <Badge variant="secondary" className="text-[10px]">
                              organizer
                            </Badge>
                          )}
                        </div>
                        {p.phone && (
                          <div className="text-xs text-muted-foreground">{p.phone}</div>
                        )}
                      </td>
                      <td className="p-2 text-xs">{p.email || "—"}</td>
                      <td className="p-2">
                        {status.state === "paid" ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/15 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid ${((status.payment!.amount_cents) / 100).toFixed(2)}
                            {status.payment!.paid_at && (
                              <span className="text-[10px] opacity-70 ml-1">
                                {format(new Date(status.payment!.paid_at), "MMM d")}
                              </span>
                            )}
                          </Badge>
                        ) : status.state === "pending" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Unpaid
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resendInvite(p)}
                            title="Resend invite email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeParticipant(p.id)}
                            className="text-destructive hover:text-destructive"
                            title="Remove participant"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

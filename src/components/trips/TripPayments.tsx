import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function TripPayments({ tripId }: { tripId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [form, setForm] = useState({ participant_id: "", amount: "", payment_type: "deposit" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [{ data }, { data: pp }] = await Promise.all([
      supabase.from("trip_payments").select("*").eq("trip_id", tripId).order("created_at"),
      supabase.from("trip_participants").select("id, name, email").eq("trip_id", tripId),
    ]);
    setList(data || []);
    setParticipants(pp || []);
  };
  useEffect(() => { load(); }, [tripId]);

  const createCheckout = async () => {
    if (!form.participant_id || !form.amount) return toast.error("Participant & amount required");
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("process-trip-payment", {
      body: {
        trip_id: tripId,
        participant_id: form.participant_id,
        amount_cents: Math.round(parseFloat(form.amount) * 100),
        payment_type: form.payment_type,
      },
    });
    setCreating(false);
    if (error || !data?.url) return toast.error(error?.message || "Failed to create checkout");
    window.open(data.url, "_blank");
    setForm({ participant_id: "", amount: "", payment_type: "deposit" });
    setTimeout(load, 1000);
  };

  const remove = async (id: string) => {
    await supabase.from("trip_payments").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
          <Select value={form.participant_id} onValueChange={(v) => setForm({ ...form, participant_id: v })}>
            <SelectTrigger><SelectValue placeholder="Participant" /></SelectTrigger>
            <SelectContent>
              {participants.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Amount $" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="final_payment">Final Payment</SelectItem>
              <SelectItem value="extra">Extra</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createCheckout} disabled={creating} className="md:col-span-2">
            <Plus className="h-4 w-4 mr-1" /> {creating ? "Creating…" : "Create Stripe Checkout"}
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">A 5% platform fee is added to the participant's total at checkout.</p>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="py-2">Participant</th><th>Type</th><th>Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{participants.find((x) => x.id === p.participant_id)?.name || "—"}</td>
                    <td>{p.payment_type}</td>
                    <td>${((p.amount_cents || 0) / 100).toFixed(2)}</td>
                    <td>
                      <span className={p.status === "paid" ? "text-green-700" : "text-muted-foreground"}>
                        {p.status}
                      </span>
                    </td>
                    <td><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

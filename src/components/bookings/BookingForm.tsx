import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import type { BookingSlot } from "@/hooks/useBookings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: BookingSlot | null;
  context: string;
  onBooked?: () => void;
}

export function BookingForm({ open, onOpenChange, slot, context, onBooked }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({ coach_name: "", coach_email: "", coach_phone: "", team_name: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ reference: string; status: string } | null>(null);

  const reset = () => {
    setForm({ coach_name: "", coach_email: "", coach_phone: "", team_name: "", notes: "" });
    setSuccess(null);
  };

  const submit = async () => {
    if (!slot) return;
    if (!form.coach_name.trim() || !form.coach_email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-booking", {
      body: { slot_id: slot.id, context, ...form },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Booking failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setSuccess({ reference: (data as any).booking_reference, status: (data as any).status });
    onBooked?.();
  };

  if (!slot) return null;
  const startDate = new Date(slot.start_time);
  const endDate = new Date(slot.end_time);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 300); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <h3 className="text-lg font-semibold">
              {success.status === "waitlisted" ? "Added to waitlist" : "Booking confirmed!"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Reference: <span className="font-mono font-bold">{success.reference}</span>
            </p>
            <p className="text-sm text-muted-foreground">A confirmation email has been sent to {form.coach_email}.</p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Book Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded bg-muted p-3 text-sm">
                <p className="font-semibold">{slot.title}</p>
                <p className="text-muted-foreground">
                  📅 {startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} ·{" "}
                  {startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                  {endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
                {slot.location && <p className="text-muted-foreground">📍 {slot.location}</p>}
              </div>
              <div><Label>Coach Name *</Label><Input value={form.coach_name} onChange={(e) => setForm({ ...form, coach_name: e.target.value })} /></div>
              <div><Label>Coach Email *</Label><Input type="email" value={form.coach_email} onChange={(e) => setForm({ ...form, coach_email: e.target.value })} /></div>
              <div><Label>Coach Phone</Label><Input value={form.coach_phone} onChange={(e) => setForm({ ...form, coach_phone: e.target.value })} /></div>
              <div><Label>Team Name</Label><Input value={form.team_name} onChange={(e) => setForm({ ...form, team_name: e.target.value })} /></div>
              <div><Label>Additional Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? "Booking..." : "Confirm Booking"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

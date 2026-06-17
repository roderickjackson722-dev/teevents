import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fetchReservations, type BookingReservation, type BookingSlot } from "@/hooks/useBookings";

interface Props {
  slot: BookingSlot | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

export function BookingReservationsDrawer({ slot, open, onOpenChange, onChanged }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<BookingReservation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!slot) return;
    setLoading(true);
    setItems(await fetchReservations(slot.id));
    setLoading(false);
  };

  useEffect(() => { if (open && slot) load(); }, [open, slot?.id]);

  const cancel = async (r: BookingReservation) => {
    if (!confirm(`Cancel booking for ${r.coach_name}?`)) return;
    const { error } = await (supabase as any).from("booking_reservations").update({ status: "cancelled" }).eq("id", r.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Booking cancelled" }); load(); onChanged(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bookings — {slot?.title}</DialogTitle></DialogHeader>
        {loading ? <p>Loading...</p> : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="border rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.coach_name}</span>
                    <Badge variant={r.status === "confirmed" ? "default" : r.status === "waitlisted" ? "secondary" : "outline"}>
                      {r.status}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{r.booking_reference}</span>
                  </div>
                  <div className="text-muted-foreground">{r.coach_email}{r.coach_phone ? ` · ${r.coach_phone}` : ""}</div>
                  {r.team_name && <div className="text-muted-foreground">Team: {r.team_name}</div>}
                  {r.notes && <div className="text-muted-foreground italic mt-1">"{r.notes}"</div>}
                </div>
                {r.status !== "cancelled" && (
                  <Button size="sm" variant="outline" onClick={() => cancel(r)}>Cancel</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

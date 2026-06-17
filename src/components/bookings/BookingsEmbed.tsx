import { useState } from "react";
import { useBookings, type BookingSlot } from "@/hooks/useBookings";
import { BookingSlotList } from "./BookingSlotList";
import { BookingForm } from "./BookingForm";

interface Props {
  context: string;
  title?: string;
}

export function BookingsEmbed({ context, title }: Props) {
  const { slots, categories, loading, reload } = useBookings(context);
  const [selected, setSelected] = useState<BookingSlot | null>(null);
  const [open, setOpen] = useState(false);

  const now = Date.now();
  const upcoming = slots.filter((s) => s.is_active && new Date(s.end_time).getTime() > now);

  return (
    <div className="space-y-4">
      {title && <h3 className="font-semibold text-lg">{title}</h3>}
      {loading ? (
        <p className="text-muted-foreground">Loading available slots…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-muted-foreground italic">No booking slots are currently available. Please check back soon.</p>
      ) : (
        <BookingSlotList
          slots={upcoming}
          categories={categories}
          mode="public"
          onBook={(s) => { setSelected(s); setOpen(true); }}
        />
      )}
      <BookingForm
        open={open}
        onOpenChange={setOpen}
        slot={selected}
        context={context}
        onBooked={reload}
      />
    </div>
  );
}

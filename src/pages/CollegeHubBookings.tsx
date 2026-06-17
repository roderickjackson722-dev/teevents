import { useState } from "react";
import { useBookings, type BookingSlot } from "@/hooks/useBookings";
import { BookingSlotList } from "@/components/bookings/BookingSlotList";
import { BookingForm } from "@/components/bookings/BookingForm";
import SEO from "@/components/SEO";

const CONTEXT = "college-hub";

export default function CollegeHubBookingsPublic() {
  const { slots, categories, loading, reload } = useBookings(CONTEXT);
  const [selected, setSelected] = useState<BookingSlot | null>(null);
  const [open, setOpen] = useState(false);

  const now = Date.now();
  const upcoming = slots.filter((s) => s.is_active && new Date(s.end_time).getTime() > now);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="College Golf Tournament Bookings | TeeVents" description="Book physical therapy and team sessions for the college golf tournament." />
      <div className="container max-w-3xl py-10">
        <h1 className="text-3xl font-bold text-[#1a5c38]">College Golf Tournament</h1>
        <p className="text-muted-foreground mt-1">Reserve a session for your team below.</p>
        <div className="mt-8">
          {loading ? <p>Loading...</p> : (
            <BookingSlotList
              slots={upcoming}
              categories={categories}
              mode="public"
              onBook={(s) => { setSelected(s); setOpen(true); }}
            />
          )}
        </div>
      </div>
      <BookingForm
        open={open}
        onOpenChange={setOpen}
        slot={selected}
        context={CONTEXT}
        onBooked={reload}
      />
    </div>
  );
}

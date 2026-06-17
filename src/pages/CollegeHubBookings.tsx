import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBookings, type BookingSlot } from "@/hooks/useBookings";
import { BookingSlotList } from "@/components/bookings/BookingSlotList";
import { BookingForm } from "@/components/bookings/BookingForm";
import SEO from "@/components/SEO";

export default function CollegeHubBookingsPublic() {
  const [params] = useSearchParams();
  const CONTEXT = params.get("context") || "college-hub";
  const { slots, categories, loading, reload } = useBookings(CONTEXT);
  const [selected, setSelected] = useState<BookingSlot | null>(null);
  const [open, setOpen] = useState(false);

  const now = Date.now();
  const upcoming = slots.filter((s) => s.is_active && new Date(s.end_time).getTime() > now);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Team Therapy Bookings | TeeVents" description="Book Team Therapy sessions with our trainers for the college golf tournament." />
      <div className="container max-w-3xl py-10">
        <h1 className="text-3xl font-bold text-[#1a5c38]">Team Therapy Bookings</h1>
        <p className="text-muted-foreground mt-1">Reserve a slot with one of our trainers for your team below.</p>
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

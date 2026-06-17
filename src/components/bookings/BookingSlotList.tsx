import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Edit, Trash2, Eye } from "lucide-react";
import type { BookingSlot, BookingCategory } from "@/hooks/useBookings";

interface Props {
  slots: BookingSlot[];
  categories: BookingCategory[];
  mode: "admin" | "public";
  onBook?: (slot: BookingSlot) => void;
  onEdit?: (slot: BookingSlot) => void;
  onDelete?: (slot: BookingSlot) => void;
  onViewBookings?: (slot: BookingSlot) => void;
}

export function BookingSlotList({ slots, categories, mode, onBook, onEdit, onDelete, onViewBookings }: Props) {
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const catColor = (id: string | null) => categories.find((c) => c.id === id)?.color || "#1a5c38";

  if (slots.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No booking slots available.</p>;
  }

  return (
    <div className="space-y-3">
      {slots.map((slot) => {
        const start = new Date(slot.start_time);
        const end = new Date(slot.end_time);
        const remaining = slot.max_bookings - slot.current_bookings;
        const full = remaining <= 0;
        return (
          <Card key={slot.id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {slot.category_id && (
                    <Badge style={{ backgroundColor: catColor(slot.category_id), color: "white" }}>
                      {catName(slot.category_id)}
                    </Badge>
                  )}
                  {!slot.is_active && <Badge variant="secondary">Inactive</Badge>}
                  {full && <Badge variant="destructive">Full</Badge>}
                </div>
                <h4 className="font-semibold">{slot.title}</h4>
                {slot.description && <p className="text-sm text-muted-foreground">{slot.description}</p>}
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                    {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                    {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                    {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  {slot.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{slot.location}</span>}
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />
                    {slot.current_bookings} / {slot.max_bookings} booked
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {mode === "public" && (
                  <Button onClick={() => onBook?.(slot)} disabled={!slot.is_active}>
                    {full ? "Join Waitlist" : "Book Now"}
                  </Button>
                )}
                {mode === "admin" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onEdit?.(slot)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => onViewBookings?.(slot)}><Eye className="w-4 h-4 mr-1" />Bookings</Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete?.(slot)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

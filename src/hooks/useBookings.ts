import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookingCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  context: string | null;
}

export interface BookingSlot {
  id: string;
  category_id: string | null;
  context: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  max_bookings: number;
  current_bookings: number;
  is_active: boolean;
}

export interface BookingReservation {
  id: string;
  slot_id: string;
  coach_name: string;
  coach_email: string;
  coach_phone: string | null;
  team_name: string | null;
  notes: string | null;
  booking_reference: string | null;
  status: string;
  created_at: string;
}

export function useBookings(context = "college-hub") {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [categories, setCategories] = useState<BookingCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      (supabase as any).from("booking_slots").select("*").eq("context", context).order("start_time", { ascending: true }),
      (supabase as any).from("booking_categories").select("*").eq("context", context).order("name"),
    ]);
    setSlots((s.data as BookingSlot[]) || []);
    setCategories((c.data as BookingCategory[]) || []);
    setLoading(false);
  }, [context]);

  useEffect(() => { load(); }, [load]);

  return { slots, categories, loading, reload: load };
}

export async function fetchReservations(slotId: string): Promise<BookingReservation[]> {
  const { data } = await (supabase as any)
    .from("booking_reservations")
    .select("*")
    .eq("slot_id", slotId)
    .order("created_at", { ascending: true });
  return (data as BookingReservation[]) || [];
}

export async function fetchAllReservations(context = "college-hub"): Promise<(BookingReservation & { slot: BookingSlot })[]> {
  const { data } = await (supabase as any)
    .from("booking_reservations")
    .select("*, slot:booking_slots!inner(*)")
    .eq("slot.context", context)
    .order("created_at", { ascending: false });
  return (data as any) || [];
}

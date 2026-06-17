
-- Booking categories
CREATE TABLE public.booking_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1a5c38',
  context TEXT DEFAULT 'college-hub',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_categories TO authenticated;
GRANT ALL ON public.booking_categories TO service_role;
ALTER TABLE public.booking_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view booking categories" ON public.booking_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage booking categories" ON public.booking_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Booking slots
CREATE TABLE public.booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.booking_categories(id) ON DELETE SET NULL,
  context TEXT DEFAULT 'college-hub',
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_bookings INTEGER NOT NULL DEFAULT 1,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_slots TO authenticated;
GRANT ALL ON public.booking_slots TO service_role;
ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active booking slots" ON public.booking_slots FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage booking slots" ON public.booking_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Booking reservations
CREATE TABLE public.booking_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.booking_slots(id) ON DELETE CASCADE,
  coach_name TEXT NOT NULL,
  coach_email TEXT NOT NULL,
  coach_phone TEXT,
  team_name TEXT,
  notes TEXT,
  booking_reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_reservations TO authenticated;
GRANT INSERT ON public.booking_reservations TO anon;
GRANT ALL ON public.booking_reservations TO service_role;
ALTER TABLE public.booking_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view reservations" ON public.booking_reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage reservations" ON public.booking_reservations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
-- Public can insert (capacity enforced by trigger)
CREATE POLICY "Anyone can create reservation" ON public.booking_reservations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can create reservation" ON public.booking_reservations FOR INSERT TO authenticated WITH CHECK (true);

-- Notification settings (single row pattern, but allow multiple per context)
CREATE TABLE public.booking_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT NOT NULL DEFAULT 'college-hub' UNIQUE,
  admin_email TEXT NOT NULL DEFAULT 'info@teevents.golf',
  additional_email TEXT,
  send_on_booking BOOLEAN NOT NULL DEFAULT true,
  send_on_cancellation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_notification_settings TO authenticated;
GRANT ALL ON public.booking_notification_settings TO service_role;
ALTER TABLE public.booking_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage booking notifications" ON public.booking_notification_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings row
INSERT INTO public.booking_notification_settings (context, admin_email) VALUES ('college-hub', 'info@teevents.golf') ON CONFLICT DO NOTHING;

-- Booking reference + capacity trigger
CREATE OR REPLACE FUNCTION public.handle_booking_reservation_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  slot RECORD;
  new_ref TEXT;
BEGIN
  SELECT * INTO slot FROM public.booking_slots WHERE id = NEW.slot_id FOR UPDATE;
  IF slot.id IS NULL THEN
    RAISE EXCEPTION 'Booking slot not found';
  END IF;
  IF slot.is_active = false THEN
    RAISE EXCEPTION 'Booking slot is not active';
  END IF;

  -- Auto reference
  IF NEW.booking_reference IS NULL OR NEW.booking_reference = '' THEN
    LOOP
      new_ref := 'BK-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.booking_reservations WHERE booking_reference = new_ref);
    END LOOP;
    NEW.booking_reference := new_ref;
  END IF;

  -- Determine status based on capacity
  IF slot.current_bookings >= slot.max_bookings THEN
    NEW.status := 'waitlisted';
  ELSE
    IF NEW.status IS NULL OR NEW.status = '' THEN NEW.status := 'confirmed'; END IF;
    IF NEW.status = 'confirmed' THEN
      UPDATE public.booking_slots SET current_bookings = current_bookings + 1, updated_at = now() WHERE id = slot.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_reservation_insert
BEFORE INSERT ON public.booking_reservations
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_reservation_insert();

-- Status change trigger (handle cancellation)
CREATE OR REPLACE FUNCTION public.handle_booking_reservation_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    UPDATE public.booking_slots SET current_bookings = GREATEST(0, current_bookings - 1), updated_at = now() WHERE id = NEW.slot_id;
  ELSIF OLD.status = 'cancelled' AND NEW.status = 'confirmed' THEN
    UPDATE public.booking_slots SET current_bookings = current_bookings + 1, updated_at = now() WHERE id = NEW.slot_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_reservation_update
BEFORE UPDATE ON public.booking_reservations
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_reservation_update();

-- Updated_at triggers
CREATE TRIGGER trg_booking_slots_updated BEFORE UPDATE ON public.booking_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_booking_categories_updated BEFORE UPDATE ON public.booking_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_booking_notifications_updated BEFORE UPDATE ON public.booking_notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

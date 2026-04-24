-- =========================================
-- 1. Platform settings (admin feature flags)
-- =========================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform settings"
  ON public.platform_settings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed feature flag (default OFF)
INSERT INTO public.platform_settings (key, value, description)
VALUES ('enable_group_trips', 'false'::jsonb, 'Enables the Group Trips module across the platform.')
ON CONFLICT (key) DO NOTHING;

-- =========================================
-- 2. Golf trips
-- =========================================
CREATE TABLE IF NOT EXISTS public.golf_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  title TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_golf_trips_organizer ON public.golf_trips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_golf_trips_status ON public.golf_trips(status);

ALTER TABLE public.golf_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers view own trips"
  ON public.golf_trips FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers create trips"
  ON public.golf_trips FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers update own trips"
  ON public.golf_trips FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers delete own trips"
  ON public.golf_trips FOR DELETE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Admins manage trips"
  ON public.golf_trips FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_golf_trips_updated_at
  BEFORE UPDATE ON public.golf_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is current user the organizer of a trip?
CREATE OR REPLACE FUNCTION public.is_trip_organizer(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.golf_trips WHERE id = _trip_id AND organizer_id = _user_id)
$$;

-- =========================================
-- 3. Trip participants
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  handicap_index NUMERIC(4,1),
  rooming_info TEXT,
  dietary_restrictions TEXT,
  shirt_size TEXT,
  is_organizer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_participants_trip ON public.trip_participants(trip_id);

ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage participants"
  ON public.trip_participants FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- =========================================
-- 4. Trip agenda
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  time TIME,
  activity TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_agenda_trip_day ON public.trip_agenda(trip_id, day);

ALTER TABLE public.trip_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage agenda"
  ON public.trip_agenda FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- =========================================
-- 5. Trip tee times / pairings
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_tee_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  tee_time TIME NOT NULL,
  course_name TEXT,
  group_name TEXT,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_tee_times_trip_day ON public.trip_tee_times(trip_id, day);

ALTER TABLE public.trip_tee_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage tee times"
  ON public.trip_tee_times FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- =========================================
-- 6. Trip games (Ryder Cup, skins, stableford, etc.)
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_games_trip ON public.trip_games(trip_id);

ALTER TABLE public.trip_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage games"
  ON public.trip_games FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- =========================================
-- 7. Trip skins / side bets
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  day DATE,
  hole_number INTEGER,
  winning_participant_id UUID REFERENCES public.trip_participants(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_skins_trip ON public.trip_skins(trip_id);

ALTER TABLE public.trip_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage skins"
  ON public.trip_skins FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- =========================================
-- 8. Trip payments
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.trip_participants(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  payment_type TEXT,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_payments_trip ON public.trip_payments(trip_id);

ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage payments"
  ON public.trip_payments FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- =========================================
-- 9. Trip rooms
-- =========================================
CREATE TABLE IF NOT EXISTS public.trip_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.golf_trips(id) ON DELETE CASCADE,
  room_number TEXT,
  room_type TEXT,
  occupants JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_rooms_trip ON public.trip_rooms(trip_id);

ALTER TABLE public.trip_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage rooms"
  ON public.trip_rooms FOR ALL
  USING (public.is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));
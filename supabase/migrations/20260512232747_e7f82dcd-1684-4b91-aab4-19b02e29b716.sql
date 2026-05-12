
CREATE TABLE public.tournament_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  hotel_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website_url TEXT,
  group_code TEXT,
  booking_deadline DATE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.accommodation_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id UUID NOT NULL REFERENCES public.tournament_accommodations(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  rate_cents INTEGER,
  rate_note TEXT,
  max_occupancy INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.accommodation_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id UUID NOT NULL REFERENCES public.tournament_accommodations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accommodations_tournament ON public.tournament_accommodations(tournament_id);
CREATE INDEX idx_room_types_accommodation ON public.accommodation_room_types(accommodation_id);
CREATE INDEX idx_custom_fields_accommodation ON public.accommodation_custom_fields(accommodation_id);

ALTER TABLE public.tournament_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_custom_fields ENABLE ROW LEVEL SECURITY;

-- Public read for active accommodations on any tournament
CREATE POLICY "Public can view active accommodations"
ON public.tournament_accommodations FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view active room types"
ON public.accommodation_room_types FOR SELECT
USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM public.tournament_accommodations a WHERE a.id = accommodation_id AND a.is_active = true)
);

CREATE POLICY "Public can view custom fields"
ON public.accommodation_custom_fields FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tournament_accommodations a WHERE a.id = accommodation_id AND a.is_active = true)
);

-- Organizer management
CREATE POLICY "Org owners manage accommodations"
ON public.tournament_accommodations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Org owners manage room types"
ON public.accommodation_room_types FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_accommodations a
    JOIN public.tournaments t ON t.id = a.tournament_id
    WHERE a.id = accommodation_id
      AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_accommodations a
    JOIN public.tournaments t ON t.id = a.tournament_id
    WHERE a.id = accommodation_id
      AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Org owners manage custom fields"
ON public.accommodation_custom_fields FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_accommodations a
    JOIN public.tournaments t ON t.id = a.tournament_id
    WHERE a.id = accommodation_id
      AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_accommodations a
    JOIN public.tournaments t ON t.id = a.tournament_id
    WHERE a.id = accommodation_id
      AND (public.is_org_owner(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE TRIGGER update_tournament_accommodations_updated_at
BEFORE UPDATE ON public.tournament_accommodations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

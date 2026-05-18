
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pin_sheets_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_sheets_notes TEXT;

CREATE TABLE IF NOT EXISTS public.pin_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  depth_position TEXT,
  side_position TEXT,
  distance_from_front INTEGER,
  distance_from_left INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, hole_number)
);

ALTER TABLE public.pin_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view pin placements"
ON public.pin_placements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = pin_placements.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id)
           OR t.pin_sheets_enabled = true)
  )
);

CREATE POLICY "Org members can insert pin placements"
ON public.pin_placements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = pin_placements.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Org members can update pin placements"
ON public.pin_placements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = pin_placements.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Org members can delete pin placements"
ON public.pin_placements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = pin_placements.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE TRIGGER update_pin_placements_updated_at
BEFORE UPDATE ON public.pin_placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

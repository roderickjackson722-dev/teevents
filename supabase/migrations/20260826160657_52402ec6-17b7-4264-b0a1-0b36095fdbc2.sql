CREATE TABLE public.league_event_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.league_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.league_members(id) ON DELETE CASCADE,
  position INTEGER,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_event_earnings TO authenticated;
GRANT ALL ON public.league_event_earnings TO service_role;

ALTER TABLE public.league_event_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage league event earnings"
ON public.league_event_earnings
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.golf_leagues l
  WHERE l.id = league_event_earnings.league_id
    AND public.is_org_member(auth.uid(), l.organization_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.golf_leagues l
  WHERE l.id = league_event_earnings.league_id
    AND public.is_org_member(auth.uid(), l.organization_id)
));

CREATE INDEX idx_league_event_earnings_event ON public.league_event_earnings(event_id);
CREATE INDEX idx_league_event_earnings_league ON public.league_event_earnings(league_id);

CREATE TRIGGER update_league_event_earnings_updated_at
BEFORE UPDATE ON public.league_event_earnings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
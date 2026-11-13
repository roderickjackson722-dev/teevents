ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS fee_split text NOT NULL DEFAULT 'player';
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_fee_split_check CHECK (fee_split IN ('player','split','organizer'));
CREATE OR REPLACE FUNCTION public.guard_tournament_fee_split()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.fee_split IS DISTINCT FROM OLD.fee_split
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.fee_split := OLD.fee_split;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_tournament_fee_split ON public.tournaments;
CREATE TRIGGER trg_guard_tournament_fee_split BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.guard_tournament_fee_split();
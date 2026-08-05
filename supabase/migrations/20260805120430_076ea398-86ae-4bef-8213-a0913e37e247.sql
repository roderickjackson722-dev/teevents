ALTER TABLE public.league_events
  ADD COLUMN IF NOT EXISTS round_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.league_events_validate_round_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.round_status NOT IN ('not_started','in_progress','completed') THEN
    RAISE EXCEPTION 'Invalid round_status: %', NEW.round_status;
  END IF;
  IF NEW.round_status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  IF NEW.round_status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_league_events_round_status ON public.league_events;
CREATE TRIGGER trg_league_events_round_status
BEFORE INSERT OR UPDATE ON public.league_events
FOR EACH ROW EXECUTE FUNCTION public.league_events_validate_round_status();
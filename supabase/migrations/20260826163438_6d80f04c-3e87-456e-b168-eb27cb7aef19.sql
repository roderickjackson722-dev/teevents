ALTER TABLE public.league_events ADD COLUMN IF NOT EXISTS start_hole integer NOT NULL DEFAULT 1;
UPDATE public.league_events e SET start_hole = 10
WHERE e.holes = 9 AND EXISTS (
  SELECT 1 FROM public.league_event_scores s WHERE s.event_id = e.id AND s.hole_number > 9
) AND NOT EXISTS (
  SELECT 1 FROM public.league_event_scores s WHERE s.event_id = e.id AND s.hole_number <= 9
);
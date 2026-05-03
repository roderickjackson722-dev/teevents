CREATE OR REPLACE FUNCTION public.seed_tournament_setup_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tournament_setup_progress (tournament_id, task_id, status, completed_at)
  SELECT
    NEW.id,
    s.id,
    CASE WHEN s.task_key IN ('create_organization','choose_plan','create_tournament') THEN 'completed' ELSE 'not_started' END,
    CASE WHEN s.task_key IN ('create_organization','choose_plan','create_tournament') THEN now() ELSE NULL END
  FROM public.setup_checklist_tasks s
  ON CONFLICT (tournament_id, task_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tournament_setup_progress ON public.tournaments;
CREATE TRIGGER trg_seed_tournament_setup_progress
  AFTER INSERT ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.seed_tournament_setup_progress();
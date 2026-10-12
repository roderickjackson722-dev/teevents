CREATE OR REPLACE FUNCTION public.default_new_no_cost_leaderboard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pricing_version = '2026-10' AND NEW.pricing_model = 'free' AND NOT COALESCE(NEW.is_enterprise, false) AND NOT COALESCE(NEW.is_demo, false) AND NOT COALESCE(NEW.is_sample, false) THEN
    NEW.live_leaderboard_enabled := false;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER default_new_no_cost_leaderboard BEFORE INSERT ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.default_new_no_cost_leaderboard();
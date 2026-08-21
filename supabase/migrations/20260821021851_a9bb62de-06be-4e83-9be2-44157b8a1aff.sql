-- Auto-link a registration's Flight (competition division) and price tier from the
-- answers the player gave at registration, so the roster always shows them.
CREATE OR REPLACE FUNCTION public.sync_registration_flight_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ans jsonb;
  lbl text;
  val text;
  found uuid;
BEGIN
  IF NEW.custom_answers IS NULL OR jsonb_typeof(NEW.custom_answers) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR ans IN SELECT * FROM jsonb_array_elements(NEW.custom_answers)
  LOOP
    lbl := lower(trim(coalesce(ans->>'label', '')));
    val := trim(coalesce(ans->>'answer', ''));
    CONTINUE WHEN val = '';

    IF NEW.flight_id IS NULL AND (lbl LIKE '%flight%' OR lbl LIKE '%division%' OR lbl LIKE '%tier%') THEN
      SELECT t.id INTO found
      FROM public.tournament_tiers t
      WHERE t.tournament_id = NEW.tournament_id
        AND (lower(trim(t.tier_name)) = lower(val)
             OR lower(trim(t.tier_name)) LIKE lower(val) || '%'
             OR lower(val) LIKE lower(trim(t.tier_name)) || '%')
      ORDER BY (lower(trim(t.tier_name)) = lower(val)) DESC, t.display_order
      LIMIT 1;
      IF found IS NOT NULL THEN
        NEW.flight_id := found;
      END IF;
      found := NULL;
    END IF;

    IF NEW.tier_id IS NULL AND (lbl LIKE '%division%' OR lbl LIKE '%tier%' OR lbl LIKE '%flight%') THEN
      SELECT rt.id INTO found
      FROM public.tournament_registration_tiers rt
      WHERE rt.tournament_id = NEW.tournament_id
        AND (lower(trim(rt.name)) = lower(val)
             OR lower(trim(rt.name)) LIKE lower(val) || '%')
      ORDER BY (lower(trim(rt.name)) = lower(val)) DESC
      LIMIT 1;
      IF found IS NOT NULL THEN
        NEW.tier_id := found;
      END IF;
      found := NULL;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_registration_flight_tier ON public.tournament_registrations;
CREATE TRIGGER trg_sync_registration_flight_tier
BEFORE INSERT OR UPDATE OF custom_answers, flight_id, tier_id
ON public.tournament_registrations
FOR EACH ROW
EXECUTE FUNCTION public.sync_registration_flight_tier();
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS age_request_email_config jsonb;

ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS age_update_token uuid DEFAULT gen_random_uuid();
UPDATE public.tournament_registrations SET age_update_token = gen_random_uuid() WHERE age_update_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_age_update_token_idx ON public.tournament_registrations(age_update_token);

CREATE OR REPLACE FUNCTION public.get_age_update_target(_token uuid)
RETURNS TABLE (registration_id uuid, player_name text, tournament_name text, tournament_slug text, current_age text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         trim(coalesce(r.first_name,'') || ' ' || coalesce(r.last_name,'')),
         t.title,
         t.slug,
         (SELECT a->>'answer' FROM jsonb_array_elements(coalesce(r.custom_answers,'[]'::jsonb)) a
           WHERE lower(a->>'label') LIKE '%age%' LIMIT 1)
  FROM public.tournament_registrations r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.age_update_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_age_update(_token uuid, _age integer)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reg public.tournament_registrations;
  _field_id text;
  _answers jsonb;
BEGIN
  IF _age IS NULL OR _age < 3 OR _age > 100 THEN
    RAISE EXCEPTION 'Please enter an age between 3 and 100';
  END IF;

  SELECT * INTO _reg FROM public.tournament_registrations WHERE age_update_token = _token;
  IF _reg.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT f.id::text INTO _field_id
  FROM public.tournament_registration_fields f
  WHERE f.tournament_id = _reg.tournament_id AND lower(f.label) LIKE '%age%'
  ORDER BY f.is_enabled DESC
  LIMIT 1;

  _field_id := coalesce(_field_id, '_age');

  SELECT coalesce(jsonb_agg(a), '[]'::jsonb) INTO _answers
  FROM jsonb_array_elements(coalesce(_reg.custom_answers, '[]'::jsonb)) a
  WHERE lower(a->>'label') NOT LIKE '%age%';

  _answers := _answers || jsonb_build_array(jsonb_build_object(
    'field_id', _field_id,
    'label', 'Age',
    'field_type', 'number',
    'answer', _age::text
  ));

  UPDATE public.tournament_registrations
  SET custom_answers = _answers
  WHERE id = _reg.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_age_update_target(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_age_update(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_age_update_target(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_age_update(uuid, integer) TO anon, authenticated;
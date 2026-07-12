
CREATE OR REPLACE FUNCTION public.get_score_edit_history(_tournament_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(
  id uuid,
  tournament_id uuid,
  registration_id uuid,
  player_first_name text,
  player_last_name text,
  hole_number integer,
  old_score integer,
  new_score integer,
  edited_by uuid,
  editor_email text,
  editor_type text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.tournaments WHERE id = _tournament_id;
  IF _org IS NULL THEN RETURN; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_org_member(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    se.id,
    se.tournament_id,
    se.registration_id,
    r.first_name,
    r.last_name,
    se.hole_number,
    se.old_score,
    se.new_score,
    se.edited_by,
    u.email::text,
    se.editor_type,
    se.notes,
    se.created_at
  FROM public.score_edits se
  LEFT JOIN public.tournament_registrations r ON r.id = se.registration_id
  LEFT JOIN auth.users u ON u.id = se.edited_by
  WHERE se.tournament_id = _tournament_id
  ORDER BY se.created_at DESC
  LIMIT COALESCE(_limit, 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_score_edit_history(uuid, integer) TO authenticated;

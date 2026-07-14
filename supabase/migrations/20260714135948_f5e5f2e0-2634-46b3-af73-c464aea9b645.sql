
CREATE OR REPLACE FUNCTION public.notify_sample_upgrade_interest(
  _token uuid,
  _email text DEFAULT NULL,
  _name text DEFAULT NULL,
  _message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_row public.tournaments%ROWTYPE;
BEGIN
  SELECT * INTO t_row FROM public.tournaments WHERE sample_token = _token AND is_sample = true;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_notifications (type, organization_id, message, is_read)
  VALUES (
    'sample_upgrade_interest',
    t_row.organization_id,
    'Sample "' || t_row.title || '" — prospect clicked Upgrade Now'
      || CASE WHEN _email IS NOT NULL THEN ' (email: ' || _email || ')' ELSE '' END
      || CASE WHEN _name IS NOT NULL THEN ' (name: ' || _name || ')' ELSE '' END
      || CASE WHEN _message IS NOT NULL THEN ' — ' || _message ELSE '' END,
    false
  );
  RETURN true;
END;
$$;

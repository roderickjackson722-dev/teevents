
-- Login events table
CREATE TABLE public.org_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL,
  user_id uuid,
  user_email text,
  user_agent text
);
CREATE INDEX idx_org_login_events_org_time ON public.org_login_events (organization_id, occurred_at DESC);

ALTER TABLE public.org_login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their login events"
  ON public.org_login_events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'::app_role));

-- Allow org member to log their own login event
CREATE POLICY "Org members insert own login event"
  ON public.org_login_events FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

-- RPC to insert login (uses service-definer to capture email reliably)
CREATE OR REPLACE FUNCTION public.record_org_login(_organization_id uuid, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  IF NOT public.is_org_member(v_user_id, _organization_id) THEN RETURN; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  -- Throttle: skip if same user logged within 10 minutes for this org
  IF EXISTS (
    SELECT 1 FROM public.org_login_events
    WHERE organization_id = _organization_id
      AND user_id = v_user_id
      AND occurred_at > now() - interval '10 minutes'
  ) THEN RETURN; END IF;
  INSERT INTO public.org_login_events (organization_id, user_id, user_email, user_agent)
  VALUES (_organization_id, v_user_id, v_email, NULLIF(left(coalesce(_user_agent,''),500),''));
END;
$$;

-- Let org members view their organization's audit log entries
CREATE POLICY "Org members view their audit log"
  ON public.dashboard_audit_log FOR SELECT
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

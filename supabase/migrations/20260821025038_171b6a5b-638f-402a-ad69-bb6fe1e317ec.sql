-- Team member login codes
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS login_code TEXT;
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS login_code_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS org_members_login_code_key ON public.org_members (login_code) WHERE login_code IS NOT NULL;

-- SMS controls per tournament
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sms_credits_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sms_credits_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sms_plan TEXT NOT NULL DEFAULT 'none';

-- SMS send log
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  sender_id UUID,
  audience TEXT DEFAULT 'all',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_detail TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their tournament sms logs"
ON public.sms_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members m ON m.organization_id = t.organization_id
    WHERE t.id = sms_logs.tournament_id AND m.user_id = auth.uid()
  )
);

-- Generate a unique 6-character login code for a team member
CREATE OR REPLACE FUNCTION public.generate_team_login_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INT;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.org_members WHERE login_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;
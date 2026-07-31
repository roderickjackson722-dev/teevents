CREATE TABLE public.admin_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  user_id UUID,
  target_email TEXT NOT NULL,
  reset_token TEXT NOT NULL,
  emailed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_password_resets TO authenticated;
GRANT ALL ON public.admin_password_resets TO service_role;

ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin password resets"
ON public.admin_password_resets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_admin_password_resets_created ON public.admin_password_resets (created_at DESC);
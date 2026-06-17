
CREATE TABLE IF NOT EXISTS public.demo_conversion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  tournament_name text,
  prospect_email text,
  prospect_name text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  converted_to_live boolean NOT NULL DEFAULT true,
  converted_at timestamptz NOT NULL DEFAULT now(),
  converted_by uuid,
  is_test boolean NOT NULL DEFAULT false,
  notes text
);

GRANT SELECT ON public.demo_conversion_log TO authenticated;
GRANT ALL ON public.demo_conversion_log TO service_role;

ALTER TABLE public.demo_conversion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view conversion log"
  ON public.demo_conversion_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert conversion log"
  ON public.demo_conversion_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS demo_conversion_log_converted_at_idx
  ON public.demo_conversion_log (converted_at DESC);

-- Seed welcome-email settings (no-op if already there)
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('welcome_email_enabled', 'true'::jsonb, 'Send welcome email to new organizers on signup'),
  ('welcome_email_include_setup_offer', 'true'::jsonb, 'Include optional white-glove setup offer in welcome email'),
  ('welcome_setup_fee_dollars', '199'::jsonb, 'Setup service price in dollars shown in welcome email')
ON CONFLICT (key) DO NOTHING;

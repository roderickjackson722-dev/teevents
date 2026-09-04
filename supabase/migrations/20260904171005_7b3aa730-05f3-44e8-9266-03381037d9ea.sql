-- Season program info for the private public-facing sign-up link
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_fee_cents INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS seasons_public_slug_key ON public.seasons (public_slug) WHERE public_slug IS NOT NULL;

-- 1. Registration form configurations
CREATE TABLE public.rfp_registration_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID REFERENCES public.sport_settings(id) ON DELETE SET NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Registration Form',
  form_config JSONB NOT NULL DEFAULT '{"fields":[],"waivers":[],"documents":[]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfp_registration_forms TO authenticated;
GRANT ALL ON public.rfp_registration_forms TO service_role;
ALTER TABLE public.rfp_registration_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rfp registration forms"
  ON public.rfp_registration_forms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Registrations (+ payment/refund fields)
CREATE TABLE public.rfp_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES public.sport_settings(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.season_teams(id) ON DELETE SET NULL,
  form_id UUID REFERENCES public.rfp_registration_forms(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_phone TEXT,
  date_of_birth DATE,
  waiver_signed BOOLEAN NOT NULL DEFAULT false,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_amount_cents INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  refund_status TEXT NOT NULL DEFAULT 'none',
  refund_amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfp_registrations TO authenticated;
GRANT ALL ON public.rfp_registrations TO service_role;
ALTER TABLE public.rfp_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rfp registrations"
  ON public.rfp_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS rfp_registrations_season_idx ON public.rfp_registrations (season_id);
CREATE INDEX IF NOT EXISTS rfp_registrations_session_idx ON public.rfp_registrations (stripe_session_id);

-- 3. Schedule events
CREATE TABLE public.rfp_schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.season_teams(id) ON DELETE SET NULL,
  opponent_team_id UUID REFERENCES public.season_teams(id) ON DELETE SET NULL,
  title TEXT,
  event_type TEXT NOT NULL DEFAULT 'game',
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfp_schedule_events TO authenticated;
GRANT ALL ON public.rfp_schedule_events TO service_role;
ALTER TABLE public.rfp_schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rfp schedule events"
  ON public.rfp_schedule_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS rfp_schedule_events_date_idx ON public.rfp_schedule_events (event_date);

-- 4. Communications
CREATE TABLE public.rfp_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  sender_id UUID,
  recipient_type TEXT NOT NULL DEFAULT 'all',
  team_id UUID REFERENCES public.season_teams(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sent',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfp_communications TO authenticated;
GRANT ALL ON public.rfp_communications TO service_role;
ALTER TABLE public.rfp_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rfp communications"
  ON public.rfp_communications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER update_rfp_registration_forms_updated_at BEFORE UPDATE ON public.rfp_registration_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rfp_registrations_updated_at BEFORE UPDATE ON public.rfp_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rfp_schedule_events_updated_at BEFORE UPDATE ON public.rfp_schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rfp_communications_updated_at BEFORE UPDATE ON public.rfp_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
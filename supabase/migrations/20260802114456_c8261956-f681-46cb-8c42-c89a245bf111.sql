
CREATE TABLE public.security_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  location_city text,
  location_country text,
  location_lat numeric(10,6),
  location_lng numeric(11,6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sec_activity_created ON public.security_activity_log (created_at DESC);
CREATE INDEX idx_sec_activity_user ON public.security_activity_log (user_id);
CREATE INDEX idx_sec_activity_ip ON public.security_activity_log (ip_address);
GRANT ALL ON public.security_activity_log TO service_role;
GRANT SELECT ON public.security_activity_log TO authenticated;
ALTER TABLE public.security_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read activity log" ON public.security_activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.security_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text,
  ip_address text,
  location_city text,
  location_country text,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sec_flags_created ON public.security_flags (created_at DESC);
GRANT ALL ON public.security_flags TO service_role;
GRANT SELECT, UPDATE ON public.security_flags TO authenticated;
ALTER TABLE public.security_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read flags" ON public.security_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update flags" ON public.security_flags
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.security_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  user_email text,
  suspended_by uuid,
  reason text,
  suspended_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_suspensions TO service_role;
GRANT SELECT ON public.security_suspensions TO authenticated;
ALTER TABLE public.security_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read suspensions" ON public.security_suspensions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_security_suspensions_updated
  BEFORE UPDATE ON public.security_suspensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.security_ip_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  added_by uuid,
  added_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_ip_blacklist TO service_role;
GRANT SELECT ON public.security_ip_blacklist TO authenticated;
ALTER TABLE public.security_ip_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read ip blacklist" ON public.security_ip_blacklist
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.security_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid REFERENCES public.security_flags(id) ON DELETE SET NULL,
  recipients text,
  severity text,
  subject text,
  sent boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_alert_log TO service_role;
GRANT SELECT ON public.security_alert_log TO authenticated;
ALTER TABLE public.security_alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read alert log" ON public.security_alert_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.security_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  recipients text NOT NULL DEFAULT 'info@teevents.golf',
  alert_high boolean NOT NULL DEFAULT true,
  alert_medium boolean NOT NULL DEFAULT true,
  alert_low boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_alert_settings TO service_role;
GRANT SELECT ON public.security_alert_settings TO authenticated;
ALTER TABLE public.security_alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read alert settings" ON public.security_alert_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_security_alert_settings_updated
  BEFORE UPDATE ON public.security_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.security_alert_settings (enabled, recipients) VALUES (true, 'info@teevents.golf');

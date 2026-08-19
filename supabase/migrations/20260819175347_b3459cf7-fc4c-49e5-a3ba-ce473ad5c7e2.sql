CREATE TABLE public.admin_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  label text,
  notify_registration boolean NOT NULL DEFAULT true,
  notify_donation boolean NOT NULL DEFAULT true,
  notify_sponsorship boolean NOT NULL DEFAULT true,
  notify_vendor boolean NOT NULL DEFAULT true,
  notify_side_event boolean NOT NULL DEFAULT true,
  notify_store boolean NOT NULL DEFAULT true,
  notify_auction boolean NOT NULL DEFAULT true,
  notify_refund boolean NOT NULL DEFAULT true,
  notify_payout boolean NOT NULL DEFAULT true,
  notify_other boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_preferences TO authenticated;
GRANT ALL ON public.admin_notification_preferences TO service_role;

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform notification preferences"
ON public.admin_notification_preferences FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_notification_prefs_updated_at
BEFORE UPDATE ON public.admin_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.pe_touch_updated_at();

INSERT INTO public.admin_notification_preferences (email, label)
VALUES ('info@teevents.golf', 'Primary platform inbox')
ON CONFLICT (email) DO NOTHING;
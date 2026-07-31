-- Extend admin_notifications for the in-dashboard notification center
ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS link TEXT;

GRANT SELECT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

DROP POLICY IF EXISTS "Admins can delete notifications" ON public.admin_notifications;
CREATE POLICY "Admins can delete notifications"
  ON public.admin_notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.admin_notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Generic helper used by activity triggers (in-dashboard only, no email side effects)
CREATE OR REPLACE FUNCTION public.push_admin_notification(
  _type TEXT, _title TEXT, _message TEXT, _link TEXT DEFAULT NULL, _org UUID DEFAULT NULL
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_notifications (type, title, message, link, organization_id)
  VALUES (_type, _title, _message, _link, _org);
$$;

-- Registration notifications (paid or newly created)
CREATE OR REPLACE FUNCTION public.notify_admin_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t_title TEXT; t_org UUID;
BEGIN
  SELECT title, organization_id INTO t_title, t_org FROM public.tournaments WHERE id = NEW.tournament_id;
  PERFORM public.push_admin_notification(
    'registration',
    'New Registration – ' || COALESCE(t_title, 'Tournament'),
    COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email, 'A player')
      || ' registered for ' || COALESCE(t_title, 'a tournament') || '.',
    '/dashboard/players?tournament_id=' || NEW.tournament_id::text,
    t_org
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_registration ON public.tournament_registrations;
CREATE TRIGGER trg_notify_admin_registration
AFTER INSERT ON public.tournament_registrations
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_registration();

-- Organizer signup notifications
CREATE OR REPLACE FUNCTION public.notify_admin_organizer_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.push_admin_notification(
    'organizer',
    'Organizer Signup – ' || COALESCE(NEW.name, 'New organization'),
    COALESCE(NEW.name, 'A new organization') || ' created a new organizer account.',
    '/admin?tab=signups',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_organizer_signup ON public.organizations;
CREATE TRIGGER trg_notify_admin_organizer_signup
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_organizer_signup();

-- Payout request notifications
CREATE OR REPLACE FUNCTION public.notify_admin_payout_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE org_name TEXT;
BEGIN
  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;
  PERFORM public.push_admin_notification(
    'payout',
    'Payout Request – ' || COALESCE(org_name, 'Organization'),
    COALESCE(org_name, 'An organization') || ' submitted a payout account request ('
      || COALESCE(NEW.change_type, 'update') || ').',
    '/admin?tab=notifications',
    NEW.organization_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_payout_request ON public.payout_change_requests;
CREATE TRIGGER trg_notify_admin_payout_request
AFTER INSERT ON public.payout_change_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_payout_request();

-- Sponsor registration notifications
CREATE OR REPLACE FUNCTION public.notify_admin_sponsor_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t_title TEXT; t_org UUID;
BEGIN
  SELECT title, organization_id INTO t_title, t_org FROM public.tournaments WHERE id = NEW.tournament_id;
  PERFORM public.push_admin_notification(
    'sponsor',
    'Sponsor Registration – ' || COALESCE(NEW.company_name, 'Sponsor'),
    COALESCE(NEW.company_name, 'A sponsor') || ' signed up for '
      || COALESCE(t_title, 'a tournament') || ' ($'
      || to_char(COALESCE(NEW.amount_cents, 0) / 100.0, 'FM999,999,990.00') || ').',
    '/dashboard/sponsors?tournament_id=' || NEW.tournament_id::text,
    t_org
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_sponsor_registration ON public.sponsor_registrations;
CREATE TRIGGER trg_notify_admin_sponsor_registration
AFTER INSERT ON public.sponsor_registrations
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_sponsor_registration();

-- Manual entry notifications
CREATE OR REPLACE FUNCTION public.notify_admin_manual_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t_title TEXT; t_org UUID;
BEGIN
  SELECT title, organization_id INTO t_title, t_org FROM public.tournaments WHERE id = NEW.tournament_id;
  PERFORM public.push_admin_notification(
    'manual_entry',
    'Manual Entry – ' || COALESCE(t_title, 'Tournament'),
    'A manual (cash/check) entry of $'
      || to_char(COALESCE(NEW.amount_cents, 0) / 100.0, 'FM999,999,990.00')
      || ' was added to ' || COALESCE(t_title, 'a tournament') || '.',
    '/dashboard/players?tournament_id=' || NEW.tournament_id::text,
    t_org
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_manual_entry ON public.manual_entry_fees;
CREATE TRIGGER trg_notify_admin_manual_entry
AFTER INSERT ON public.manual_entry_fees
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_manual_entry();

-- Demo converter usage notifications
CREATE OR REPLACE FUNCTION public.notify_admin_demo_convert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.push_admin_notification(
    'demo_convert',
    'Demo Converter – ' || COALESCE(NEW.tournament_name, 'Demo tournament'),
    'Demo Converter was used for '
      || COALESCE(NEW.prospect_name, NEW.prospect_email, 'a prospect')
      || ' on ' || COALESCE(NEW.tournament_name, 'a demo tournament') || '.',
    '/admin/demo-converter',
    NEW.organization_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_demo_convert ON public.demo_conversion_log;
CREATE TRIGGER trg_notify_admin_demo_convert
AFTER INSERT ON public.demo_conversion_log
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_demo_convert();
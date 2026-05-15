
-- ============== POST-EVENT SURVEY ==============
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS post_event_survey_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_event_survey_delay_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS post_event_survey_message text,
  ADD COLUMN IF NOT EXISTS post_event_survey_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS early_signup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_signup_label text DEFAULT 'Yes, please notify me when registration opens for next year''s tournament.';

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS survey_response_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS survey_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_registrations_survey_token
  ON public.tournament_registrations(survey_response_token);

CREATE TABLE IF NOT EXISTS public.early_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  source text DEFAULT 'survey',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, email)
);
ALTER TABLE public.early_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create early signups"
  ON public.early_signups FOR INSERT WITH CHECK (true);

CREATE POLICY "Org members view early signups"
  ON public.early_signups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = early_signups.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members delete early signups"
  ON public.early_signups FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = early_signups.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins manage early signups"
  ON public.early_signups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============== SIDE EVENTS ==============
CREATE TABLE IF NOT EXISTS public.side_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  event_date timestamptz,
  location text,
  price_cents integer NOT NULL DEFAULT 0,
  max_tickets integer,
  tickets_sold integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  show_on_public boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_side_events_tournament ON public.side_events(tournament_id);
ALTER TABLE public.side_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active side events"
  ON public.side_events FOR SELECT
  USING (is_active = true AND show_on_public = true);

CREATE POLICY "Org members manage side events"
  ON public.side_events FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = side_events.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = side_events.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins manage side events"
  ON public.side_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_side_events_updated_at
  BEFORE UPDATE ON public.side_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.side_event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  side_event_id uuid NOT NULL REFERENCES public.side_events(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  attendee_name text NOT NULL,
  attendee_email text NOT NULL,
  attendee_phone text,
  quantity integer NOT NULL DEFAULT 1,
  amount_cents integer NOT NULL DEFAULT 0,
  ticket_code text UNIQUE,
  stripe_session_id text,
  stripe_payment_intent_id text,
  payment_status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_side_event_tickets_event ON public.side_event_tickets(side_event_id);
CREATE INDEX IF NOT EXISTS idx_side_event_tickets_tournament ON public.side_event_tickets(tournament_id);
ALTER TABLE public.side_event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone create side event tickets"
  ON public.side_event_tickets FOR INSERT WITH CHECK (true);

CREATE POLICY "Org members view side event tickets"
  ON public.side_event_tickets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = side_event_tickets.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Org members update side event tickets"
  ON public.side_event_tickets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = side_event_tickets.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins manage side event tickets"
  ON public.side_event_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- generate unique ticket code
CREATE OR REPLACE FUNCTION public.generate_side_event_ticket_code()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.ticket_code IS NULL OR NEW.ticket_code = '' THEN
    NEW.ticket_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 8));
    WHILE EXISTS (SELECT 1 FROM public.side_event_tickets WHERE ticket_code = NEW.ticket_code AND id != NEW.id) LOOP
      NEW.ticket_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 8));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_side_event_tickets_code
  BEFORE INSERT ON public.side_event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_side_event_ticket_code();

-- sync tickets_sold with paid tickets
CREATE OR REPLACE FUNCTION public.sync_side_event_tickets_sold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  was_paid boolean := false;
  is_paid boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_paid := (NEW.payment_status = 'paid');
    IF is_paid THEN
      UPDATE public.side_events
        SET tickets_sold = COALESCE(tickets_sold,0) + COALESCE(NEW.quantity,1)
        WHERE id = NEW.side_event_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    was_paid := (OLD.payment_status = 'paid');
    is_paid := (NEW.payment_status = 'paid');
    IF NOT was_paid AND is_paid THEN
      UPDATE public.side_events
        SET tickets_sold = COALESCE(tickets_sold,0) + COALESCE(NEW.quantity,1)
        WHERE id = NEW.side_event_id;
    ELSIF was_paid AND NOT is_paid THEN
      UPDATE public.side_events
        SET tickets_sold = GREATEST(0, COALESCE(tickets_sold,0) - COALESCE(OLD.quantity,1))
        WHERE id = OLD.side_event_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.payment_status = 'paid' THEN
      UPDATE public.side_events
        SET tickets_sold = GREATEST(0, COALESCE(tickets_sold,0) - COALESCE(OLD.quantity,1))
        WHERE id = OLD.side_event_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_side_event_tickets_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.side_event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.sync_side_event_tickets_sold();

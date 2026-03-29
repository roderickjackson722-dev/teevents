
-- Waitlist table
CREATE TABLE public.tournament_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text NOT NULL,
  group_size integer NOT NULL DEFAULT 1 CHECK (group_size BETWEEN 1 AND 6),
  position integer NOT NULL DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  deposit_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  offer_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  phone text,
  notes text
);

-- Enable RLS
ALTER TABLE public.tournament_waitlist ENABLE ROW LEVEL SECURITY;

-- Public can join waitlist for published tournaments
CREATE POLICY "Anyone can join waitlist" ON public.tournament_waitlist
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_waitlist.tournament_id
      AND t.site_published = true
  ));

-- Public can view own waitlist entries
CREATE POLICY "Public can view own waitlist" ON public.tournament_waitlist
  FOR SELECT TO public
  USING (true);

-- Org members can manage waitlist
CREATE POLICY "Org members can manage waitlist" ON public.tournament_waitlist
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_waitlist.tournament_id
      AND is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_waitlist.tournament_id
      AND is_org_member(auth.uid(), t.organization_id)
  ));

-- Admins can manage all waitlist entries
CREATE POLICY "Admins can manage waitlist" ON public.tournament_waitlist
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Auto-assign position trigger
CREATE OR REPLACE FUNCTION public.auto_assign_waitlist_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM public.tournament_waitlist
    WHERE tournament_id = NEW.tournament_id
      AND status IN ('waiting', 'offered');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON public.tournament_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_waitlist_position();

-- Add waitlist_enabled and waitlist_deposit_cents to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waitlist_deposit_cents integer DEFAULT 0;

-- Enable realtime for waitlist
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_waitlist;

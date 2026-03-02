
-- Tournament registrations table
CREATE TABLE public.tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  handicap integer,
  shirt_size text,
  dietary_restrictions text,
  notes text,
  payment_status text NOT NULL DEFAULT 'pending',
  group_number integer,
  group_position integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Public can insert registrations (for the public registration form)
CREATE POLICY "Anyone can register for published tournaments"
  ON public.tournament_registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND t.registration_open = true
        AND t.site_published = true
    )
  );

-- Org members can view registrations for their tournaments
CREATE POLICY "Org members can view registrations"
  ON public.tournament_registrations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND is_org_member(auth.uid(), t.organization_id)
    )
  );

-- Org members can update registrations (for pairings, payment status)
CREATE POLICY "Org members can update registrations"
  ON public.tournament_registrations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND is_org_member(auth.uid(), t.organization_id)
    )
  );

-- Org members can delete registrations
CREATE POLICY "Org members can delete registrations"
  ON public.tournament_registrations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND is_org_member(auth.uid(), t.organization_id)
    )
  );

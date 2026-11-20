CREATE TABLE public.organizer_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  vetting_id uuid,
  interest_area text NOT NULL CHECK (interest_area IN ('tournament','league')),
  status text NOT NULL DEFAULT 'not_submitted' CHECK (status IN ('not_submitted','new','in_build','preview_sent','live')),
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.organizer_intakes TO authenticated;
GRANT ALL ON public.organizer_intakes TO service_role;
ALTER TABLE public.organizer_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read intakes" ON public.organizer_intakes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update intakes" ON public.organizer_intakes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners read own intake" ON public.organizer_intakes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX organizer_intakes_user_idx ON public.organizer_intakes(user_id);
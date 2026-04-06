
CREATE TABLE public.tournament_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'qr_code',
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tournament clicks"
  ON public.tournament_clicks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_clicks.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins can manage all clicks"
  ON public.tournament_clicks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert clicks"
  ON public.tournament_clicks FOR INSERT TO public
  WITH CHECK (true);

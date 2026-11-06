CREATE TABLE public.tournament_private_registration_links (
  tournament_id uuid PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_private_registration_links TO authenticated;
GRANT ALL ON public.tournament_private_registration_links TO service_role;
ALTER TABLE public.tournament_private_registration_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members and admins manage private registration links"
ON public.tournament_private_registration_links FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)))
WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE OR REPLACE FUNCTION public.check_private_registration_token(_tournament_id uuid, _token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(length(_token) >= 16, false) AND EXISTS (
    SELECT 1 FROM public.tournament_private_registration_links
    WHERE tournament_id = _tournament_id AND token = _token)
$$;
GRANT EXECUTE ON FUNCTION public.check_private_registration_token(uuid, text) TO anon, authenticated;
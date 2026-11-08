CREATE OR REPLACE FUNCTION public.is_client_demo_tournament(_tournament_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.tournaments WHERE id = _tournament_id AND client_sample_id IS NOT NULL) $$;
GRANT EXECUTE ON FUNCTION public.is_client_demo_tournament(uuid) TO anon, authenticated, service_role;
DROP POLICY "Anyone can view client demo sponsorship tiers" ON public.sponsorship_tiers;
DROP POLICY "Anyone can view client demo registration tiers" ON public.tournament_registration_tiers;
DROP POLICY "Anyone can view client demo registration fields" ON public.tournament_registration_fields;
CREATE POLICY "Anyone can view client demo sponsorship tiers" ON public.sponsorship_tiers FOR SELECT TO anon, authenticated USING (is_active = true AND public.is_client_demo_tournament(tournament_id));
CREATE POLICY "Anyone can view client demo registration tiers" ON public.tournament_registration_tiers FOR SELECT TO anon, authenticated USING (is_active = true AND public.is_client_demo_tournament(tournament_id));
CREATE POLICY "Anyone can view client demo registration fields" ON public.tournament_registration_fields FOR SELECT TO anon, authenticated USING (public.is_client_demo_tournament(tournament_id));
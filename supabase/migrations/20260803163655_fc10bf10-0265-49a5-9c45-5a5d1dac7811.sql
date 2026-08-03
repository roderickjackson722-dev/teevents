ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;

DROP FUNCTION IF EXISTS public.get_public_sponsor_registrations(uuid);

CREATE OR REPLACE FUNCTION public.get_public_sponsor_registrations(_tournament_id uuid)
 RETURNS TABLE(id uuid, tournament_id uuid, tier_id uuid, company_name text, website_url text, description text, logo_url text, payment_status text, manually_approved boolean, show_on_public boolean, is_title_sponsor boolean, show_on_leaderboard boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.tournament_id, s.tier_id, s.company_name, s.website_url,
    s.description, s.logo_url, s.payment_status, s.manually_approved,
    s.show_on_public, s.is_title_sponsor, s.show_on_leaderboard
  FROM public.sponsor_registrations s
  WHERE s.tournament_id = _tournament_id
    AND s.show_on_public = true
    AND (s.payment_status = 'paid' OR s.manually_approved = true);
$function$;
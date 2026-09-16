-- 1) admin_addon_pricing / addon_discount_codes: no broad reads
DROP POLICY IF EXISTS "Anyone can read addon pricing" ON public.admin_addon_pricing;
DROP POLICY IF EXISTS "Authenticated can read discount codes" ON public.addon_discount_codes;
REVOKE SELECT ON public.admin_addon_pricing FROM anon;

CREATE OR REPLACE FUNCTION public.get_addon_pricing()
RETURNS TABLE(addon_key text, price_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.addon_key, p.price_cents FROM public.admin_addon_pricing p;
$$;
GRANT EXECUTE ON FUNCTION public.get_addon_pricing() TO anon, authenticated;

-- 2) demo_players: hide email from public/authenticated reads
REVOKE SELECT ON public.demo_players FROM anon, authenticated;
GRANT SELECT (id, demo_tournament_id, name, handicap, shirt_size, group_name, tee_time, created_at)
  ON public.demo_players TO anon, authenticated;

-- 3) league_team_pairings: scoring_code is a bearer credential, never readable via the table
REVOKE SELECT ON public.league_team_pairings FROM anon, authenticated;
GRANT SELECT (id, league_id, event_id, team_name, player1_id, player2_id, holes, created_at, updated_at)
  ON public.league_team_pairings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_league_team_scoring_codes(_event_id uuid)
RETURNS TABLE(id uuid, team_name text, scoring_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.team_name, p.scoring_code
  FROM public.league_team_pairings p
  JOIN public.golf_leagues gl ON gl.id = p.league_id
  WHERE p.event_id = _event_id
    AND (public.has_role(auth.uid(), 'admin') OR public.is_org_member(auth.uid(), gl.organization_id));
$$;
GRANT EXECUTE ON FUNCTION public.get_league_team_scoring_codes(uuid) TO authenticated;

-- 4) tournament promo codes: validate instead of exposing full rows
DROP POLICY IF EXISTS "Public can validate active tournament promo codes" ON public.tournament_promo_codes;
REVOKE SELECT ON public.tournament_promo_codes FROM anon;

CREATE OR REPLACE FUNCTION public.validate_tournament_promo_code(_tournament_id uuid, _code text)
RETURNS TABLE(code text, discount_type text, discount_value numeric, alert_html text, show_alert_on_top boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.code, pc.discount_type, pc.discount_value,
         CASE WHEN pc.alert_enabled THEN pc.alert_html ELSE NULL END,
         pc.show_alert_on_top
  FROM public.tournament_promo_codes pc
  JOIN public.tournaments t ON t.id = pc.tournament_id
  WHERE pc.tournament_id = _tournament_id
    AND upper(pc.code) = upper(btrim(_code))
    AND pc.is_active = true
    AND t.site_published = true
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
    AND (pc.max_uses IS NULL OR COALESCE(pc.current_uses, 0) < pc.max_uses)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.validate_tournament_promo_code(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_auto_apply_promo_codes(_tournament_id uuid)
RETURNS TABLE(
  code text, discount_type text, discount_value numeric,
  applies_to text, applies_to_custom text,
  alert_enabled boolean, alert_html text,
  show_alert_on_top boolean, show_alert_at_checkout boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.code, pc.discount_type, pc.discount_value,
         pc.applies_to, pc.applies_to_custom,
         pc.alert_enabled, CASE WHEN pc.alert_enabled THEN pc.alert_html ELSE NULL END,
         pc.show_alert_on_top, pc.show_alert_at_checkout
  FROM public.tournament_promo_codes pc
  JOIN public.tournaments t ON t.id = pc.tournament_id
  WHERE pc.tournament_id = _tournament_id
    AND pc.is_active = true
    AND pc.auto_apply = true
    AND t.site_published = true
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
    AND (pc.max_uses IS NULL OR COALESCE(pc.current_uses, 0) < pc.max_uses);
$$;
GRANT EXECUTE ON FUNCTION public.get_auto_apply_promo_codes(uuid) TO anon, authenticated;

-- 5) storage: league member photo uploads must target a real league that is accepting public registrations
DROP POLICY IF EXISTS "Public can upload league member photos" ON storage.objects;
DROP POLICY IF EXISTS "League photo uploads require a valid league" ON storage.objects;
CREATE POLICY "League photo uploads require a valid league"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'sponsorship-assets'
    AND (storage.foldername(name))[1] = 'league-member-photos'
    AND (lower(right(name, 4)) IN ('.jpg', '.png') OR lower(right(name, 5)) IN ('.jpeg', '.webp'))
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.golf_leagues l
        WHERE l.id::text = (storage.foldername(name))[2]
          AND (
            public.is_org_member(auth.uid(), l.organization_id)
            OR (
              l.is_public = true
              AND EXISTS (
                SELECT 1 FROM public.league_registration_forms f
                WHERE f.league_id = l.id
              )
            )
          )
      )
    )
  );
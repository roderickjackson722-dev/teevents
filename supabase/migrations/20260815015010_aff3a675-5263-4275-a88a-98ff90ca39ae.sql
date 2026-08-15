CREATE OR REPLACE FUNCTION public.get_public_tournament_site(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(t) - ARRAY[
    'admin_notes','demo_notes','demo_prospect_email','demo_prospect_name',
    'demo_prospect_platform','demo_prospect_other','created_by_admin_id',
    'demo_conversion_token','demo_share_token'
  ]
  FROM public.tournaments t
  WHERE t.site_published = true
    AND (t.custom_slug = _slug OR t.slug = _slug OR t.id::text = _slug)
  ORDER BY (t.custom_slug = _slug) DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tournament_site(text) TO anon, authenticated, service_role;
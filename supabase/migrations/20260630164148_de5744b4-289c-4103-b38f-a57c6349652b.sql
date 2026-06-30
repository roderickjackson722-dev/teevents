
CREATE OR REPLACE FUNCTION public.resolve_public_tournament(_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  custom_slug text,
  title text,
  site_published boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cleaned AS (
    SELECT NULLIF(trim(coalesce(_slug, '')), '') AS s
  ), candidates AS (
    SELECT t.id, t.slug, t.custom_slug, t.title, t.site_published,
      CASE
        WHEN t.slug = c.s THEN 0
        WHEN t.custom_slug = c.s THEN 1
        WHEN t.id::text = c.s THEN 2
        ELSE 9
      END AS rank
    FROM public.tournaments t, cleaned c
    WHERE c.s IS NOT NULL
      AND (t.slug = c.s OR t.custom_slug = c.s OR t.id::text = c.s)
      AND t.site_published = true
  )
  SELECT id, slug, custom_slug, title, site_published
  FROM candidates
  ORDER BY rank ASC, id ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_public_tournament(text) TO anon, authenticated, service_role;

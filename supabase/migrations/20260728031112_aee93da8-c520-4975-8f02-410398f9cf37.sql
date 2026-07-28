-- 1. Registration groups
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS group_leader boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.registration_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  group_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_groups TO authenticated;
GRANT ALL ON public.registration_groups TO service_role;

ALTER TABLE public.registration_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage registration groups"
ON public.registration_groups FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = registration_groups.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = registration_groups.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Admins manage registration groups"
ON public.registration_groups FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_group ON public.tournament_registrations(group_id);
CREATE INDEX IF NOT EXISTS idx_registration_groups_tournament ON public.registration_groups(tournament_id);

CREATE TRIGGER update_registration_groups_updated_at
BEFORE UPDATE ON public.registration_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. League publish status / searchability
ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS allow_search boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Public can view public leagues" ON public.golf_leagues;
CREATE POLICY "Public can view published public leagues"
ON public.golf_leagues FOR SELECT
TO anon, authenticated
USING (is_public = true AND publish_status = 'published');

-- 3. Find-your-league lookup
CREATE OR REPLACE FUNCTION public.find_leagues(_query text)
RETURNS TABLE (
  league_name text,
  league_slug text,
  season_year integer,
  is_active boolean,
  is_member boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.league_name,
         l.league_slug,
         l.season_year,
         l.is_active,
         EXISTS (
           SELECT 1 FROM public.league_members m
           WHERE m.league_id = l.id AND lower(m.email) = lower(btrim(_query))
         ) AS is_member
  FROM public.golf_leagues l
  WHERE l.publish_status = 'published'
    AND l.allow_search = true
    AND length(btrim(coalesce(_query, ''))) >= 3
    AND (
      l.league_name ILIKE '%' || btrim(_query) || '%'
      OR EXISTS (
        SELECT 1 FROM public.league_members m
        WHERE m.league_id = l.id AND lower(m.email) = lower(btrim(_query))
      )
    )
  ORDER BY l.league_name
  LIMIT 20
$$;

GRANT EXECUTE ON FUNCTION public.find_leagues(text) TO anon, authenticated;

-- League courses (per-league, independent of tournament golf_courses)
CREATE TABLE IF NOT EXISTS public.league_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  tee_name TEXT NOT NULL DEFAULT 'Blue',
  par_total INTEGER NOT NULL DEFAULT 72,
  course_rating NUMERIC(4,1) NOT NULL DEFAULT 72.0,
  slope_rating INTEGER NOT NULL DEFAULT 113,
  hole_pars JSONB,
  hole_stroke_indexes JSONB,
  hole_distances JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_courses_league ON public.league_courses(league_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_courses TO authenticated;
GRANT SELECT ON public.league_courses TO anon;
GRANT ALL ON public.league_courses TO service_role;

ALTER TABLE public.league_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view league courses of public leagues"
  ON public.league_courses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.golf_leagues l
    WHERE l.id = league_courses.league_id AND l.is_public = true
  ));

CREATE POLICY "Org members manage league courses"
  ON public.league_courses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.golf_leagues l
    WHERE l.id = league_courses.league_id
      AND public.is_org_member(auth.uid(), l.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.golf_leagues l
    WHERE l.id = league_courses.league_id
      AND public.is_org_member(auth.uid(), l.organization_id)
  ));

CREATE TRIGGER update_league_courses_updated_at
  BEFORE UPDATE ON public.league_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link league_events to league_courses (separate from existing golf_courses FK)
ALTER TABLE public.league_events
  ADD COLUMN IF NOT EXISTS league_course_id UUID REFERENCES public.league_courses(id) ON DELETE SET NULL;

-- Add course_handicap / playing_handicap tracking to league_members
ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS course_handicap INTEGER,
  ADD COLUMN IF NOT EXISTS playing_handicap INTEGER,
  ADD COLUMN IF NOT EXISTS handicap_updated_at TIMESTAMP WITH TIME ZONE;

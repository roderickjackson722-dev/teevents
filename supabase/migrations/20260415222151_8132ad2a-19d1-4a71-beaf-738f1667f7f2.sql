
-- Course information per tournament
CREATE TABLE public.golf_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tee_name TEXT DEFAULT 'White',
  par INTEGER NOT NULL DEFAULT 72,
  course_rating DECIMAL(4,1) NOT NULL DEFAULT 72.0,
  slope_rating INTEGER NOT NULL DEFAULT 113,
  stroke_indexes INTEGER[] DEFAULT NULL, -- array of 18 stroke index values (1-18)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.golf_courses ENABLE ROW LEVEL SECURITY;

-- Org members can manage courses for their tournaments
CREATE POLICY "Org members can manage golf courses"
ON public.golf_courses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = golf_courses.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = golf_courses.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

-- Admins can manage all
CREATE POLICY "Admins can manage all golf courses"
ON public.golf_courses
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Public can view courses for published tournaments
CREATE POLICY "Public can view golf courses"
ON public.golf_courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = golf_courses.tournament_id
    AND t.site_published = true
  )
);

-- Add timestamp trigger
CREATE TRIGGER update_golf_courses_updated_at
BEFORE UPDATE ON public.golf_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add handicap columns to tournament_registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS handicap_index DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS course_handicap INTEGER,
  ADD COLUMN IF NOT EXISTS playing_handicap INTEGER,
  ADD COLUMN IF NOT EXISTS strokes_per_hole JSONB;

-- Add handicap settings to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS handicap_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS handicap_allowance DECIMAL(5,2) DEFAULT 95.0,
  ADD COLUMN IF NOT EXISTS max_handicap INTEGER,
  ADD COLUMN IF NOT EXISTS golf_course_id UUID REFERENCES public.golf_courses(id);

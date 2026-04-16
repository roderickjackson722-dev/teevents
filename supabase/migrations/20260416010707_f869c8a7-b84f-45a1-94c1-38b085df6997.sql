
-- Add missing columns to existing golf_courses table
ALTER TABLE public.golf_courses
  ADD COLUMN IF NOT EXISTS hole_pars JSONB,
  ADD COLUMN IF NOT EXISTS hole_distances JSONB,
  ADD COLUMN IF NOT EXISTS course_address TEXT,
  ADD COLUMN IF NOT EXISTS course_website TEXT,
  ADD COLUMN IF NOT EXISTS course_map_url TEXT;

-- Create course_tee_sets for multiple tee options
CREATE TABLE public.course_tee_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tee_name TEXT NOT NULL,
  par_total INTEGER NOT NULL DEFAULT 72,
  course_rating NUMERIC(4,1) NOT NULL DEFAULT 72.0,
  slope_rating INTEGER NOT NULL DEFAULT 113,
  hole_pars JSONB NOT NULL DEFAULT '[]'::jsonb,
  hole_stroke_indexes JSONB NOT NULL DEFAULT '[]'::jsonb,
  hole_distances JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_tee_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage tee sets"
  ON public.course_tee_sets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = course_tee_sets.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = course_tee_sets.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins can manage all tee sets"
  ON public.course_tee_sets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view tee sets for published tournaments"
  ON public.course_tee_sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = course_tee_sets.tournament_id
    AND t.site_published = true
  ));

-- Auto-update timestamps
CREATE TRIGGER update_course_tee_sets_updated_at
  BEFORE UPDATE ON public.course_tee_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

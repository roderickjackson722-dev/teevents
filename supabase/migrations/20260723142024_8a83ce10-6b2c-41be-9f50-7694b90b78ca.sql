
-- Surveys
CREATE TABLE public.college_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_respondent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.college_surveys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.college_surveys TO authenticated;
GRANT ALL ON public.college_surveys TO service_role;
ALTER TABLE public.college_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active surveys"
  ON public.college_surveys FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage surveys"
  ON public.college_surveys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_college_surveys_updated_at
  BEFORE UPDATE ON public.college_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Questions
CREATE TABLE public.college_survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.college_surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.college_survey_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.college_survey_questions TO authenticated;
GRANT ALL ON public.college_survey_questions TO service_role;
ALTER TABLE public.college_survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions for active surveys"
  ON public.college_survey_questions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.college_surveys s
            WHERE s.id = survey_id AND (s.is_active = true OR public.has_role(auth.uid(), 'admin'::app_role)))
  );

CREATE POLICY "Admins manage questions"
  ON public.college_survey_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_college_survey_questions_survey ON public.college_survey_questions(survey_id, display_order);

-- Responses
CREATE TABLE public.college_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.college_surveys(id) ON DELETE CASCADE,
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_school TEXT,
  respondent_year TEXT,
  respondent_major TEXT,
  respondent_career_goals TEXT,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.college_survey_responses TO authenticated;
GRANT ALL ON public.college_survey_responses TO service_role;
ALTER TABLE public.college_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view responses"
  ON public.college_survey_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete responses"
  ON public.college_survey_responses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_college_survey_responses_survey ON public.college_survey_responses(survey_id, submitted_at DESC);

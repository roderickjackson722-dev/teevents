CREATE TABLE public.faq_question_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 100),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.faq_question_clicks TO anon, authenticated;
GRANT SELECT ON public.faq_question_clicks TO authenticated;
GRANT ALL ON public.faq_question_clicks TO service_role;
ALTER TABLE public.faq_question_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record FAQ clicks" ON public.faq_question_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read FAQ clicks" ON public.faq_question_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
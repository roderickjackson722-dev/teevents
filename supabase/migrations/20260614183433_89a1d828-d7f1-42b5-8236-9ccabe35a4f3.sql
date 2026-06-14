CREATE TABLE public.demo_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_agenda TO authenticated;
GRANT ALL ON public.demo_agenda TO service_role;

ALTER TABLE public.demo_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view demo agenda"
  ON public.demo_agenda FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert demo agenda"
  ON public.demo_agenda FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update demo agenda"
  ON public.demo_agenda FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete demo agenda"
  ON public.demo_agenda FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_demo_agenda_updated_at
  BEFORE UPDATE ON public.demo_agenda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
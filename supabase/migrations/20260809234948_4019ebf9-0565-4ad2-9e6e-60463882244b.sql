CREATE TABLE public.pairings_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  start_type text NOT NULL DEFAULT 'tee_time',
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pairings_templates TO authenticated;
GRANT ALL ON public.pairings_templates TO service_role;

ALTER TABLE public.pairings_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage pairings templates"
ON public.pairings_templates FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members m ON m.organization_id = t.organization_id
    WHERE t.id = pairings_templates.tournament_id AND m.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.org_members m ON m.organization_id = t.organization_id
    WHERE t.id = pairings_templates.tournament_id AND m.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_pairings_templates_tournament ON public.pairings_templates(tournament_id);

CREATE TRIGGER update_pairings_templates_updated_at
BEFORE UPDATE ON public.pairings_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
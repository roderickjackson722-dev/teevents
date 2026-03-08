
CREATE TABLE public.outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outreach templates"
  ON public.outreach_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read outreach templates"
  ON public.outreach_templates FOR SELECT
  TO authenticated
  USING (true);

-- Add last_email_template column to prospects
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS last_email_template text;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz;

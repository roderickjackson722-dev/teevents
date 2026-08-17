CREATE TABLE public.lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  cover_image_url TEXT,
  article_type TEXT NOT NULL DEFAULT 'pdf',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_magnet_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_magnet_article_categories (
  article_id UUID NOT NULL REFERENCES public.lead_magnets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.lead_magnet_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);

CREATE TABLE public.lead_magnet_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_magnet_id UUID REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization_name TEXT,
  tournament_name TEXT,
  tournament_date DATE,
  expected_players INTEGER,
  current_tools TEXT,
  challenge TEXT,
  notes TEXT,
  sample_created BOOLEAN NOT NULL DEFAULT FALSE,
  sample_request_id UUID REFERENCES public.sample_requests(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_magnet_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lead_magnet_leads(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lm_leads_magnet ON public.lead_magnet_leads(lead_magnet_id);
CREATE INDEX idx_lm_followups_due ON public.lead_magnet_followups(scheduled_for) WHERE sent_at IS NULL;

GRANT SELECT ON public.lead_magnets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnets TO authenticated;
GRANT ALL ON public.lead_magnets TO service_role;

GRANT SELECT ON public.lead_magnet_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnet_categories TO authenticated;
GRANT ALL ON public.lead_magnet_categories TO service_role;

GRANT SELECT ON public.lead_magnet_article_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnet_article_categories TO authenticated;
GRANT ALL ON public.lead_magnet_article_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnet_leads TO authenticated;
GRANT ALL ON public.lead_magnet_leads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnet_followups TO authenticated;
GRANT ALL ON public.lead_magnet_followups TO service_role;

ALTER TABLE public.lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published lead magnets are public"
ON public.lead_magnets FOR SELECT TO anon, authenticated USING (is_published = true);

CREATE POLICY "Admins manage lead magnets"
ON public.lead_magnets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Categories are public"
ON public.lead_magnet_categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage lead magnet categories"
ON public.lead_magnet_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Article categories are public"
ON public.lead_magnet_article_categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage article categories"
ON public.lead_magnet_article_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lead magnet leads"
ON public.lead_magnet_leads FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lead magnet followups"
ON public.lead_magnet_followups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lead_magnets_updated_at
BEFORE UPDATE ON public.lead_magnets
FOR EACH ROW EXECUTE FUNCTION public.pe_touch_updated_at();

CREATE POLICY "Admins read lead magnet files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-magnets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload lead magnet files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-magnets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update lead magnet files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lead-magnets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete lead magnet files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-magnets' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.lead_magnet_categories (name, slug, description) VALUES
  ('Planning', 'planning', 'Timelines, checklists, and event setup'),
  ('Sponsors & Fundraising', 'sponsors-fundraising', 'Sponsor packages, auctions, and donations'),
  ('Scoring & Day Of', 'scoring-day-of', 'Pairings, scoring formats, and live leaderboards');
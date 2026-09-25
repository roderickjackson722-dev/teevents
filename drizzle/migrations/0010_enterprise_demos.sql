CREATE TABLE public.enterprise_demos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE DEFAULT substr(md5(random()::text),1,10),
  club_name text NOT NULL,
  event_name text NOT NULL DEFAULT 'Member-Guest Classic',
  location text,
  logo_url text,
  primary_color text DEFAULT '#1a5c38',
  accent_color text DEFAULT '#F5A623',
  events text[] NOT NULL DEFAULT ARRAY['Member-Guest Classic','Tuesday Night Men''s League','Ladies 9-Hole League','Club Championship'],
  players text[] NOT NULL DEFAULT ARRAY['Mike Johnson','Sarah Lee','David Kim','Chris Evans'],
  recipient_name text,
  recipient_email text,
  view_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.enterprise_demos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_demos TO authenticated;
GRANT ALL ON public.enterprise_demos TO service_role;
ALTER TABLE public.enterprise_demos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage enterprise demos" ON public.enterprise_demos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.get_enterprise_demo(_slug text)
RETURNS TABLE(club_name text, event_name text, location text, logo_url text, primary_color text, accent_color text, events text[], players text[])
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.enterprise_demos SET view_count = view_count + 1 WHERE slug = _slug
  RETURNING club_name, event_name, location, logo_url, primary_color, accent_color, events, players;
$$;
REVOKE SELECT ON public.enterprise_demos FROM anon;
GRANT EXECUTE ON FUNCTION public.get_enterprise_demo(text) TO anon, authenticated;
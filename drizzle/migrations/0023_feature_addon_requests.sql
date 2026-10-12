CREATE TABLE public.feature_addon_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 addon_key text NOT NULL,
 event_name text NOT NULL,
 contact_name text NOT NULL,
 contact_email text NOT NULL,
 contact_phone text NOT NULL,
 contact_notes text,
 divisions integer NOT NULL DEFAULT 1,
 amount_cents integer NOT NULL DEFAULT 9900,
 stripe_session_id text UNIQUE,
 status text NOT NULL DEFAULT 'pending',
 tournament_id uuid REFERENCES public.tournaments(id),
 fulfilled_by uuid,
 fulfilled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_addon_requests TO authenticated;
GRANT ALL ON public.feature_addon_requests TO service_role;
ALTER TABLE public.feature_addon_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feature add-on requests" ON public.feature_addon_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX feature_addon_requests_created_idx ON public.feature_addon_requests(created_at DESC);
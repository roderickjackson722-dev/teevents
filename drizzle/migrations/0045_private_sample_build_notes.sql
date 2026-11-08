CREATE TABLE public.sample_build_notes (
  sample_id uuid PRIMARY KEY REFERENCES public.sample_tournaments(id) ON DELETE CASCADE,
  admin_notes text,
  organizer_mode text NOT NULL DEFAULT 'defer',
  organizer_email text,
  organizer_organization text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_build_notes TO authenticated;
GRANT ALL ON public.sample_build_notes TO service_role;
ALTER TABLE public.sample_build_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage sample build notes" ON public.sample_build_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.sample_build_notes IS 'Private admin-only sample notes and deferred organizer choices; never creates or assigns accounts.';
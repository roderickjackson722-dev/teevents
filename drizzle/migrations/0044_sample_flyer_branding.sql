ALTER TABLE public.sample_tournaments ADD COLUMN IF NOT EXISTS course_name text, ADD COLUMN IF NOT EXISTS background_color text;
COMMENT ON COLUMN public.sample_tournaments.course_name IS 'Flyer or admin-provided course for isolated sample pages only.';
COMMENT ON COLUMN public.sample_tournaments.background_color IS 'Admin-reviewed sample page background color; null preserves existing sample appearance.';
GRANT SELECT (course_name, background_color) ON public.sample_tournaments TO anon, authenticated;
GRANT INSERT (course_name, background_color), UPDATE (course_name, background_color) ON public.sample_tournaments TO authenticated;
GRANT ALL ON public.sample_tournaments TO service_role;
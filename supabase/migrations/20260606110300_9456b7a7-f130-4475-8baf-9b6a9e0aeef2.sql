
ALTER TABLE public.course_database
  ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS saved_course_id uuid REFERENCES public.course_database(id) ON DELETE SET NULL;

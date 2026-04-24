ALTER TABLE public.golf_trips
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.golf_trips.is_published IS 'When false, /trips/:id and the public share view are gated behind the organizer/admin only.';
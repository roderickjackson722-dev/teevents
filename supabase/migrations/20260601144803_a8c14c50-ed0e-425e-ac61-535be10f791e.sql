ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS day_of_send_link_in_confirmation boolean NOT NULL DEFAULT true;
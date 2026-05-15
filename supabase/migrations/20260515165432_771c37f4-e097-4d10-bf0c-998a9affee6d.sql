ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS description_html TEXT;
ALTER TABLE public.side_events ADD COLUMN IF NOT EXISTS hide_ticket_count BOOLEAN NOT NULL DEFAULT FALSE;
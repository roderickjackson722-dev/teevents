ALTER TABLE public.side_events
  ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.side_event_tickets
  ADD COLUMN IF NOT EXISTS custom_answers JSONB;
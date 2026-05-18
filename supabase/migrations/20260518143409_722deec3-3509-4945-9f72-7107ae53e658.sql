ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS day_of_page_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_of_page_mode TEXT DEFAULT 'preview',
  ADD COLUMN IF NOT EXISTS day_of_welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS day_of_announcements TEXT,
  ADD COLUMN IF NOT EXISTS day_of_course_map_url TEXT,
  ADD COLUMN IF NOT EXISTS day_of_sponsor_title TEXT,
  ADD COLUMN IF NOT EXISTS day_of_sponsor_thanks TEXT,
  ADD COLUMN IF NOT EXISTS day_of_pairings_url TEXT,
  ADD COLUMN IF NOT EXISTS day_of_rules_url TEXT,
  ADD COLUMN IF NOT EXISTS day_of_director_name TEXT,
  ADD COLUMN IF NOT EXISTS day_of_director_phone TEXT,
  ADD COLUMN IF NOT EXISTS day_of_director_email TEXT,
  ADD COLUMN IF NOT EXISTS day_of_emergency_contact TEXT;
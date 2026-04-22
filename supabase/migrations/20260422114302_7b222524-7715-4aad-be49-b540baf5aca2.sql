-- Add public tabs visibility & ordering controls to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS public_tabs JSONB DEFAULT '{
    "leaderboard": true,
    "sponsors": true,
    "gallery": false,
    "volunteers": false,
    "auction": true,
    "donations": true,
    "course_details": true,
    "contests": false,
    "travel": false,
    "schedule": true
  }'::jsonb;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS public_tabs_order TEXT[] DEFAULT ARRAY[
    'leaderboard', 'sponsors', 'auction', 'donations',
    'course_details', 'schedule', 'gallery', 'volunteers',
    'contests', 'travel'
  ];

-- Backfill any existing rows that ended up NULL (defaults only apply to new rows in some scenarios)
UPDATE public.tournaments
SET public_tabs = '{
  "leaderboard": true,
  "sponsors": true,
  "gallery": false,
  "volunteers": false,
  "auction": true,
  "donations": true,
  "course_details": true,
  "contests": false,
  "travel": false,
  "schedule": true
}'::jsonb
WHERE public_tabs IS NULL;

UPDATE public.tournaments
SET public_tabs_order = ARRAY[
  'leaderboard', 'sponsors', 'auction', 'donations',
  'course_details', 'schedule', 'gallery', 'volunteers',
  'contests', 'travel'
]
WHERE public_tabs_order IS NULL;

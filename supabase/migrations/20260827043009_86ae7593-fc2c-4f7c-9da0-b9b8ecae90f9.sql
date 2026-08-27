ALTER TABLE public.college_tournaments
  ADD COLUMN IF NOT EXISTS player_roster_fields jsonb NOT NULL DEFAULT '[
    {"id":"first_name","label":"First Name","type":"text","required":true,"editable":false,"visible":true},
    {"id":"last_name","label":"Last Name","type":"text","required":true,"editable":false,"visible":true},
    {"id":"year","label":"Year","type":"select","required":false,"editable":true,"visible":true,"options":["Freshman","Sophomore","Junior","Senior","Graduate"]},
    {"id":"position","label":"Position","type":"select","required":false,"editable":true,"visible":true,"options":["1","2","3","4","5","Alternate"]},
    {"id":"shirt_size","label":"Shirt Size","type":"select","required":false,"editable":true,"visible":true,"options":["XS","S","M","L","XL","2XL","3XL"]}
  ]'::jsonb;

ALTER TABLE public.college_tournament_players
  ADD COLUMN IF NOT EXISTS shirt_size text,
  ADD COLUMN IF NOT EXISTS custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.college_tournaments
SET player_roster_fields = '[
  {"id":"first_name","label":"First Name","type":"text","required":true,"editable":false,"visible":true},
  {"id":"last_name","label":"Last Name","type":"text","required":true,"editable":false,"visible":true},
  {"id":"year","label":"Year","type":"select","required":false,"editable":true,"visible":true,"options":["Freshman","Sophomore","Junior","Senior","Graduate"]},
  {"id":"position","label":"Position","type":"select","required":false,"editable":true,"visible":true,"options":["1","2","3","4","5","Alternate"]},
  {"id":"shirt_size","label":"Shirt Size","type":"select","required":false,"editable":true,"visible":true,"options":["XS","S","M","L","XL","2XL","3XL"]}
]'::jsonb
WHERE player_roster_fields IS NULL;
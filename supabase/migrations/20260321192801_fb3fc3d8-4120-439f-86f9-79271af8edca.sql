ALTER TABLE public.college_tournaments ADD COLUMN IF NOT EXISTS registration_fields jsonb DEFAULT '[
  {"id":"school_name","label":"School Name","type":"text","required":true,"editable":false},
  {"id":"coach_name","label":"Head Coach Name","type":"text","required":true,"editable":false},
  {"id":"coach_email","label":"Coach Email","type":"email","required":true,"editable":false},
  {"id":"notes","label":"Notes","type":"text","required":false,"editable":true}
]'::jsonb;
ALTER TABLE public.events ADD COLUMN sort_order integer DEFAULT 0;

-- Set initial sort order based on current date ordering
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY date DESC NULLS LAST) - 1 AS rn
  FROM public.events
)
UPDATE public.events SET sort_order = numbered.rn FROM numbered WHERE events.id = numbered.id;
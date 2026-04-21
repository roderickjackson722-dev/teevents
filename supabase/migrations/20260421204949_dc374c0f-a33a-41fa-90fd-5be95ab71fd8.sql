-- Backfill `state` from `location` text for tournaments missing a state.
-- Looks for any 2-letter US state code appearing as a token in the location.
UPDATE public.tournaments t
SET state = sub.code
FROM (
  SELECT id,
    (regexp_match(
       upper(location),
       '\m(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\M'
    ))[1] AS code
  FROM public.tournaments
  WHERE state IS NULL AND location IS NOT NULL
) sub
WHERE t.id = sub.id AND sub.code IS NOT NULL AND t.state IS NULL;
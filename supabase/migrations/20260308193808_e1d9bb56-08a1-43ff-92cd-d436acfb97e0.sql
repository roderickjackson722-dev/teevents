
-- Add scoring_code column for QR-based live scoring access
ALTER TABLE public.tournament_registrations 
ADD COLUMN scoring_code text UNIQUE;

-- Create function to auto-generate scoring codes on insert
CREATE OR REPLACE FUNCTION public.generate_scoring_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.scoring_code IS NULL OR NEW.scoring_code = '' THEN
    NEW.scoring_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 6));
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.tournament_registrations WHERE scoring_code = NEW.scoring_code AND id != NEW.id) LOOP
      NEW.scoring_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 6));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate scoring codes
CREATE TRIGGER generate_scoring_code_trigger
BEFORE INSERT ON public.tournament_registrations
FOR EACH ROW
EXECUTE FUNCTION public.generate_scoring_code();

-- Backfill existing registrations with scoring codes
UPDATE public.tournament_registrations 
SET scoring_code = upper(substr(md5(id::text || now()::text || random()::text), 1, 6))
WHERE scoring_code IS NULL;

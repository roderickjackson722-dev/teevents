
-- Discount + test-mode tracking on the existing real-demo flow (tournaments)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS demo_conversion_discount_type text,
  ADD COLUMN IF NOT EXISTS demo_conversion_discount_value integer,
  ADD COLUMN IF NOT EXISTS demo_conversion_is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_conversion_claimed_by uuid,
  ADD COLUMN IF NOT EXISTS demo_conversion_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_test_converted_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_demo_disc_type_chk'
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_demo_disc_type_chk
      CHECK (demo_conversion_discount_type IS NULL OR demo_conversion_discount_type IN ('none','percentage','fixed','free_pro'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.demo_conversion_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  conversion_token text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('none','percentage','fixed','free_pro')),
  discount_value integer,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_conversion_discounts_token_idx
  ON public.demo_conversion_discounts (conversion_token);

GRANT SELECT ON public.demo_conversion_discounts TO authenticated;
GRANT ALL ON public.demo_conversion_discounts TO service_role;

ALTER TABLE public.demo_conversion_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage demo conversion discounts"
  ON public.demo_conversion_discounts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RPC the future Pro checkout will call to read & consume a discount by token
CREATE OR REPLACE FUNCTION public.get_demo_conversion_discount(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'discount_type', d.discount_type,
    'discount_value', d.discount_value,
    'used', d.used,
    'tournament_id', d.tournament_id
  )
  FROM public.demo_conversion_discounts d
  WHERE d.conversion_token = _token AND d.used = false
  ORDER BY d.created_at DESC
  LIMIT 1;
$$;

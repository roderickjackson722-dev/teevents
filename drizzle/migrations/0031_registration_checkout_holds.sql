CREATE TABLE public.registration_checkout_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  team_name text,
  group_name text,
  players jsonb NOT NULL,
  claimed_at timestamptz,
  registration_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.registration_checkout_holds TO service_role;
ALTER TABLE public.registration_checkout_holds ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.registration_checkout_holds IS 'Private checkout details for online registrations; roster rows are created only after Stripe confirms payment.';
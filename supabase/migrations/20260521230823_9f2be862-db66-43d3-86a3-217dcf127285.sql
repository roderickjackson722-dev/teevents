ALTER TABLE public.tournament_registrations
  DROP CONSTRAINT IF EXISTS tournament_registrations_tier_id_fkey,
  ADD CONSTRAINT tournament_registrations_tier_id_fkey
    FOREIGN KEY (tier_id) REFERENCES public.tournament_registration_tiers(id) ON DELETE SET NULL;

ALTER TABLE public.sponsor_registrations
  DROP CONSTRAINT IF EXISTS sponsor_registrations_tier_id_fkey,
  ADD CONSTRAINT sponsor_registrations_tier_id_fkey
    FOREIGN KEY (tier_id) REFERENCES public.sponsorship_tiers(id) ON DELETE SET NULL;
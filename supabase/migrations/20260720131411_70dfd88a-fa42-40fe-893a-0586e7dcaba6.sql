
-- league_events enhancements
ALTER TABLE public.league_events
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS skins_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skins_mode text NOT NULL DEFAULT 'gross',
  ADD COLUMN IF NOT EXISTS skins_carryover boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skins_value_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pass_platform_fee_to_player boolean NOT NULL DEFAULT false;

-- league_event_registrations enhancements
ALTER TABLE public.league_event_registrations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS waitlist_position integer,
  ADD COLUMN IF NOT EXISTS fee_paid boolean;

-- point systems: standings mode
ALTER TABLE public.league_point_systems
  ADD COLUMN IF NOT EXISTS standings_mode text NOT NULL DEFAULT 'points';

-- league_messages
CREATE TABLE IF NOT EXISTS public.league_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_messages TO authenticated;
GRANT ALL ON public.league_messages TO service_role;

ALTER TABLE public.league_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view league messages"
  ON public.league_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.golf_leagues l
      WHERE l.id = league_messages.league_id
        AND public.is_org_member(auth.uid(), l.organization_id)
    )
  );

CREATE POLICY "org members can create league messages"
  ON public.league_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.golf_leagues l
      WHERE l.id = league_messages.league_id
        AND public.is_org_member(auth.uid(), l.organization_id)
    )
  );

CREATE POLICY "admins full access league messages"
  ON public.league_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

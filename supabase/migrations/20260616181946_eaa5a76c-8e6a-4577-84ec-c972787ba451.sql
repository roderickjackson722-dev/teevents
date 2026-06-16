
-- 1. Demo conversion token hardening
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS demo_conversion_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_conversion_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_share_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS tournaments_demo_share_token_uidx
  ON public.tournaments (demo_share_token) WHERE demo_share_token IS NOT NULL;

-- 2. Admin competitors table
CREATE TABLE IF NOT EXISTS public.admin_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  talking_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_competitors TO authenticated;
GRANT ALL ON public.admin_competitors TO service_role;

ALTER TABLE public.admin_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage competitors"
  ON public.admin_competitors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_admin_competitors_updated_at
  BEFORE UPDATE ON public.admin_competitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed built-in competitors
INSERT INTO public.admin_competitors (name, slug, talking_points, sort_order) VALUES
  ('Google Forms / Spreadsheets', 'google_forms', '[
    {"pain":"Juggling multiple spreadsheets","solution":"All-in-one dashboard – players, payments, sponsors, pairings"},
    {"pain":"Manual payment tracking","solution":"Stripe integration – automatic checkout, instant payouts"},
    {"pain":"No professional website","solution":"Branded tournament site – live in 10 minutes"},
    {"pain":"No live scoring","solution":"Players enter scores via QR code – leaderboard updates live"},
    {"pain":"No sponsor management","solution":"Sponsor portal, asset delivery, ROI tracking"},
    {"pain":"No volunteer coordination","solution":"Shift scheduling, QR check-in, automated reminders"}
  ]'::jsonb, 1),
  ('Eventbrite', 'eventbrite', '[
    {"pain":"No live leaderboard","solution":"Built-in live leaderboard with gross/net toggle"},
    {"pain":"No hole sponsors","solution":"Dedicated sponsor management with asset delivery"},
    {"pain":"No volunteer check-in","solution":"QR code check-in for volunteers and players"},
    {"pain":"No pairings or tee sheets","solution":"Drag-and-drop pairings with hole assignments"},
    {"pain":"Funds held until after event","solution":"Stripe Connect – automatic payouts (no holding)"},
    {"pain":"High fees","solution":"5% platform fee vs. Eventbrite''s 8.5%+"}
  ]'::jsonb, 2),
  ('Zeffy / GiveButter', 'zeffy_givebutter', '[
    {"pain":"General fundraising platform","solution":"Built specifically for golf tournaments"},
    {"pain":"No live scoring","solution":"QR scoring with live leaderboard"},
    {"pain":"No pairings or tee sheets","solution":"Drag-and-drop pairings with hole assignments"},
    {"pain":"No sponsor management","solution":"Sponsor portal with asset delivery"},
    {"pain":"Limited customization","solution":"Branded tournament website with custom domain"}
  ]'::jsonb, 3),
  ('Golf Genius', 'golf_genius', '[
    {"pain":"Expensive per-event pricing","solution":"$399 per tournament with no per-player surcharge"},
    {"pain":"Steep learning curve","solution":"Setup wizard – live site in 10 minutes"},
    {"pain":"No integrated payments","solution":"Stripe Connect built in – automatic payouts"},
    {"pain":"Dated public site design","solution":"Modern branded tournament site templates"}
  ]'::jsonb, 4),
  ('Another platform', 'other', '[
    {"pain":"Disconnected tools","solution":"One platform for registration, payments, scoring, sponsors, and reporting"},
    {"pain":"Manual work day-of","solution":"QR check-in, live scoring, automated leaderboard"},
    {"pain":"Slow or held payouts","solution":"Stripe Connect direct payouts to your bank"}
  ]'::jsonb, 99)
ON CONFLICT (slug) DO NOTHING;

-- 3. Public read RPC for shareable demo prep checklist (token-gated, no PII)
CREATE OR REPLACE FUNCTION public.get_demo_prep_share(_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tournament_title', t.title,
    'prospect_name', t.demo_prospect_name,
    'platform', t.demo_prospect_platform,
    'platform_other', t.demo_prospect_other,
    'notes', t.demo_notes,
    'checklist', COALESCE(t.demo_checklist, '{}'::jsonb),
    'talking_points', COALESCE(
      (SELECT c.talking_points FROM public.admin_competitors c
        WHERE c.slug = t.demo_prospect_platform LIMIT 1),
      '[]'::jsonb
    ),
    'converted', t.demo_converted_at IS NOT NULL
  )
  FROM public.tournaments t
  WHERE t.demo_share_token = _token
    AND t.is_demo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_demo_prep_share(uuid) TO anon, authenticated;

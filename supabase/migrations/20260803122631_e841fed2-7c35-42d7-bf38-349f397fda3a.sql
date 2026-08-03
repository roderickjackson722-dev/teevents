ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS add_on_display_location TEXT NOT NULL DEFAULT 'both';

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_add_on_display_location_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_add_on_display_location_check
  CHECK (add_on_display_location IN ('registration', 'addon_page', 'both'));

CREATE TABLE IF NOT EXISTS public.tournament_addon_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  buyer_name TEXT,
  buyer_email TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_addon_orders_tournament_idx ON public.tournament_addon_orders(tournament_id);
CREATE INDEX IF NOT EXISTS tournament_addon_orders_session_idx ON public.tournament_addon_orders(stripe_session_id);

GRANT SELECT ON public.tournament_addon_orders TO authenticated;
GRANT ALL ON public.tournament_addon_orders TO service_role;

ALTER TABLE public.tournament_addon_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view addon orders"
ON public.tournament_addon_orders
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_addon_orders.tournament_id
    AND public.is_org_member(auth.uid(), t.organization_id)
));

CREATE POLICY "Admins can view addon orders"
ON public.tournament_addon_orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tournament_addon_orders_updated_at
BEFORE UPDATE ON public.tournament_addon_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
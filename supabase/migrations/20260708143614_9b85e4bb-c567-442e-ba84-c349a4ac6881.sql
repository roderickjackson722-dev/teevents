
-- public_events
CREATE TABLE public.public_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  event_title TEXT NOT NULL,
  event_slug TEXT NOT NULL UNIQUE,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  address TEXT,
  hero_image_url TEXT,
  description_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','sold_out')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_public_events_status_date ON public.public_events(status, event_date);
CREATE INDEX idx_public_events_slug ON public.public_events(event_slug);

GRANT SELECT ON public.public_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_events TO authenticated;
GRANT ALL ON public.public_events TO service_role;

ALTER TABLE public.public_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_events_public_read"
  ON public.public_events FOR SELECT
  USING (status IN ('published','sold_out','archived'));

CREATE POLICY "public_events_admin_read_all"
  ON public.public_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public_events_admin_insert"
  ON public.public_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public_events_admin_update"
  ON public.public_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public_events_admin_delete"
  ON public.public_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- event_ticket_tiers
CREATE TABLE public.event_ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  max_quantity INTEGER,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_ticket_tiers_event ON public.event_ticket_tiers(event_id);

GRANT SELECT ON public.event_ticket_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_ticket_tiers TO authenticated;
GRANT ALL ON public.event_ticket_tiers TO service_role;

ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_ticket_tiers_public_read"
  ON public.event_ticket_tiers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.public_events e
    WHERE e.id = event_id AND e.status IN ('published','sold_out','archived')
  ));

CREATE POLICY "event_ticket_tiers_admin_all"
  ON public.event_ticket_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- event_ticket_purchases
CREATE TABLE public.event_ticket_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.public_events(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.event_ticket_tiers(id) ON DELETE CASCADE,
  buyer_name TEXT,
  buyer_email TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_cents INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_ticket_purchases_event ON public.event_ticket_purchases(event_id);
CREATE INDEX idx_event_ticket_purchases_session ON public.event_ticket_purchases(stripe_session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_ticket_purchases TO authenticated;
GRANT ALL ON public.event_ticket_purchases TO service_role;

ALTER TABLE public.event_ticket_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_ticket_purchases_admin_read"
  ON public.event_ticket_purchases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Increment ticket sold count (server-side only via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_event_ticket_sold(_tier_id UUID, _qty INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.event_ticket_tiers
    SET sold_quantity = sold_quantity + _qty,
        updated_at = now()
  WHERE id = _tier_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_event_ticket_sold(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_event_ticket_sold(UUID, INTEGER) TO service_role;

-- Auto-flip event to sold_out when all tiers full
CREATE OR REPLACE FUNCTION public.check_event_sold_out()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id UUID := NEW.event_id;
  _total INTEGER;
  _full INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE max_quantity IS NOT NULL AND sold_quantity >= max_quantity)
    INTO _total, _full
    FROM public.event_ticket_tiers
   WHERE event_id = _event_id;

  IF _total > 0 AND _total = _full THEN
    UPDATE public.public_events
       SET status = 'sold_out', updated_at = now()
     WHERE id = _event_id AND status = 'published';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_ticket_tiers_check_sold_out
AFTER UPDATE OF sold_quantity ON public.event_ticket_tiers
FOR EACH ROW EXECUTE FUNCTION public.check_event_sold_out();

-- updated_at triggers (reuse existing helper if present, else create local)
CREATE OR REPLACE FUNCTION public.pe_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_public_events_updated_at BEFORE UPDATE ON public.public_events
FOR EACH ROW EXECUTE FUNCTION public.pe_touch_updated_at();

CREATE TRIGGER trg_event_ticket_tiers_updated_at BEFORE UPDATE ON public.event_ticket_tiers
FOR EACH ROW EXECUTE FUNCTION public.pe_touch_updated_at();

CREATE TRIGGER trg_event_ticket_purchases_updated_at BEFORE UPDATE ON public.event_ticket_purchases
FOR EACH ROW EXECUTE FUNCTION public.pe_touch_updated_at();

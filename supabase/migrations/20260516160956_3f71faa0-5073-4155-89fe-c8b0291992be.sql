
-- 1) site_visits: remove world-open ALL policy; expose narrow insert via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Allow service role full access" ON public.site_visits;

-- Service role bypasses RLS by definition; admins can read everything for analytics
DROP POLICY IF EXISTS "Admins can read site visits" ON public.site_visits;
CREATE POLICY "Admins can read site visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public insert via SECURITY DEFINER function only
CREATE OR REPLACE FUNCTION public.record_site_visit(
  _path text,
  _referrer text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _city text DEFAULT NULL,
  _country text DEFAULT NULL,
  _ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.site_visits (path, referrer, user_agent, city, country, ip)
  VALUES (
    left(coalesce(_path, ''), 500),
    NULLIF(left(coalesce(_referrer, ''), 500), ''),
    NULLIF(left(coalesce(_user_agent, ''), 500), ''),
    NULLIF(left(coalesce(_city, ''), 100), ''),
    NULLIF(left(coalesce(_country, ''), 100), ''),
    NULLIF(left(coalesce(_ip, ''), 64), '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_site_visit(text, text, text, text, text, text) TO anon, authenticated;

-- 2) tournament_refund_requests: drop USING(true) public SELECT; add claim_token + lookup RPC
DROP POLICY IF EXISTS "Public can view own refund requests" ON public.tournament_refund_requests;

ALTER TABLE public.tournament_refund_requests
  ADD COLUMN IF NOT EXISTS claim_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS tournament_refund_requests_claim_token_idx
  ON public.tournament_refund_requests(claim_token);

CREATE OR REPLACE FUNCTION public.get_refund_request_by_token(_token uuid)
RETURNS SETOF public.tournament_refund_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.tournament_refund_requests WHERE claim_token = _token LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_refund_request_by_token(uuid) TO anon, authenticated;

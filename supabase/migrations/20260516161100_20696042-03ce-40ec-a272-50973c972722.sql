
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
  INSERT INTO public.site_visits (page_url, referrer, user_agent, city, country, ip_address)
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

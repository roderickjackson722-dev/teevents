DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'tournaments'
    AND column_name NOT IN (
      'admin_notes',
      'demo_notes',
      'demo_prospect_email',
      'demo_prospect_name',
      'demo_prospect_platform',
      'demo_prospect_other',
      'created_by_admin_id',
      'demo_conversion_token',
      'demo_share_token'
    );

  EXECUTE 'REVOKE SELECT ON public.tournaments FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.tournaments TO anon', cols);
END $$;

CREATE OR REPLACE FUNCTION public.get_demo_claim_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  title text,
  demo_prospect_email text,
  demo_prospect_name text,
  demo_converted_at timestamptz,
  demo_conversion_token_expires_at timestamptz,
  demo_conversion_used_at timestamptz,
  demo_conversion_discount_type text,
  demo_conversion_discount_value numeric,
  demo_conversion_is_test boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.demo_prospect_email, t.demo_prospect_name,
         t.demo_converted_at, t.demo_conversion_token_expires_at, t.demo_conversion_used_at,
         t.demo_conversion_discount_type::text, t.demo_conversion_discount_value::numeric, t.demo_conversion_is_test
  FROM public.tournaments t
  WHERE _token IS NOT NULL
    AND t.demo_conversion_token = _token
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_demo_claim_by_token(uuid) TO anon, authenticated;
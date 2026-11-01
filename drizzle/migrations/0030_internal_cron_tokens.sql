CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_cron_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_cron_tokens TO service_role;
ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_cron_tokens (name) VALUES ('domain_renewal') ON CONFLICT (name) DO NOTHING;
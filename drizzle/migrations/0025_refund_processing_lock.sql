CREATE TABLE public.refund_processing_locks (registration_id uuid PRIMARY KEY, refund_record_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.refund_processing_locks TO service_role;
ALTER TABLE public.refund_processing_locks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.refund_processing_locks IS 'Service-only per-registration lock prevents concurrent Stripe refund submissions; unresolved attempts remain locked for deliberate reconciliation.';
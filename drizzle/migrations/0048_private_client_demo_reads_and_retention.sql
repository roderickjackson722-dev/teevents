ALTER POLICY "Anyone can view sample tournaments" ON public.tournaments USING (is_sample = true AND client_sample_id IS NULL);
CREATE OR REPLACE FUNCTION public.delete_old_demo_tournaments() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE deleted_count integer;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can run demo cleanup'; END IF;
 WITH deleted AS (DELETE FROM public.tournaments WHERE is_demo=true AND client_sample_id IS NULL AND created_at < now()-interval '30 days' RETURNING id) SELECT count(*) INTO deleted_count FROM deleted;
 RETURN deleted_count;
END $$;
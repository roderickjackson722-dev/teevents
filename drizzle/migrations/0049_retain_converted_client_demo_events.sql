CREATE OR REPLACE FUNCTION public.retain_converted_client_demo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.tournaments WHERE client_sample_id=OLD.id AND is_converted_from_sample=true) THEN RAISE EXCEPTION 'This sample is linked to a client event and cannot be deleted. Manage the client event separately.'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER retain_converted_client_demo BEFORE DELETE ON public.sample_tournaments FOR EACH ROW EXECUTE FUNCTION public.retain_converted_client_demo();
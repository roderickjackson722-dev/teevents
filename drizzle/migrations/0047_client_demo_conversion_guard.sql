CREATE OR REPLACE FUNCTION public.protect_client_demo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.client_sample_id IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND COALESCE(current_setting('request.jwt.claim.role',true),'') <> 'service_role' AND COALESCE(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
  IF TG_OP='INSERT' OR NOT COALESCE(OLD.is_converted_from_sample,false) THEN RAISE EXCEPTION 'Admin access required for client demos'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.client_sample_id IS NOT NULL AND NEW.client_sample_id IS DISTINCT FROM OLD.client_sample_id THEN RAISE EXCEPTION 'Client sample identity cannot be changed'; END IF;
 IF TG_OP='UPDATE' AND OLD.client_sample_id IS NOT NULL AND NEW.is_converted_from_sample IS DISTINCT FROM OLD.is_converted_from_sample AND COALESCE(current_setting('teevents.client_demo_conversion',true),'') <> OLD.client_sample_id::text THEN RAISE EXCEPTION 'Use the admin conversion action'; END IF;
 IF NEW.client_sample_id IS NOT NULL AND NOT COALESCE(NEW.is_converted_from_sample,false) THEN
  NEW.is_demo:=true; NEW.is_sample:=true; NEW.site_published:=false; NEW.registration_open:=false; NEW.show_in_public_search:=false; NEW.status:='draft';
  IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Convert the sample before assigning its organization'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.convert_client_demo(_sample_id uuid,_organization_id uuid,_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sample_tournaments%ROWTYPE; t public.tournaments%ROWTYPE; owner_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO s FROM public.sample_tournaments WHERE id=_sample_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sample not found'; END IF;
 SELECT * INTO t FROM public.tournaments WHERE client_sample_id=s.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Open the sample dashboard first'; END IF;
 IF t.is_converted_from_sample THEN RAISE EXCEPTION 'Sample already converted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=_organization_id AND client_demo_sample_id IS NULL) THEN RAISE EXCEPTION 'Choose a client organization'; END IF;
 SELECT user_id INTO owner_id FROM public.org_members WHERE organization_id=_organization_id AND role='owner' ORDER BY created_at LIMIT 1;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'The client must have an organizer account before conversion'; END IF;
 PERFORM set_config('teevents.client_demo_conversion',s.id::text,true);
 UPDATE public.tournaments SET organization_id=_organization_id,is_converted_from_sample=true,is_sample=false,is_demo=false,is_pro=false,sample_converted_at=now(),sample_converted_to=owner_id,site_published=false,registration_open=false,show_in_public_search=false,status='draft' WHERE id=t.id;
 UPDATE public.sample_tournaments SET conversion_status='converted',converted_at=now(),converted_tournament_id=t.id,conversion_notes=_notes WHERE id=s.id;
 RETURN jsonb_build_object('tournament_id',t.id,'organization_id',_organization_id,'slug',t.slug);
END $$;
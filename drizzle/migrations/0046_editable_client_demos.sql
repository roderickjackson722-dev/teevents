ALTER TABLE public.tournaments ADD COLUMN client_sample_id uuid REFERENCES public.sample_tournaments(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX tournaments_client_sample_unique ON public.tournaments(client_sample_id) WHERE client_sample_id IS NOT NULL;
ALTER TABLE public.organizations ADD COLUMN client_demo_sample_id uuid REFERENCES public.sample_tournaments(id) ON DELETE SET NULL;
GRANT SELECT(client_sample_id) ON public.tournaments TO authenticated;
GRANT INSERT(client_sample_id) ON public.tournaments TO authenticated;
GRANT SELECT(client_demo_sample_id) ON public.organizations TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_client_demo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.client_sample_id IS NOT NULL AND NEW.client_sample_id IS DISTINCT FROM OLD.client_sample_id THEN RAISE EXCEPTION 'Client sample identity cannot be changed'; END IF;
 IF NEW.client_sample_id IS NOT NULL AND NOT COALESCE(NEW.is_converted_from_sample,false) THEN
  NEW.is_demo := true; NEW.is_sample := true; NEW.site_published := false; NEW.registration_open := false; NEW.show_in_public_search := false; NEW.status := 'draft';
  IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Convert the sample before assigning its organization'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.client_sample_id IS NOT NULL AND NEW.is_converted_from_sample IS DISTINCT FROM OLD.is_converted_from_sample AND current_user <> 'postgres' AND current_user <> 'service_role' THEN RAISE EXCEPTION 'Use the admin conversion action'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_client_demo BEFORE INSERT OR UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.protect_client_demo();
CREATE OR REPLACE FUNCTION public.ensure_client_demo(_sample_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.sample_tournaments%ROWTYPE; t public.tournaments%ROWTYPE; org_id uuid; fmt text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO s FROM public.sample_tournaments WHERE id=_sample_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sample not found'; END IF;
 SELECT * INTO t FROM public.tournaments WHERE client_sample_id=s.id;
 IF FOUND THEN RETURN jsonb_build_object('tournament_id',t.id,'organization_id',t.organization_id,'slug',t.slug); END IF;
 IF s.conversion_status='converted' THEN RAISE EXCEPTION 'This sample is already converted; open its linked client event'; END IF;
 INSERT INTO public.organizations(name,client_demo_sample_id) VALUES (s.tournament_name || ' — Sample',s.id) RETURNING id INTO org_id;
 fmt := CASE lower(s.scoring_format) WHEN 'scramble' THEN 'scramble_4' WHEN 'best ball' THEN 'best_ball_4' WHEN 'stroke play' THEN 'stroke_play' WHEN 'stableford' THEN 'stableford' WHEN 'shamble' THEN 'shamble' ELSE COALESCE(s.scoring_format,'stroke_play') END;
 INSERT INTO public.tournaments(organization_id,title,date,course_name,location,description,scoring_format,registration_fee_cents,site_logo_url,site_hero_image_url,site_primary_color,site_secondary_color,site_background_color,client_sample_id,is_demo,is_sample,is_pro,created_by_admin_id,site_published,registration_open,show_in_public_search,pricing_version,flat_rate_amount_cents)
 VALUES(org_id,s.tournament_name,s.event_date,s.course_name,s.location,s.description,fmt,s.registration_fee_cents,s.logo_url,s.hero_image_url,s.primary_color,s.secondary_color,s.background_color,s.id,true,true,true,auth.uid(),false,false,false,'2026-10',39900) RETURNING * INTO t;
 RETURN jsonb_build_object('tournament_id',t.id,'organization_id',t.organization_id,'slug',t.slug);
END $$;
REVOKE ALL ON FUNCTION public.ensure_client_demo(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_client_demo(uuid) TO authenticated;
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
 UPDATE public.tournaments SET organization_id=_organization_id,is_converted_from_sample=true,is_sample=false,is_demo=false,is_pro=false,sample_converted_at=now(),sample_converted_to=owner_id,site_published=false,registration_open=false,show_in_public_search=false,status='draft' WHERE id=t.id;
 UPDATE public.sample_tournaments SET conversion_status='converted',converted_at=now(),converted_tournament_id=t.id,conversion_notes=_notes WHERE id=s.id;
 RETURN jsonb_build_object('tournament_id',t.id,'organization_id',_organization_id,'slug',t.slug);
END $$;
REVOKE ALL ON FUNCTION public.convert_client_demo(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_client_demo(uuid,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.sync_client_demo_preview() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.client_sample_id IS NOT NULL AND NOT NEW.is_converted_from_sample THEN
 UPDATE public.sample_tournaments SET tournament_name=NEW.title,event_date=NEW.date,course_name=NEW.course_name,location=NEW.location,description=NEW.description,scoring_format=NEW.scoring_format,registration_fee_cents=NEW.registration_fee_cents,logo_url=NEW.site_logo_url,hero_image_url=NEW.site_hero_image_url,primary_color=NEW.site_primary_color,secondary_color=NEW.site_secondary_color,background_color=NEW.site_background_color WHERE id=NEW.client_sample_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_client_demo_preview AFTER UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.sync_client_demo_preview();
CREATE OR REPLACE FUNCTION public.client_sample_site(_slug text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',t.id,'title',t.title,'slug',t.slug,'description',t.description,'description_html',t.description_html,'date',t.date,'end_date',t.end_date,'location',t.location,'course_name',t.course_name,'site_logo_url',t.site_logo_url,'site_hero_title',t.site_hero_title,'site_hero_subtitle',t.site_hero_subtitle,'site_hero_image_url',t.site_hero_image_url,'site_primary_color',t.site_primary_color,'site_secondary_color',t.site_secondary_color,'site_background_color',t.site_background_color,'site_text_color',t.site_text_color,'site_font_family',t.site_font_family,'site_show_logo',t.site_show_logo,'site_hero_opacity',t.site_hero_opacity,'site_hero_fit',t.site_hero_fit,'site_hero_position',t.site_hero_position,'site_hero_blur',t.site_hero_blur,'site_heading_font_size',t.site_heading_font_size,'site_body_font_size',t.site_body_font_size,'site_button_font_size',t.site_button_font_size,'site_button_radius',t.site_button_radius,'site_logo_position',t.site_logo_position,'site_title_position',t.site_title_position,'site_button_position',t.site_button_position,'template',t.template,'schedule_info',t.schedule_info,'schedule_info_html',t.schedule_info_html,'registration_fee_cents',t.registration_fee_cents,'scoring_format',t.scoring_format,'public_tabs',t.public_tabs,'public_tabs_order',t.public_tabs_order,'public_section_titles',t.public_section_titles,'registration_open',false,'site_published',false,'live_leaderboard_enabled',false,'foursome_registration',t.foursome_registration,'max_group_size',t.max_group_size,'contact_email',t.contact_email,'contact_phone',t.contact_phone,'show_countdown',t.show_countdown,'countdown_style',t.countdown_style)
 FROM public.sample_tournaments s JOIN public.tournaments t ON t.client_sample_id=s.id WHERE s.unique_slug=_slug AND NOT t.is_converted_from_sample;
$$;
REVOKE ALL ON FUNCTION public.client_sample_site(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_sample_site(text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.notify_admin_new_tournament() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE org_name text;
BEGIN
 IF NEW.client_sample_id IS NOT NULL THEN RETURN NEW; END IF;
 SELECT name INTO org_name FROM public.organizations WHERE id=NEW.organization_id;
 PERFORM public.push_admin_notification('tournament','New Tournament Created – ' || COALESCE(NEW.title,'Untitled'),COALESCE(org_name,'An organizer') || ' created "' || COALESCE(NEW.title,'Untitled') || '"' || COALESCE(' on ' || NEW.date::text,'') || '.','/admin/users-events',NEW.organization_id);
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.notify_admin_organizer_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.client_demo_sample_id IS NOT NULL THEN RETURN NEW; END IF;
 PERFORM public.push_admin_notification('organizer','Organizer Signup – ' || COALESCE(NEW.name,'New organization'),COALESCE(NEW.name,'A new organization') || ' created a new organizer account.','/admin?tab=signups',NEW.id);
 RETURN NEW;
END $$;
ALTER TABLE public.sample_tournaments ADD COLUMN IF NOT EXISTS text_color text;
ALTER TABLE public.sample_tournaments ADD COLUMN IF NOT EXISTS builder_details jsonb;

CREATE OR REPLACE FUNCTION public.ensure_client_demo(_sample_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.sample_tournaments%ROWTYPE; t public.tournaments%ROWTYPE; org_id uuid; fmt text; d jsonb; sp jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO s FROM public.sample_tournaments WHERE id=_sample_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sample not found'; END IF;
 SELECT * INTO t FROM public.tournaments WHERE client_sample_id=s.id;
 IF NOT FOUND THEN
   IF s.conversion_status='converted' THEN RAISE EXCEPTION 'This sample is already converted; open its linked client event'; END IF;
   INSERT INTO public.organizations(name,client_demo_sample_id) VALUES (s.tournament_name || ' — Sample',s.id) RETURNING id INTO org_id;
   fmt := CASE lower(s.scoring_format) WHEN 'scramble' THEN 'scramble_4' WHEN 'best ball' THEN 'best_ball_4' WHEN 'stroke play' THEN 'stroke_play' WHEN 'stableford' THEN 'stableford' WHEN 'shamble' THEN 'shamble' ELSE COALESCE(s.scoring_format,'stroke_play') END;
   INSERT INTO public.tournaments(organization_id,title,date,course_name,location,description,scoring_format,registration_fee_cents,site_logo_url,site_hero_image_url,site_primary_color,site_secondary_color,site_background_color,client_sample_id,is_demo,is_sample,is_pro,created_by_admin_id,site_published,registration_open,show_in_public_search,pricing_version,flat_rate_amount_cents)
   VALUES(org_id,s.tournament_name,s.event_date,s.course_name,s.location,s.description,fmt,s.registration_fee_cents,s.logo_url,s.hero_image_url,s.primary_color,s.secondary_color,s.background_color,s.id,true,true,true,auth.uid(),false,false,false,'2026-10',39900) RETURNING * INTO t;
 END IF;
 -- Builder details fill only blanks on the sample event; nothing already set is replaced.
 d := s.builder_details;
 IF d IS NOT NULL AND NOT coalesce(t.is_converted_from_sample, false) THEN
   UPDATE public.tournaments SET
     site_text_color = coalesce(nullif(site_text_color,''), s.text_color),
     site_hero_subtitle = coalesce(nullif(site_hero_subtitle,''), nullif(d->>'tagline','')),
     schedule_info = coalesce(nullif(schedule_info,''), nullif(d->>'schedule_text','')),
     contact_email = coalesce(nullif(contact_email,''), nullif(d->>'contact_email','')),
     contact_phone = coalesce(nullif(contact_phone,''), nullif(d->>'contact_phone','')),
     description = coalesce(nullif(description,''), nullif(d->>'description_text',''))
   WHERE id = t.id;
   IF NOT EXISTS (SELECT 1 FROM public.tournament_sponsors WHERE tournament_id = t.id) THEN
     FOR sp IN SELECT * FROM jsonb_array_elements(coalesce(d->'sponsors','[]'::jsonb)) LOOP
       IF nullif(btrim(sp->>'name'),'') IS NOT NULL THEN
         INSERT INTO public.tournament_sponsors (tournament_id, name, tier) VALUES (t.id, btrim(sp->>'name'), nullif(btrim(coalesce(sp->>'tier','')),''));
       END IF;
     END LOOP;
   END IF;
 END IF;
 RETURN jsonb_build_object('tournament_id',t.id,'organization_id',t.organization_id,'slug',t.slug);
END $function$;

CREATE OR REPLACE FUNCTION public.duplicate_client_sample(_sample_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sample_tournaments%ROWTYPE; new_id uuid; new_slug text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO s FROM public.sample_tournaments WHERE id=_sample_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sample not found'; END IF;
  new_slug := left(s.unique_slug, 40) || '-v' || substr(md5(random()::text), 1, 4);
  INSERT INTO public.sample_tournaments (admin_id, sample_created_by, unique_slug, tournament_name, event_date, location, description, logo_url, hero_image_url,
    scoring_format, registration_fee_cents, team_fee_cents, prospect_name, prospect_email, prospect_company, prospect_phone, primary_color, secondary_color,
    background_color, text_color, course_name, is_sample, guided_tour, sample_share_link, builder_details)
  VALUES (auth.uid(), auth.uid(), new_slug, s.tournament_name || ' (copy)', s.event_date, s.location, s.description, s.logo_url, s.hero_image_url,
    s.scoring_format, s.registration_fee_cents, s.team_fee_cents, s.prospect_name, s.prospect_email, s.prospect_company, s.prospect_phone, s.primary_color, s.secondary_color,
    s.background_color, s.text_color, s.course_name, true, true, 'https://teevents.golf/sample/' || new_slug, s.builder_details)
  RETURNING id INTO new_id;
  INSERT INTO public.sample_participants (sample_tournament_id, name, handicap, email)
    SELECT new_id, name, handicap, email FROM public.sample_participants WHERE sample_tournament_id = s.id;
  INSERT INTO public.sample_leaderboard (sample_tournament_id, player_name, gross_score, net_score, thru, position)
    SELECT new_id, player_name, gross_score, net_score, thru, position FROM public.sample_leaderboard WHERE sample_tournament_id = s.id;
  INSERT INTO public.sample_sponsors (sample_tournament_id, name, level, logo_color, logo_url, website_url)
    SELECT new_id, name, level, logo_color, logo_url, website_url FROM public.sample_sponsors WHERE sample_tournament_id = s.id;
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.duplicate_client_sample(uuid) TO authenticated;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS site_style_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS site_design_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS site_design_original jsonb;

CREATE OR REPLACE FUNCTION public.client_sample_site(_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT jsonb_build_object('id',t.id,'title',t.title,'slug',t.slug,'description',t.description,'description_html',t.description_html,'date',t.date,'end_date',t.end_date,'location',t.location,'course_name',t.course_name,'site_logo_url',t.site_logo_url,'site_hero_title',t.site_hero_title,'site_hero_subtitle',t.site_hero_subtitle,'site_hero_image_url',t.site_hero_image_url,'site_primary_color',t.site_primary_color,'site_secondary_color',t.site_secondary_color,'site_background_color',t.site_background_color,'site_text_color',t.site_text_color,'site_font_family',t.site_font_family,'site_show_logo',t.site_show_logo,'site_hero_opacity',t.site_hero_opacity,'site_hero_fit',t.site_hero_fit,'site_hero_position',t.site_hero_position,'site_hero_blur',t.site_hero_blur,'site_heading_font_size',t.site_heading_font_size,'site_body_font_size',t.site_body_font_size,'site_button_font_size',t.site_button_font_size,'site_button_radius',t.site_button_radius,'site_logo_position',t.site_logo_position,'site_title_position',t.site_title_position,'site_button_position',t.site_button_position,'template',t.template,'schedule_info',t.schedule_info,'schedule_info_html',t.schedule_info_html,'registration_fee_cents',t.registration_fee_cents,'scoring_format',t.scoring_format,'public_tabs',t.public_tabs,'public_tabs_order',t.public_tabs_order,'public_section_titles',t.public_section_titles,'registration_open',false,'site_published',false,'live_leaderboard_enabled',false,'foursome_registration',t.foursome_registration,'max_group_size',t.max_group_size,'contact_email',t.contact_email,'contact_phone',t.contact_phone,'show_countdown',t.show_countdown,'countdown_style',t.countdown_style)
 || jsonb_build_object('registration_intro_html',t.registration_intro_html,'registration_promo_html',t.registration_promo_html,'donation_prompt_enabled',t.donation_prompt_enabled,'donation_prompt_title',t.donation_prompt_title,'donation_prompt_description',t.donation_prompt_description,'donation_preset_amounts',t.donation_preset_amounts,'donation_allow_custom',t.donation_allow_custom,'donation_custom_label',t.donation_custom_label,'site_style_overrides',t.site_style_overrides)
 FROM public.sample_tournaments s JOIN public.tournaments t ON t.client_sample_id=s.id WHERE s.unique_slug=_slug AND NOT t.is_converted_from_sample;
$function$;
GRANT EXECUTE ON FUNCTION public.client_sample_site(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_tournament_site(_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(t) - ARRAY[
    'admin_notes','demo_notes','demo_prospect_email','demo_prospect_name',
    'demo_prospect_platform','demo_prospect_other','created_by_admin_id',
    'demo_conversion_token','demo_share_token','site_design_history','site_design_original'
  ]
  FROM public.tournaments t
  WHERE t.site_published = true
    AND (t.custom_slug = _slug OR t.slug = _slug OR t.id::text = _slug)
  ORDER BY (t.custom_slug = _slug) DESC
  LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_tournament_site(text) TO anon, authenticated, service_role;
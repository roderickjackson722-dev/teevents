
create or replace function public.get_survey_by_token(_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  reg record;
  t record;
  s record;
  qs jsonb;
begin
  select id, tournament_id, first_name, last_name, email, survey_completed_at
    into reg from tournament_registrations where survey_response_token = _token limit 1;
  if reg.id is null then return null; end if;

  select title, post_event_survey_message, early_signup_enabled, early_signup_label
    into t from tournaments where id = reg.tournament_id;

  select id into s from tournament_surveys
    where tournament_id = reg.tournament_id and is_active = true
    order by created_at limit 1;

  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'type', q.type, 'survey_id', q.survey_id)
           order by coalesce(q.sort_order, 0)), '[]'::jsonb)
    into qs from tournament_survey_questions q where q.survey_id = s.id;

  return jsonb_build_object(
    'registration_id', reg.id,
    'tournament_id', reg.tournament_id,
    'player_name', trim(coalesce(reg.first_name,'') || ' ' || coalesce(reg.last_name,'')),
    'email', reg.email,
    'tournament_title', coalesce(t.title, 'Tournament'),
    'message', t.post_event_survey_message,
    'early_signup_enabled', coalesce(t.early_signup_enabled, false),
    'early_signup_label', t.early_signup_label,
    'already_completed', reg.survey_completed_at is not null,
    'questions', coalesce(qs, '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_survey_by_token(
  _token uuid,
  _answers jsonb,
  _signup_opt_in boolean default false,
  _signup_email text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  reg record;
  s_id uuid;
  q record;
  ans text;
  respondent text;
begin
  select id, tournament_id, first_name, last_name, email
    into reg from tournament_registrations where survey_response_token = _token limit 1;
  if reg.id is null then return jsonb_build_object('ok', false, 'error', 'Invalid link'); end if;

  select id into s_id from tournament_surveys
    where tournament_id = reg.tournament_id and is_active = true order by created_at limit 1;

  respondent := coalesce(nullif(_signup_email,''), reg.email, 'player-' || reg.id::text || '@anon');

  if s_id is not null then
    for q in select id from tournament_survey_questions where survey_id = s_id loop
      ans := coalesce(_answers ->> q.id::text, '');
      insert into tournament_survey_responses (survey_id, question_id, respondent_email, answer)
      values (s_id, q.id, respondent, ans);
    end loop;
  end if;

  if _signup_opt_in and coalesce(_signup_email,'') <> '' then
    insert into early_signups (tournament_id, email, name, source)
    values (reg.tournament_id, _signup_email,
            nullif(trim(coalesce(reg.first_name,'') || ' ' || coalesce(reg.last_name,'')), ''), 'survey');
  end if;

  update tournament_registrations set survey_completed_at = now() where id = reg.id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.get_survey_by_token(uuid) to anon, authenticated;
grant execute on function public.submit_survey_by_token(uuid, jsonb, boolean, text) to anon, authenticated;

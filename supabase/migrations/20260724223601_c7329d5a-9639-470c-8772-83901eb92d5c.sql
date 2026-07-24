do $$
declare
  v_user_id uuid;
  v_org_id  uuid := gen_random_uuid();
  v_slug text := 'vets-and-tees';
  v_year int := extract(year from now())::int;
begin
  select id into v_user_id from auth.users where email = 'jbilal2000@yahoo.com' limit 1;
  if v_user_id is null then
    raise notice 'jbilal2000@yahoo.com not found; skipping league provisioning';
    return;
  end if;

  if exists (
    select 1
    from public.organizations o
    join public.org_members m on m.organization_id = o.id
    where m.user_id = v_user_id
      and o.workspace_type = 'league'
      and o.name = 'Vets & Tees'
  ) then
    raise notice 'Vets & Tees already provisioned; skipping';
    return;
  end if;

  insert into public.organizations (id, name, subdomain, plan, workspace_type, status)
  values (
    v_org_id,
    'Vets & Tees',
    'vets-and-tees-' || substr(md5(random()::text), 1, 4),
    'free',
    'league',
    'active'
  );

  insert into public.org_members (user_id, organization_id, role)
  values (v_user_id, v_org_id, 'owner');

  while exists (select 1 from public.golf_leagues where league_slug = v_slug) loop
    v_slug := 'vets-and-tees-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.golf_leagues (
    organization_id, league_name, league_slug, description, season_year,
    is_active, is_public, created_by, access_status, tagline, welcome_message
  ) values (
    v_org_id, 'Vets & Tees', v_slug,
    'A community league for veterans who love the game.',
    v_year, true, true, v_user_id, 'unpaid',
    'Camaraderie. Competition. Course time.',
    'Welcome to Vets & Tees — glad to have you on the tee sheet.'
  );
end $$;
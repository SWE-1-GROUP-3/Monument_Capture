-- Stage 6: moderators manage monuments; players can't.

begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'p1@test.dev', '{"display_name":"Player One"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'mod@test.dev', '{"display_name":"Mod"}');
update public.profiles set role = 'moderator' where id = '00000000-0000-0000-0000-0000000000d1';

create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(text) to authenticated;

-- Players cannot.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is(public.save_monument(null, 'Fake', '', '', 40.7, -73.9, 100) ->> 'code', 'not_a_moderator', 'a player cannot add a monument');
select is(public.set_monument_active((select id from public.monuments where slug = 'liberty'), false) ->> 'code', 'not_a_moderator',
  'a player cannot take one out of play');
reset role;
select is((select count(*)::int from public.monuments), 20, '...nothing changed');

-- Moderators can.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
select is(public.save_monument(null, '  ', '', '', 40.7, -73.9, 100) ->> 'code', 'bad_name', 'a name is required');
select is(public.save_monument(null, 'X', '', '', 123, -73.9, 100) ->> 'code', 'bad_latitude', 'latitude is checked');
select is(public.save_monument(null, 'X', '', '', 40.7, -200, 100) ->> 'code', 'bad_longitude', 'longitude is checked');
select is(public.save_monument(null, 'X', '', '', 40.7, -73.9, 5) ->> 'code', 'bad_radius', 'radius is checked');

create temp table added as select public.save_monument(null, ' Hamilton Statue ', 'Central Park', 'Granite statue', 40.7795, -73.9631, 100, '🗿') as r;
reset role;
select is((select r ->> 'ok' from added), 'true', 'a moderator adds a monument');
select is((select name from public.monuments where id = (select (r ->> 'monument_id')::uuid from added)), 'Hamilton Statue', 'trimmed name');
select ok((select abs(extensions.st_y(location::extensions.geometry) - 40.7795) < 1e-9 from public.monuments
           where id = (select (r ->> 'monument_id')::uuid from added)), 'its map point is derived from the coordinates');
select is((select active from public.monuments where id = (select (r ->> 'monument_id')::uuid from added)), true, 'new monuments are in play');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
select is(public.save_monument((select (r ->> 'monument_id')::uuid from added), 'Hamilton', 'Central Park', '', 40.78, -73.963, 150) ->> 'ok', 'true',
  'a moderator edits a monument');
select is(public.save_monument(gen_random_uuid(), 'Ghost', '', '', 40, -73, 100) ->> 'code', 'not_found', 'editing a missing monument is refused');
select is(public.set_monument_active((select (r ->> 'monument_id')::uuid from added), false) ->> 'ok', 'true', 'and takes it out of play');
reset role;
select is((select capture_radius_m from public.monuments where id = (select (r ->> 'monument_id')::uuid from added)), 150, 'the edit stuck');
select is((select icon from public.monuments where id = (select (r ->> 'monument_id')::uuid from added)), '🗿', 'an empty icon keeps the old one');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is((select count(*)::int from jsonb_array_elements(public.get_map() -> 'monuments') x where x ->> 'name' = 'Hamilton'), 0,
  'players no longer see it on the map');
reset role;

select is(has_function_privilege('anon', 'public.save_monument(uuid, text, text, text, double precision, double precision, integer, text)', 'execute'), false,
  'signed-out visitors cannot manage monuments');

select * from finish();
rollback;

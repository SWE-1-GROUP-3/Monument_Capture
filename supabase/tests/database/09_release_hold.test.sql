-- A moderator ends a hold early.

begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'p1@test.dev', '{"display_name":"Player One"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'p2@test.dev', '{"display_name":"Player Two"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'mod@test.dev', '{"display_name":"Mod"}');
update public.profiles set role = 'moderator' where id = '00000000-0000-0000-0000-0000000000d1';

create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(text) to authenticated;

-- Player One has held Bethesda for 10 minutes (50 to go); Player Two waits in the queue.
insert into public.captures (id, monument_id, player_id, status, reported_latitude, reported_longitude,
                             reported_accuracy_m, distance_m, photo_path, started_at, submitted_at)
values
  ('00000000-0000-0000-0000-00000000c001', (select id from public.monuments where slug = 'bethesda'),
   '00000000-0000-0000-0000-0000000000a1', 'approved', 40.7744, -73.9703, 8, 12, 'a1/c001.jpg', now() - interval '20 minutes', now() - interval '20 minutes'),
  ('00000000-0000-0000-0000-00000000c002', (select id from public.monuments where slug = 'bethesda'),
   '00000000-0000-0000-0000-0000000000a2', 'pending', 40.7745, -73.9703, 8, 20, 'a2/c002.jpg', now() - interval '5 minutes', now() - interval '5 minutes');
insert into public.capture_reviews (capture_id, monument_id, moderator_id, decision, reviewed_at, locked_until)
values ('00000000-0000-0000-0000-00000000c001', (select id from public.monuments where slug = 'bethesda'),
        '00000000-0000-0000-0000-0000000000d1', 'approved', now() - interval '10 minutes', now() + interval '50 minutes');

create temp table bethesda as select id from public.monuments where slug = 'bethesda';
grant select on bethesda to authenticated;

-- Players cannot.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is(public.release_hold((select id from bethesda), 'I want it') ->> 'code', 'not_a_moderator', 'a player cannot end someone''s hold');

-- Moderators need a reason, and a held monument.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.release_hold((select id from bethesda), ' ') ->> 'code', 'reason_required', 'a reason is required');
select is(public.release_hold((select id from public.monuments where slug = 'liberty'), 'Cheating') ->> 'code', 'not_held',
  'a free monument has no hold to end');
select is(public.release_hold(gen_random_uuid(), 'Cheating') ->> 'code', 'not_found', 'unknown monument');

-- The decision queue confirms the monument is held: Player Two can't be approved.
select is(public.decide_capture('00000000-0000-0000-0000-00000000c002', 'approved') ->> 'code', 'already_held',
  '(while held, a second approval is refused)');

create temp table rel as select public.release_hold((select id from bethesda), '  Photo was a screenshot ') as r;
reset role;
select is((select r ->> 'ok' from rel), 'true', 'a moderator ends the hold');
select is((select r ->> 'holder_name' from rel), 'Player One', '...naming whose hold it was');

select ok((select locked_until <= now() from public.capture_reviews where capture_id = '00000000-0000-0000-0000-00000000c001'),
  'the lock ends now');
select is((select release_reason from public.capture_reviews where capture_id = '00000000-0000-0000-0000-00000000c001'),
  'Photo was a screenshot', 'the reason is recorded, trimmed');
select is((select released_by from public.capture_reviews where capture_id = '00000000-0000-0000-0000-00000000c001'),
  '00000000-0000-0000-0000-0000000000d1'::uuid, '...with who ended it');
select is((select status::text from public.captures where id = '00000000-0000-0000-0000-00000000c001'), 'approved',
  'the approval stays in the history');

-- The monument is free: on the map, and for the next approval.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select jsonb_typeof(x -> 'hold') from jsonb_array_elements(public.get_map() -> 'monuments') x
           where (x ->> 'id')::uuid = (select id from bethesda)), 'null', 'the map shows the monument free');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.decide_capture('00000000-0000-0000-0000-00000000c002', 'approved') ->> 'ok', 'true',
  'the waiting capture can now be approved');
select is(public.release_hold((select id from bethesda), 'Again') ->> 'ok', 'true', 'and that new hold can be ended too');

-- Player One sees why their hold ended.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select x -> 'review' ->> 'release_reason' from jsonb_array_elements(public.get_game_state() -> 'my_captures') x
           where x ->> 'id' = '00000000-0000-0000-0000-00000000c001'), 'Photo was a screenshot',
  'the player sees the reason their hold was ended');
reset role;

-- Integrity: a release can't be half-recorded, or applied to a rejection.
select throws_ok($$ update public.capture_reviews set released_by = null where capture_id = '00000000-0000-0000-0000-00000000c001' $$,
  '23514', null, 'release fields are recorded together (no release without who ended it)');
insert into public.captures (id, monument_id, player_id, status, reported_latitude, reported_longitude,
                             reported_accuracy_m, distance_m, photo_path, started_at, submitted_at)
values ('00000000-0000-0000-0000-00000000c003', (select id from public.monuments where slug = 'liberty'),
        '00000000-0000-0000-0000-0000000000a1', 'rejected', 40.6892, -74.0445, 8, 12, 'a1/c003.jpg', now(), now());
insert into public.capture_reviews (capture_id, monument_id, moderator_id, decision, reason)
values ('00000000-0000-0000-0000-00000000c003', (select id from public.monuments where slug = 'liberty'),
        '00000000-0000-0000-0000-0000000000d1', 'rejected', 'Blurry');
select throws_ok($$ update public.capture_reviews set released_at = now(), released_by = moderator_id, release_reason = 'x'
                   where capture_id = '00000000-0000-0000-0000-00000000c003' $$,
  '23514', null, 'a rejection has no hold to release');

select is(has_function_privilege('anon', 'public.release_hold(uuid, text)', 'execute'), false, 'signed-out visitors cannot call it');

select * from finish();
rollback;

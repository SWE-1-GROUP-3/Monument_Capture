-- Stage 5: the moderator's decision and the review queue.

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

-- Two pending captures of Bethesda (Players One and Two), one of Liberty (Player One).
insert into public.captures (id, monument_id, player_id, status, reported_latitude, reported_longitude,
                             reported_accuracy_m, distance_m, flags, photo_path, started_at, submitted_at)
values
  ('00000000-0000-0000-0000-00000000c001', (select id from public.monuments where slug = 'bethesda'),
   '00000000-0000-0000-0000-0000000000a1', 'pending', 40.7744, -73.9703, 8, 12, '{exact_pin}', 'a1/c001.jpg', now() - interval '20 minutes', now() - interval '19 minutes'),
  ('00000000-0000-0000-0000-00000000c002', (select id from public.monuments where slug = 'bethesda'),
   '00000000-0000-0000-0000-0000000000a2', 'pending', 40.7745, -73.9703, 8, 20, '{}', 'a2/c002.jpg', now() - interval '10 minutes', now() - interval '9 minutes'),
  ('00000000-0000-0000-0000-00000000c003', (select id from public.monuments where slug = 'liberty'),
   '00000000-0000-0000-0000-0000000000a1', 'pending', 40.6892, -74.0445, 8, 30, '{}', 'a1/c003.jpg', now() - interval '5 minutes', now() - interval '4 minutes');

-- ---------------------------------------------------------------------------
-- Queue
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
create temp table q as select public.get_game_state() -> 'review_queue' as rq;
reset role;
select is(jsonb_array_length((select rq from q)), 3, 'a moderator gets every pending capture');
select is((select rq -> 0 ->> 'id' from q), '00000000-0000-0000-0000-00000000c001', 'oldest first');
select is((select rq -> 0 ->> 'player_name' from q), 'Player One', 'with the player''s display name');
select is((select rq -> 0 -> 'flags' from q), '["exact_pin"]'::jsonb, 'and the moderator flags');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select is(jsonb_typeof(public.get_game_state() -> 'review_queue'), 'null', 'players get no queue');

-- ---------------------------------------------------------------------------
-- Who may decide
-- ---------------------------------------------------------------------------
select is(public.decide_capture('00000000-0000-0000-0000-00000000c002', 'approved') ->> 'code', 'not_a_moderator',
  'a player cannot approve (not even someone else''s capture)');
reset role;
select is((select status::text from public.captures where id = '00000000-0000-0000-0000-00000000c002'), 'pending', '...and nothing changed');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
select is(public.decide_capture('00000000-0000-0000-0000-00000000c001', 'maybe') ->> 'code', 'bad_decision', 'only approved/rejected');
select is(public.decide_capture(gen_random_uuid(), 'approved') ->> 'code', 'not_found', 'unknown capture');

-- ---------------------------------------------------------------------------
-- Reject
-- ---------------------------------------------------------------------------
select is(public.decide_capture('00000000-0000-0000-0000-00000000c003', 'rejected', '  ') ->> 'code', 'reason_required',
  'a rejection needs a reason (US-14)');
select is(public.decide_capture('00000000-0000-0000-0000-00000000c003', 'rejected', '  Photo is a screenshot ') ->> 'ok', 'true',
  'a rejection with a reason is recorded');
reset role;
select is((select status::text from public.captures where id = '00000000-0000-0000-0000-00000000c003'), 'rejected', 'the capture is rejected');
select is((select reason from public.capture_reviews where capture_id = '00000000-0000-0000-0000-00000000c003'), 'Photo is a screenshot',
  'the reason is stored, trimmed');
select is((select locked_until from public.capture_reviews where capture_id = '00000000-0000-0000-0000-00000000c003'), null,
  'a rejection locks nothing');

-- ---------------------------------------------------------------------------
-- Approve
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
create temp table a1 as select public.decide_capture('00000000-0000-0000-0000-00000000c001', 'approved') as r;
reset role;
select is((select r ->> 'ok' from a1), 'true', 'approval needs no reason');
select ok((select (r ->> 'locked_until')::timestamptz = now() + interval '60 minutes' from a1),
  'approval locks the monument for game_settings.lock_duration, from the database clock');
select is((select status::text from public.captures where id = '00000000-0000-0000-0000-00000000c001'), 'approved', 'the capture is approved');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
create temp table a2 as select public.decide_capture('00000000-0000-0000-0000-00000000c002', 'approved') as r;
select is((select r ->> 'code' from a2), 'already_held', 'approving a second capture of a held monument is refused');
select is((select r ->> 'holder_name' from a2), 'Player One', '...naming the holder');
select is(public.decide_capture('00000000-0000-0000-0000-00000000c002', 'rejected', 'Already held') ->> 'ok', 'true',
  '...and it can be rejected instead');
select is(public.decide_capture('00000000-0000-0000-0000-00000000c001', 'rejected', 'Changed my mind') ->> 'code', 'already_decided',
  'a decision is final');
reset role;

select is((select count(*)::int from public.capture_reviews r join public.monuments m on m.id = r.monument_id
           where m.slug = 'bethesda' and r.decision = 'approved' and r.locked_until > now()), 1,
  'exactly one holder of Bethesda');

-- The map shows the new holder.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select is((select x -> 'hold' ->> 'holder_name' from jsonb_array_elements(public.get_map() -> 'monuments') x where x ->> 'slug' = 'bethesda'),
  'Player One', 'the map shows Player One holding Bethesda');
-- Player One sees their approval in their own captures.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select x -> 'review' ->> 'decision' from jsonb_array_elements(public.get_game_state() -> 'my_captures') x
           where x ->> 'id' = '00000000-0000-0000-0000-00000000c001'), 'approved', 'the player sees the approval');
reset role;

-- Once the lock expires, another capture of the monument can be approved.
update public.capture_reviews set reviewed_at = now() - interval '2 hours', locked_until = now() - interval '1 hour'
where capture_id = '00000000-0000-0000-0000-00000000c001';
insert into public.captures (id, monument_id, player_id, status, reported_latitude, reported_longitude,
                             reported_accuracy_m, distance_m, photo_path, started_at, submitted_at)
values ('00000000-0000-0000-0000-00000000c004', (select id from public.monuments where slug = 'bethesda'),
        '00000000-0000-0000-0000-0000000000a2', 'pending', 40.7744, -73.9703, 8, 12, 'a2/c004.jpg', now(), now());
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
select is(public.decide_capture('00000000-0000-0000-0000-00000000c004', 'approved') ->> 'ok', 'true',
  'after the lock expires the monument is contestable again');
-- The moderator's queue now holds no pending captures, only their own recent decisions.
select is((select count(*)::int from jsonb_array_elements(public.get_game_state() -> 'review_queue') x where x ->> 'status' = 'pending'), 0,
  'the queue is empty of pending work');
select ok((select count(*)::int from jsonb_array_elements(public.get_game_state() -> 'review_queue') x where x -> 'review' ->> 'moderator_id' = '00000000-0000-0000-0000-0000000000d1') >= 4,
  'and lists the moderator''s own recent decisions');
reset role;

select is(has_function_privilege('anon', 'public.decide_capture(uuid, text, text)', 'execute'), false, 'signed-out visitors cannot decide');

select * from finish();
rollback;

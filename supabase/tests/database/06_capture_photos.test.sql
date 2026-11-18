-- Stage 4: photo upload rules on storage.objects, and submit_capture.

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

select is((select public from storage.buckets where id = 'capture-photos'), false, 'the photo bucket exists and is private');
select is((select allowed_mime_types from storage.buckets where id = 'capture-photos'), array['image/jpeg'], 'it takes JPEGs only');

-- Player One: c001 in progress (fresh), c002 pending. Player Two: c003 in progress but expired (11 min).
insert into public.captures (id, monument_id, player_id, status, reported_latitude, reported_longitude,
                             reported_accuracy_m, distance_m, photo_path, started_at, submitted_at)
values
  ('00000000-0000-0000-0000-00000000c001', (select id from public.monuments where slug = 'bethesda'),
   '00000000-0000-0000-0000-0000000000a1', 'in_progress', 40.7744, -73.9703, 8, 10, null, now() - interval '1 minute', null),
  ('00000000-0000-0000-0000-00000000c002', (select id from public.monuments where slug = 'liberty'),
   '00000000-0000-0000-0000-0000000000a1', 'pending', 40.6892, -74.0445, 8, 10, 'x', now() - interval '1 hour', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000c003', (select id from public.monuments where slug = 'grant'),
   '00000000-0000-0000-0000-0000000000a2', 'in_progress', 40.8134, -73.9631, 8, 10, null, now() - interval '11 minutes', null);

-- ---------------------------------------------------------------------------
-- Upload rules (as Player One)
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;

select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a2/00000000-0000-0000-0000-00000000c001.jpg') $$,
  '42501', null, 'cannot upload into another player''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000c002.jpg') $$,
  '42501', null, 'cannot upload for a capture that is no longer in progress');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000c001.png') $$,
  '42501', null, 'cannot upload under any other name');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a1/anything.jpg') $$,
  '42501', null, 'cannot upload a file that is not a capture photo');

select is(public.submit_capture('00000000-0000-0000-0000-00000000c001') ->> 'code', 'photo_missing',
  'submitting before the photo is uploaded is refused');

select lives_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000c001.jpg') $$,
  'the player uploads the photo for their own capture in progress');

-- No replacing or deleting: with no UPDATE/DELETE policy, RLS filters every row out.
update storage.objects set name = name where bucket_id = 'capture-photos';
select is((select count(*)::int from storage.objects where bucket_id = 'capture-photos'), 1, '(the photo is there)');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
create temp table touched (n int);
grant all on touched to authenticated;
with u as (update storage.objects set metadata = '{"swapped":true}' where bucket_id = 'capture-photos' returning 1)
insert into touched select count(*) from u;
with d as (delete from storage.objects where bucket_id = 'capture-photos' returning 1)
insert into touched select count(*) from d;
reset role;
select is((select array_agg(n) from touched), array[0, 0], 'the photo cannot be replaced or deleted from the browser');
select is((select count(*)::int from storage.objects where metadata is null), 1, '...and it is unchanged');

-- ---------------------------------------------------------------------------
-- Submitting
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
create temp table s1 as select public.submit_capture('00000000-0000-0000-0000-00000000c001') as r;
select is((select r ->> 'ok' from s1), 'true', 'with the photo in place, the capture is submitted');
select is(public.submit_capture('00000000-0000-0000-0000-00000000c001') ->> 'code', 'not_in_progress',
  'a capture cannot be submitted twice');
select is(public.submit_capture('00000000-0000-0000-0000-00000000c003') ->> 'code', 'not_found',
  'a player cannot submit someone else''s capture');
reset role;

select is((select status::text from public.captures where id = '00000000-0000-0000-0000-00000000c001'), 'pending', 'it is now pending');
select is((select photo_path from public.captures where id = '00000000-0000-0000-0000-00000000c001'),
  '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000c001.jpg', 'with the server-decided photo path');
select ok((select submitted_at = now() from public.captures where id = '00000000-0000-0000-0000-00000000c001'), 'and a submission time');

-- After submitting, uploading again is no longer possible.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000c001.jpg') $$,
  null, null, 'no second upload for a submitted capture');
reset role;

-- Expired: Player Two's check-in is 11 minutes old.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name) values
  ('capture-photos', '00000000-0000-0000-0000-0000000000a2/00000000-0000-0000-0000-00000000c003.jpg') $$,
  '42501', null, 'no upload after the photo window closed');
select is(public.submit_capture('00000000-0000-0000-0000-00000000c003') ->> 'code', 'expired', 'and no submission either');

-- ---------------------------------------------------------------------------
-- Reading photos
-- ---------------------------------------------------------------------------
select is((select count(*)::int from storage.objects where bucket_id = 'capture-photos'), 0, 'another player cannot see Player One''s photo');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from storage.objects where bucket_id = 'capture-photos'), 1, 'the player can see their own');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from storage.objects where bucket_id = 'capture-photos'), 1, 'a moderator can see it');
reset role;

select is(has_function_privilege('anon', 'public.submit_capture(uuid)', 'execute'), false, 'signed-out visitors cannot submit');

select * from finish();
rollback;

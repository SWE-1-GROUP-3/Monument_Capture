-- Stage 5 / migration 10: the moderator's decision, and the review queue.
--
-- decide_capture() approves or rejects a pending capture in ONE transaction:
--   1. lock the monument row (FOR UPDATE): decisions on the same monument
--      queue up behind each other, however many moderators are working
--   2. lock the capture row and re-check it is still pending
--   3. reject: a reason (3+ characters) is required; record it
--      approve: re-check nobody holds the monument NOW, then record the
--      review with locked_until = now() + game_settings.lock_duration
--   4. update the capture's status
-- The one_holder_at_a_time exclusion constraint stays underneath as the
-- final guarantee: if anything ever slipped past the re-check, the insert
-- fails and the approval is refused, never duplicated.
--
-- Locks are always taken monument first, then capture, by every caller, so
-- two moderators cannot deadlock each other.
--
-- get_game_state() now also returns, for moderators only, "review_queue":
-- every pending capture (oldest first) plus that moderator's own decisions
-- from the last 7 days, each with the player's display name and flags.

create function public.decide_capture(p_capture_id uuid, p_decision text, p_reason text default '')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.app_role;
  v_monument_id uuid;
  v_capture public.captures;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_lock interval;
  v_holder_name text;
  v_locked_until timestamptz;
  v_review public.capture_reviews;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'moderator' then
    return jsonb_build_object('ok', false, 'code', 'not_a_moderator');
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    return jsonb_build_object('ok', false, 'code', 'bad_decision');
  end if;

  select monument_id into v_monument_id from public.captures where id = p_capture_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- 1. Monument first: serialises every decision on this monument.
  perform 1 from public.monuments where id = v_monument_id for update;

  -- 2. Then the capture, re-read under the lock.
  select * into v_capture from public.captures where id = p_capture_id for update;
  if v_capture.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'already_decided', 'status', v_capture.status);
  end if;
  if v_capture.player_id = v_uid then
    return jsonb_build_object('ok', false, 'code', 'own_capture');
  end if;

  if p_decision = 'rejected' then
    if char_length(v_reason) < 3 then
      return jsonb_build_object('ok', false, 'code', 'reason_required');
    end if;
    insert into public.capture_reviews (capture_id, monument_id, moderator_id, decision, reason)
    values (v_capture.id, v_capture.monument_id, v_uid, 'rejected', v_reason)
    returning * into v_review;
    update public.captures set status = 'rejected' where id = v_capture.id;
    return jsonb_build_object('ok', true, 'decision', 'rejected', 'review_id', v_review.id);
  end if;

  -- 3. Approve: nobody may hold the monument right now (by the database clock).
  select p.display_name, r.locked_until into v_holder_name, v_locked_until
  from public.capture_reviews r
  join public.captures c on c.id = r.capture_id
  join public.profiles p on p.id = c.player_id
  where r.monument_id = v_capture.monument_id and r.decision = 'approved' and r.locked_until > now()
  order by r.locked_until desc
  limit 1;
  if found then
    return jsonb_build_object('ok', false, 'code', 'already_held',
      'holder_name', v_holder_name, 'locked_until', v_locked_until);
  end if;

  select lock_duration into v_lock from public.game_settings;
  begin
    insert into public.capture_reviews (capture_id, monument_id, moderator_id, decision, reason, locked_until)
    values (v_capture.id, v_capture.monument_id, v_uid, 'approved', v_reason, now() + v_lock)
    returning * into v_review;
  exception when exclusion_violation then
    -- The constraint is the last line of defence; report it like the re-check.
    return jsonb_build_object('ok', false, 'code', 'already_held');
  end;
  update public.captures set status = 'approved' where id = v_capture.id;

  return jsonb_build_object('ok', true, 'decision', 'approved', 'review_id', v_review.id,
    'locked_until', v_review.locked_until);
end $$;

-- Pending captures for every moderator, plus this moderator's own recent decisions.
create function private.review_queue() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.submitted_at), '[]'::jsonb)
  from (
    select c.id, c.monument_id, c.player_id, pl.display_name as player_name, c.status,
           c.distance_m, c.reported_accuracy_m, c.flags, c.photo_path, c.started_at, c.submitted_at,
           case when r.id is null then null else jsonb_build_object(
             'id', r.id, 'decision', r.decision, 'reason', r.reason,
             'reviewed_at', r.reviewed_at, 'locked_until', r.locked_until,
             'moderator_id', r.moderator_id, 'moderator_name', mp.display_name
           ) end as review
    from public.captures c
    join public.profiles pl on pl.id = c.player_id
    left join public.capture_reviews r on r.capture_id = c.id
    left join public.profiles mp on mp.id = r.moderator_id
    where c.status = 'pending'
       or (r.moderator_id = (select auth.uid()) and r.reviewed_at > now() - interval '7 days')
    order by c.submitted_at
    limit 500
  ) x
$$;

create or replace function public.get_game_state() returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.get_map() || jsonb_build_object(
    'settings', (select jsonb_build_object(
                   'lock_duration_s', extract(epoch from lock_duration)::int,
                   'max_accuracy_m', max_accuracy_m,
                   'in_progress_ttl_s', extract(epoch from in_progress_ttl)::int)
                 from public.game_settings),
    'my_captures', private.my_captures(),
    'review_queue', case when (select private.is_moderator()) then private.review_queue() else null end
  )
  where (select auth.uid()) is not null
$$;

revoke all on function public.decide_capture(uuid, text, text) from public, anon;
revoke all on function private.review_queue() from public, anon;
grant execute on function public.decide_capture(uuid, text, text) to authenticated;

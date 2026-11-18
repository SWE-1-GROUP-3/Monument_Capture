-- Migration 12: a moderator can end a hold early.
--
-- release_hold(monument, reason) ends the CURRENT hold on a monument now:
-- the approved review's locked_until moves to now(), so the monument is free
-- to capture again straight away. The approval itself stays in the history
-- (the capture is still "approved"); the review records who ended the hold,
-- when, and why. A reason (3+ characters) is required, and the player sees it.
--
-- Like decide_capture(), it locks the monument row first, so a release and an
-- approval on the same monument queue up instead of interleaving.
--
-- Alternative considered: overturning the approval (marking the capture
-- rejected). Not done: it rewrites what happened, and a hold that was earned
-- and then ended early is a different fact from a capture that was rejected.

alter table public.capture_reviews
  add column released_at timestamptz,
  add column released_by uuid references public.profiles (id),
  add column release_reason text,
  add constraint release_recorded_together check (
    (released_at is null) = (released_by is null)
    and (released_at is null) = (release_reason is null)
  ),
  add constraint release_only_approvals check (released_at is null or decision = 'approved');

create function public.release_hold(p_monument_id uuid, p_reason text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_reason text := btrim(coalesce(p_reason, ''));
  v_review public.capture_reviews;
  v_holder_name text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not (select private.is_moderator()) then
    return jsonb_build_object('ok', false, 'code', 'not_a_moderator');
  end if;
  if char_length(v_reason) < 3 then
    return jsonb_build_object('ok', false, 'code', 'reason_required');
  end if;

  perform 1 from public.monuments where id = p_monument_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select r.* into v_review
  from public.capture_reviews r
  where r.monument_id = p_monument_id and r.decision = 'approved' and r.locked_until > now()
  order by r.locked_until desc
  limit 1
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_held');
  end if;

  select p.display_name into v_holder_name
  from public.captures c join public.profiles p on p.id = c.player_id
  where c.id = v_review.capture_id;

  update public.capture_reviews
  set locked_until = greatest(now(), reviewed_at + interval '1 millisecond'),
      released_at = now(),
      released_by = v_uid,
      release_reason = v_reason
  where id = v_review.id;

  return jsonb_build_object('ok', true, 'holder_name', v_holder_name, 'released_at', now());
end $$;

revoke all on function public.release_hold(uuid, text) from public, anon;
grant execute on function public.release_hold(uuid, text) to authenticated;

-- Players see on their own captures when a hold was ended early, and why.
create or replace function private.my_captures() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.started_at desc), '[]'::jsonb)
  from (
    select c.id, c.monument_id, c.player_id, c.status, c.distance_m, c.reported_accuracy_m, c.flags,
           c.photo_path, c.started_at, c.submitted_at,
           c.started_at + s.in_progress_ttl as expires_at,
           case when r.id is null then null else jsonb_build_object(
             'id', r.id, 'decision', r.decision, 'reason', r.reason,
             'reviewed_at', r.reviewed_at, 'locked_until', r.locked_until,
             'moderator_id', r.moderator_id, 'moderator_name', mp.display_name,
             'released_at', r.released_at, 'release_reason', r.release_reason
           ) end as review
    from public.captures c
    cross join public.game_settings s
    left join public.capture_reviews r on r.capture_id = c.id
    left join public.profiles mp on mp.id = r.moderator_id
    where c.player_id = (select auth.uid())
    order by c.started_at desc
    limit 200
  ) x
$$;

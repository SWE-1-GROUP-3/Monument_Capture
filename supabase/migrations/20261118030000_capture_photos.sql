-- Stage 4 / migration 9: capture photos in Supabase Storage.
--
-- Bytes never pass through a function: the browser uploads straight to
-- Storage with the player's own session, and Storage's row-level security on
-- storage.objects decides what is allowed.
--
-- Bucket "capture-photos" is private (no public URLs). Moderators and the
-- player read photos through short-lived signed URLs.
--
-- Upload (INSERT) is allowed for exactly one path per capture:
--     <player's auth uid>/<capture id>.jpg
-- and only while that capture is the caller's, in progress, and inside its
-- photo window (game_settings.in_progress_ttl). There is no UPDATE or DELETE
-- policy, so a photo can never be replaced or removed from the browser; a
-- player cannot swap the picture after a moderator has approved it.
--
-- submit_capture() then moves the capture to "pending" only if that object
-- really exists. The path is decided by the server, not sent by the client.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capture-photos', 'capture-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create function private.can_upload_capture_photo(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.captures c
    cross join public.game_settings s
    where c.player_id = (select auth.uid())
      and object_name = c.player_id::text || '/' || c.id::text || '.jpg'
      and c.status = 'in_progress'
      and now() < c.started_at + s.in_progress_ttl
  )
$$;

revoke all on function private.can_upload_capture_photo(text) from public, anon;
grant execute on function private.can_upload_capture_photo(text) to authenticated;

create policy capture_photos_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'capture-photos' and private.can_upload_capture_photo(name));

create policy capture_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'capture-photos'
    and (split_part(name, '/', 1) = (select auth.uid())::text or (select private.is_moderator()))
  );

-- Submit a capture for review once its photo is in Storage.
create function public.submit_capture(p_capture_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_capture public.captures;
  v_ttl interval;
  v_path text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_capture from public.captures
  where id = p_capture_id and player_id = v_uid
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_capture.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'code', 'not_in_progress', 'status', v_capture.status);
  end if;

  select in_progress_ttl into v_ttl from public.game_settings;
  if now() >= v_capture.started_at + v_ttl then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  v_path := v_uid::text || '/' || v_capture.id::text || '.jpg';
  if not exists (select 1 from storage.objects where bucket_id = 'capture-photos' and name = v_path) then
    return jsonb_build_object('ok', false, 'code', 'photo_missing', 'path', v_path);
  end if;

  update public.captures
  set status = 'pending', photo_path = v_path, submitted_at = now()
  where id = v_capture.id;

  return jsonb_build_object('ok', true, 'capture_id', v_capture.id, 'photo_path', v_path);
end $$;

revoke all on function public.submit_capture(uuid) from public, anon;
grant execute on function public.submit_capture(uuid) to authenticated;

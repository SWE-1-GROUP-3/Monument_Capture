-- Stage 6 / migration 11: moderators manage the monument catalogue.
--
-- save_monument() creates (p_id null) or edits a monument; set_monument_active()
-- takes one out of play or puts it back. Moderators only. Monuments are never
-- deleted, so capture history keeps pointing at something.
--
-- Validation mirrors the app's form (and the table's CHECK constraints, which
-- remain the final word): name 1-120 characters, latitude -90..90, longitude
-- -180..180, capture radius 10-500 m.

create function public.save_monument(
  p_id uuid,
  p_name text,
  p_neighborhood text,
  p_description text,
  p_latitude double precision,
  p_longitude double precision,
  p_capture_radius_m integer,
  p_icon text default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not (select private.is_moderator()) then
    return jsonb_build_object('ok', false, 'code', 'not_a_moderator');
  end if;

  if char_length(v_name) not between 1 and 120 then
    return jsonb_build_object('ok', false, 'code', 'bad_name');
  end if;
  if p_latitude is null or p_latitude not between -90 and 90 or p_latitude = 'NaN'::float8 then
    return jsonb_build_object('ok', false, 'code', 'bad_latitude');
  end if;
  if p_longitude is null or p_longitude not between -180 and 180 or p_longitude = 'NaN'::float8 then
    return jsonb_build_object('ok', false, 'code', 'bad_longitude');
  end if;
  if p_capture_radius_m is null or p_capture_radius_m not between 10 and 500 then
    return jsonb_build_object('ok', false, 'code', 'bad_radius');
  end if;

  if p_id is null then
    insert into public.monuments (name, neighborhood, description, icon, latitude, longitude, capture_radius_m)
    values (v_name, btrim(coalesce(p_neighborhood, '')), btrim(coalesce(p_description, '')),
            nullif(btrim(coalesce(p_icon, '')), ''), p_latitude, p_longitude, p_capture_radius_m)
    returning id into v_id;
  else
    update public.monuments
    set name = v_name,
        neighborhood = btrim(coalesce(p_neighborhood, '')),
        description = btrim(coalesce(p_description, '')),
        icon = coalesce(nullif(btrim(coalesce(p_icon, '')), ''), icon),
        latitude = p_latitude,
        longitude = p_longitude,
        capture_radius_m = p_capture_radius_m
    where id = p_id
    returning id into v_id;
    if v_id is null then
      return jsonb_build_object('ok', false, 'code', 'not_found');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'monument_id', v_id);
end $$;

create function public.set_monument_active(p_id uuid, p_active boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not (select private.is_moderator()) then
    return jsonb_build_object('ok', false, 'code', 'not_a_moderator');
  end if;
  update public.monuments set active = coalesce(p_active, active) where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'monument_id', p_id, 'active', p_active);
end $$;

revoke all on function public.save_monument(uuid, text, text, text, double precision, double precision, integer, text) from public, anon;
revoke all on function public.set_monument_active(uuid, boolean) from public, anon;
grant execute on function public.save_monument(uuid, text, text, text, double precision, double precision, integer, text) to authenticated;
grant execute on function public.set_monument_active(uuid, boolean) to authenticated;

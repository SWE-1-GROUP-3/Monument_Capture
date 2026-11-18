#!/usr/bin/env bash
# LOCAL TESTING ONLY. The one-holder rule through the real code path.
#
# N different moderators, each in their own database session signed in the
# way Supabase does it, call decide_capture() to approve N different pending
# captures of the SAME monument, all at the same instant, holding their
# transactions open for a second. decide_capture() locks the monument row
# first, so the approvals queue up: exactly one may succeed and every other
# must come back as {"ok": false, "code": "already_held"}, with no errors and
# no deadlocks.
set -euo pipefail

db="${1:-monument_test}"
n="${N:-12}"
psql_db=(psql -X -q -v ON_ERROR_STOP=1 -d "$db")
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

"${psql_db[@]}" <<SQL
delete from public.capture_reviews;
delete from public.captures;
delete from auth.users where email like 'dc-%@test.dev';

insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'dc-' || kind || g || '@test.dev', jsonb_build_object('display_name', 'dc-' || kind || g)
from generate_series(1, $n) g, (values ('player'), ('mod')) k(kind);
update public.profiles set role = 'moderator' where display_name like 'dc-mod%';

insert into public.captures (monument_id, player_id, status, reported_latitude, reported_longitude,
                             reported_accuracy_m, distance_m, photo_path, submitted_at)
select (select id from public.monuments where slug = 'bethesda'), p.id, 'pending',
       40.7744, -73.9703, 8, 5, p.id || '/x.jpg', now()
from public.profiles p where p.display_name like 'dc-player%';
SQL

mapfile -t captures < <("${psql_db[@]}" -Atc "
  select c.id from public.captures c join public.profiles p on p.id = c.player_id
  where p.display_name like 'dc-player%' order by p.display_name")
mapfile -t mods < <("${psql_db[@]}" -Atc "select id from public.profiles where display_name like 'dc-mod%' order by display_name")
start_at="$("${psql_db[@]}" -Atc "select (clock_timestamp() + interval '2 seconds')::text")"

echo "  ${#captures[@]} moderators approving different captures of Bethesda Fountain through decide_capture()"

for i in "${!captures[@]}"; do
  (
    psql -X -q -At -v ON_ERROR_STOP=1 -d "$db" >"$tmp/out.$i" 2>&1 <<SQL || true
select pg_sleep_until('$start_at');
begin;
select set_config('request.jwt.claims', '{"sub":"${mods[$i]}","role":"authenticated"}', true);
set local role authenticated;
select public.decide_capture('${captures[$i]}', 'approved', '')::text;
select pg_sleep(1);
commit;
SQL
  ) &
done
wait

count_files() { local n=0 f; for f in "$tmp"/out.*; do if grep -q -- "$1" "$f"; then n=$((n + 1)); fi; done; echo "$n"; }
ok=$(count_files '"ok": true')
held=$(count_files '"already_held"')
errors=$(count_files 'ERROR')
holders="$("${psql_db[@]}" -Atc "
  select count(*) from public.capture_reviews r join public.monuments m on m.id = r.monument_id
  where m.slug = 'bethesda' and r.decision = 'approved' and r.locked_until > now()")"
approved="$("${psql_db[@]}" -Atc "select count(*) from public.captures where status = 'approved'")"

echo "  approved: $ok   refused as already_held: $held   errors (incl. deadlocks): $errors"
echo "  active holders of Bethesda Fountain: $holders   captures marked approved: $approved"

"${psql_db[@]}" -c "delete from public.capture_reviews; delete from public.captures; delete from auth.users where email like 'dc-%@test.dev';"

if [[ "$ok" == 1 && "$held" == $((${#captures[@]} - 1)) && "$errors" == 0 && "$holders" == 1 && "$approved" == 1 ]]; then
  echo "  PASS: exactly one holder, no errors, no deadlocks"
else
  echo "  FAIL"; cat "$tmp"/out.* >&2; exit 1
fi

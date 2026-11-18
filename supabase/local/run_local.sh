#!/usr/bin/env bash
# LOCAL TESTING ONLY. Rebuilds a throwaway database called monument_test on a
# local Postgres (16+ with PostGIS and pgTAP), applies the Supabase stand-in
# and every migration in order, then runs the pgTAP tests and the concurrency
# test. Never point this at the hosted project.
#
# Usage: supabase/local/run_local.sh            (uses PG* env vars / local socket)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
db=monument_test
psql_admin=(psql -X -q -v ON_ERROR_STOP=1 -d postgres)
psql_db=(psql -X -q -v ON_ERROR_STOP=1 -d "$db")

"${psql_admin[@]}" -c "drop database if exists $db with (force)" -c "create database $db"
"${psql_db[@]}" -f "$here/supabase_stub.sql"
"${psql_db[@]}" -c "create extension if not exists pgtap with schema extensions"

for f in "$root"/migrations/*.sql; do
  echo "migrate: $(basename "$f")"
  "${psql_db[@]}" -f "$f"
done

# Re-running every migration must fail loudly or be a no-op; the seed must be a no-op.
echo "re-run seed (must be a no-op):"
"${psql_db[@]}" -f "$root/migrations/20261117230300_seed_monuments.sql"

echo "pgTAP:"
pg_prove -d "$db" --ext .sql "$root"/tests/database/

echo "concurrency:"
"$here/concurrency_one_holder.sh" "$db"
echo "concurrency (decide_capture):"
"$here/concurrency_decide.sh" "$db"

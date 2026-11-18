# Monument Capture: database

Everything the game enforces lives here as SQL. The browser can read some
tables and write none; every change goes through a Postgres function called
with `rpc()` (added from Stage 1 on).

## Layout

| Path | What it is |
|---|---|
| `migrations/` | The schema, in order. These are what you run against the hosted project. |
| `tests/database/` | pgTAP tests. Portable: they also run with `supabase test db`. |
| `scripts/` | Hand-run admin SQL for the SQL Editor, e.g. `make_moderator.sql`. |
| `local/` | **Local testing only.** A stand-in for Supabase's `auth` schema and roles, plus scripts. Never run these against the hosted project. |

## Applied to the hosted project (MN Capture)

| Migration | Applied |
|---|---|
| `20261117230000_extensions.sql` | 2026-11-17 |
| `20261117230100_core_schema.sql` | 2026-11-17 |
| `20261117230200_security.sql` | 2026-11-17 |
| `20261117230300_seed_monuments.sql` | 2026-11-17 |
| `20261117230400_no_auto_expose.sql` | 2026-11-17 |
| `20261118000000_profile_on_signup.sql` | 2026-11-17 |
| `20261118010000_get_map.sql` | 2026-11-17 |
| `20261118020000_start_capture.sql` | 2026-11-17 |
| `20261118030000_capture_photos.sql` | 2026-11-17 |
| `20261118040000_decide_capture.sql` | 2026-11-17 |
| `20261118050000_manage_monuments.sql` | 2026-11-17 |
| `20261118060000_release_hold.sql` | 2026-11-17 |

Add a row here whenever you run a new migration against the hosted project.

## Applying migrations to the hosted project

Run every file in `migrations/` **in filename order**, once each:

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Paste the whole of the next file, click **Run**, and check it says *Success*.
3. Repeat for each file.

Do **not** enable PostGIS from the dashboard's Extensions page first; the
first migration installs it into the `extensions` schema, where the later
migrations expect it.

The seed migration (`..._seed_monuments.sql`) and `..._no_auto_expose.sql`
are safe to re-run; the others are not.

`..._no_auto_expose.sql` is a safety net for a project created with
**Automatically expose new tables** ticked: it turns that behaviour off in SQL.
Our hosted project (MN Capture) was created with it unticked, so there it is a
no-op. The local tests simulate the ticked setting to prove it works.

## Changing settings while testing

All tunables are in one row of `public.game_settings`. In the SQL Editor, for example:

```sql
update public.game_settings set lock_duration = interval '2 minutes';   -- test lock expiry quickly
update public.game_settings set lock_duration = interval '60 minutes';  -- put it back for the demo
```

## Running the tests locally

Needs Postgres 16+ with PostGIS and pgTAP (`pg_prove`). From the repo root:

```bash
supabase/local/run_local.sh
```

This drops and recreates a throwaway database called `monument_test`, applies
the stand-in and all migrations, runs the pgTAP tests, then runs the
concurrency tests: many sessions approving different captures of the same
monument at the same instant, first straight against the constraint and then
as many different moderators through `decide_capture()`. Both must leave
exactly one holder; the second must also produce no errors or deadlocks.

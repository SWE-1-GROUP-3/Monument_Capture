# Step 4 local setup and Supabase connection guide

The backend now runs Flyway migrations and exposes public `GET /api/health` plus authenticated `GET /api/me`. Login uses Supabase Auth directly. Gameplay endpoints and private photo upload/download adapters are step 5 work. The frontend still displays the local monument catalog; it never treats a local gameplay mutation as shared success for a real account.

## 1. Prerequisites

- Java 17+ and Maven 3.9+.
- A Node version supported by the repository's Expo SDK; use `npm ci` in `mobile/`.
- PostgreSQL 17 with PostGIS for database development, or Docker Desktop for the optional database container.
- A Supabase project for real email/password sessions and private Storage. No project or credentials are required for the unit tests; the database tests use a disposable PostgreSQL/PostGIS database. Docker database setup alone does not provide Supabase Auth.

## 2. Local PostgreSQL

Copy `backend/.env.example` to `backend/.env`. Set `LOCAL_DB_ADMIN_PASSWORD` to a local password before starting the optional container:

```bash
cd backend
docker compose up -d database
docker compose exec database psql -U postgres -d monument_capture
```

Inside psql, create separate login roles and set their passwords interactively (no passwords in shell history):

```sql
CREATE ROLE monument_migrator LOGIN;
\password monument_migrator
CREATE ROLE monument_app LOGIN;
\password monument_app
\q
```

Bootstrap PostGIS, the private gameplay schema, and migration history schema:

```bash
docker compose exec -T database psql -U postgres -d monument_capture \
  -v ON_ERROR_STOP=1 -v migration_role=monument_migrator -v application_role=monument_app \
  < scripts/bootstrap.sql
```

Set `DATABASE_PASSWORD` and `MIGRATION_DATABASE_PASSWORD` in `backend/.env` to the corresponding role passwords. The example JDBC URLs use port 55432. The database container binds only to localhost and persists data in a named volume. Stop it with `docker compose down`; retaining the volume preserves local data.

For an installed PostgreSQL server, perform the same database/role creation and run bootstrap.sql using an administrator's psql connection. Use a dedicated disposable database for the integration tests. Bootstrap schemas as admin; the migration identity intentionally has no database-wide CREATE permission. Flyway history lives in `flyway`, while gameplay tables live in `app`.

## 3. Backend startup

From `backend/`, export your local environment and run the server:

```bash
set -a
. ./.env
set +a
mvn spring-boot:run
```

Spring Boot does not automatically read `.env`. Startup runs V1–V3 with the migration identity, then uses the restricted application identity for queries. Migrations create users/monuments, uploads/captures/reviews, and seed 15 actual repository monuments with stable UUIDs. No users or passwords are seeded. Bootstrap grants application-role access only to gameplay tables, including future tables created by the migration identity in `app`.

`GET http://localhost:8080/api/health` should return 200. `GET /api/me` without a token returns 401. Health describes the running API process, not a Supabase Auth/Storage readiness probe.

## 4. Connect Supabase when the project is ready

1. Create the project and enable PostGIS through an authorized admin connection. Use separate migration/application login roles and run bootstrap.sql against the project database. Keep `app` and `flyway` outside the exposed Data API schemas; do not grant public API roles gameplay access.
2. Set the database JDBC URLs/role passwords in `backend/.env`. Use TLS (`?sslmode=require`). Use the direct database endpoint where your network supports it, or the session pooler for IPv4 environments. Copy the exact host, port, and pooler username from the project's connection dialog; do not use transaction pooling for this local long-running backend.
3. Enable email/password Auth, disable public signup, and configure an asymmetric signing key (ES256 or RS256). Set `SUPABASE_URL`, `SUPABASE_JWT_ISSUER=<project-url>/auth/v1`, and audience `authenticated` in `backend/.env`. The backend fetches public keys from `<issuer>/.well-known/jwks.json`; no JWT signing secret is needed.
4. Use Supabase admin tooling to pre-create and confirm at least two player accounts and one moderator. Do not use the previous local prototype passwords. For each Auth user, obtain its UUID and run `scripts/provision-user.sql` with the migration/admin connection and psql variables `auth_subject_id`, `email`, `display_name`, and `role`. Roles are `player` or `moderator`. This creates an independent application UUID mapped uniquely to the verified Auth subject. No public provisioning endpoint exists.
5. Create a private `monument-photos` bucket with JPEG/PNG/WebP and 10 MiB limits. Keep general client list/read/update/delete permissions disabled. Signed upload/read adapters are not implemented yet. `PHOTO_BUCKET` and `SUPABASE_SECRET_KEY` are reserved for step 5 and currently unused.
6. Copy `mobile/.env.example` to `mobile/.env`. Set the project URL and publishable key, plus `EXPO_PUBLIC_API_URL`. Never place a secret/service-role key, database password, or signing secret in any `EXPO_PUBLIC_` variable. Restart Expo after editing environment values.
7. Put the exact frontend origins in backend `ALLOWED_ORIGINS`. Defaults cover web on localhost ports 8081 and 19006. On a phone, localhost points to the phone: use your computer's reachable LAN address for the backend and ensure network/firewall access. Browser camera/location access needs localhost or HTTPS; verify on the intended devices.

Use the provider's configured token expiry; target 15 minutes for access tokens. Current-session logout clears local credentials even if remote revocation fails. An already issued access JWT can remain valid until expiry. The UI reports logout/account verification failures. Browser sessions use SDK-backed localStorage; native sessions use chunked Expo SecureStore storage. Native module changes require a compatible Expo Go or rebuilt development client.

Provider references: [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [JWT verification](https://supabase.com/docs/guides/auth/jwts), [password login](https://supabase.com/docs/guides/auth/passwords), [logout](https://supabase.com/docs/guides/auth/signout), [private Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## 5. Frontend startup and drafts

```bash
cd mobile
npm ci
npm run web
```

Login requires configured Supabase credentials and a matching backend application user. There is no local-password fallback. Until the project is configured, the login screen reports that login is unavailable.

Drafts are separate from captures and keyed by internal player ID plus monument ID. Reopening resumes the same photo; different monuments/accounts retain separate drafts. Navigation and failed submissions preserve drafts; explicit discard removes one. Web drafts persist locally where browser storage is available; native drafts are currently in memory for the app session. Cross-device persistence is outside MVP. The local-state version changed from 7 to 8, resetting old prototype state on first load.

Shared submissions, moderation, and monument changes currently report that the action is unavailable, rather than creating a local-only success for a real account. Wire these actions to the real endpoints in steps 5–6. The local submission adapter remains available only to isolated tests.

## 6. Verification

Frontend:

```bash
cd mobile
npm run typecheck
npm test
npm run export:web
```

Backend unit/security tests (no database required; JWT tests start a temporary local HTTP key server):

```bash
cd backend
mvn test
```

Disposable database integration tests, after bootstrap and loading its environment:

```bash
RUN_DATABASE_TESTS=true mvn test
```

These apply real Flyway migrations and exercise PostGIS, seed coordinates, pending uniqueness/retry indexes, photo ownership, GPS constraints, system attribution, one-hour holds, and restricted runtime permissions. Test fixture data rolls back. Do not point integration tests at shared or production databases. The same command validates migration checksums on subsequent runs.

Pending live checks: create the Supabase project/bucket/accounts; verify player/moderator login, restore/refresh/logout, teammate access, and camera/location on actual devices. Step 4 is not fully verified until those checks pass. No public deployment is required for this sprint.

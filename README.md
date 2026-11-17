# Monument Capture

Monument Capture is a mobile game where players discover nearby monuments, verify that they are in range, submit photo evidence, and compete to hold monuments. Moderators review captures and manage the monument catalog.

## Repository

- `mobile/` — Expo, React Native, and TypeScript frontend
- `backend/` — Spring Boot REST API with migrations, JWT authorization, health, and account identity

The frontend uses Supabase Auth and verifies application identity/role through the backend. Gameplay screens still display the temporary local catalog while step 5 APIs are built. Drafts are local and separate from submitted captures. Real accounts cannot record local-only gameplay successes.

## Current MVP documentation

- [MVP decisions](docs/mvp-decisions.md) — agreed scope and gameplay rules.
- [Backend, schema, and API contract](docs/backend-schema-api-contract.md) — confirmed schema/interfaces and Supabase authentication/storage contracts.
- [Implementation plan](docs/implementation-plan.md) — task order, dependencies, owners, status, and acceptance conditions.
- [Current MVP Requirements](https://docs.google.com/document/d/1H2VGk9Opk9Qfs1-GMGAfWHScByrwF-YYS534Mgal1w0/edit)
- [Current MVP Design](https://docs.google.com/document/d/1Fl15HPBlyXUN6gXmj8ybehIFlhytORZeH_qnRWcB1TI/edit)

The backend implements Flyway migrations, Supabase JWT verification, role-based route restrictions, and `/api/me`. Shared gameplay and photo APIs remain planned. See [local setup and verification](docs/local-supabase-setup.md).

This branch selects Supabase PostgreSQL/PostGIS, private Storage, and Auth. The integration branch and MVP scope/contract were confirmed on November 17, 2026. See [Supabase branch decisions](docs/supabase-branch-decisions.md) for the rationale, implementation boundaries, remaining setup, and how to return to the baseline. Task ownership remains unassigned.

These choices are documented on `feat/supabase-mvp`, based on `integration/mvp-baseline`. Service provisioning and live Supabase verification remain pending; authentication and database foundations are implemented locally. No remote push is authorized.

For the upcoming sprint, the frontend and backend can run locally with shared database/storage connections. Public deployment is deferred.

## Prerequisites

- Node.js 22.13+ (22.x), 24.3+ (24.x), or 26+, with npm
- Expo Go or an Android/iOS emulator for native development
- Java 17+
- Maven 3.9+

## Run the frontend

```bash
cd mobile
npm ci
npm run web
```

For native development, run `npm start` and open the project in Expo Go or a compatible development build. Browser camera and location access require `localhost` or HTTPS.

Login requires a configured Supabase project and a pre-created Auth account mapped to an application user. The former local-password login is removed. Follow the [setup guide](docs/local-supabase-setup.md) for credentials, test accounts, and device networking.

## Run the backend

First bootstrap PostgreSQL/PostGIS and configure `backend/.env` as described in the setup guide. Then:

```bash
cd backend
set -a
. ./.env
set +a
mvn spring-boot:run
```

Endpoints: public `GET http://localhost:8080/api/health` and protected `GET /api/me`.

## Verify the project

```bash
cd mobile
npm run typecheck
npm test
npm run export:web

cd ../backend
mvn test
```

## Implemented frontend features

- Email/password login with player and moderator roles
- Map-first monument discovery with live device location
- Monument availability, holder, and lock countdown
- Distance, GPS accuracy, freshness, lock, and duplicate-capture checks
- Camera capture or photo selection with resumable account/monument drafts
- Local prototype capture submission, player activity, holdings, records, and statistics
- Moderator review queue with approve/reject rules
- Moderator monument creation, editing, activation, and deactivation
- Web persistence through local storage

## Remaining production work

- Provision Supabase test accounts and verify live login/refresh/logout; extend ownership checks to upcoming record APIs
- Connect gameplay services to the migrated database tables
- Move capture and moderation rules server-side, including transactional one-holder enforcement
- Add protected photo storage and server-side validation
- Connect the frontend store to the API
- Configure hosted frontend/backend environments and secrets
- Add end-to-end tests against the deployed system

## Configuration and secrets

Copy `mobile/.env.example` to `mobile/.env` when a custom API URL is needed. Never commit `.env` files, API keys, signing files, database credentials, or generated build output. Provide production configuration through the deployment environment or an approved secret manager.

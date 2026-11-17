# Monument Capture

Monument Capture is a mobile game where players discover nearby monuments, verify that they are in range, submit photo evidence, and compete to hold monuments. Moderators review captures and manage the monument catalog.

## Repository

- `mobile/` — Expo, React Native, and TypeScript frontend
- `backend/` — Spring Boot REST API (currently only a health endpoint)

The frontend currently uses a temporary local store and local authentication so the implemented app flows remain usable before the backend and database are connected. It starts with a clean capture/review history and contains no presentation controls or fabricated activity.

## Current MVP documentation

- [MVP decisions](docs/mvp-decisions.md) — agreed scope and gameplay rules.
- [Backend, schema, and API contract](docs/backend-schema-api-contract.md) — proposed schema, interfaces, and remaining technical decisions.
- [Implementation plan](docs/implementation-plan.md) — task order, dependencies, owners, status, and acceptance conditions.
- [Current MVP Requirements](https://docs.google.com/document/d/1H2VGk9Opk9Qfs1-GMGAfWHScByrwF-YYS534Mgal1w0/edit)
- [Current MVP Design](https://docs.google.com/document/d/1Fl15HPBlyXUN6gXmj8ybehIFlhytORZeH_qnRWcB1TI/edit)

These documents describe intended MVP behavior, not completed backend functionality. The backend currently exposes only the health endpoint.

Database/photo hosting and authentication provider/session selection remain pending. The schema/API proposal and task ownership need team review.

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

The temporary local accounts all use password `local123`:

| Email | Role |
| --- | --- |
| `alex@monument.local` | Player |
| `sam@monument.local` | Player |
| `priya@monument.local` | Player |
| `moderator@monument.local` | Moderator |

These credentials are development scaffolding, not secure authentication. Replace the local auth/store with backend APIs before deployment.

## Run the backend

```bash
cd backend
mvn spring-boot:run
```

The current endpoint is `GET http://localhost:8080/api/health`.

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
- Camera capture or photo upload
- Capture submission, player activity, holdings, records, and statistics
- Moderator review queue with approve/reject rules
- Moderator monument creation, editing, activation, and deactivation
- Web persistence through local storage

## Remaining production work

- Implement backend authentication and authorization
- Add database persistence for users, monuments, captures, and reviews
- Move capture and moderation rules server-side, including transactional one-holder enforcement
- Add protected photo storage and server-side validation
- Connect the frontend store to the API
- Configure hosted frontend/backend environments and secrets
- Add end-to-end tests against the deployed system

## Configuration and secrets

Copy `mobile/.env.example` to `mobile/.env` when a custom API URL is needed. Never commit `.env` files, API keys, signing files, database credentials, or generated build output. Provide production configuration through the deployment environment or an approved secret manager.

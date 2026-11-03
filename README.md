# Monument Capture

Monument Capture is a mobile game where players discover nearby monuments, submit photo evidence to capture them, and track ownership. Moderators review submissions, while coordinators manage monument records.

This repository contains the Sprint 3 starter architecture:

- `mobile/` — Expo + React Native + TypeScript frontend
- `backend/` — Spring Boot REST API

## Branches

- `prod` — production-ready releases
- `prestaging` — release validation before production
- `playground` — experiments that should not affect release branches
- `dev_jason_inital_setup` — initial Sprint 3 scaffolding and setup work

No branches are merged as part of this initial setup.

## Prerequisites

- Node.js 22.13+ (22.x), 24.3+ (24.x), or 26+ and npm (required by the current Expo/Metro dependencies)
- Expo Go or an Android/iOS emulator
- Java 17 or newer
- Maven 3.9 or newer

## Run the mobile app

```bash
cd mobile
npm install
npm start
```

Copy `mobile/.env.example` to `mobile/.env` when a custom API URL is needed. The default example points to a local backend and contains no secrets.

## Run the backend

```bash
cd backend
mvn spring-boot:run
```

The starter health endpoint is available at `GET http://localhost:8080/api/health`.

## Verify the projects

```bash
cd mobile
npm run typecheck

cd ../backend
mvn test
```

## Configuration and secrets

- Never commit `.env` files, API keys, signing files, database credentials, or generated build output.
- Commit only safe examples such as `.env.example`.
- Provide production configuration through the deployment environment or an approved secret manager.

## Current starter screens

- Sign-in with demo accounts
- Player: home, map with hold status, monument detail, capture flow with photo, activity (holdings + history), profile
- Moderator: home, review queue, review with approve/reject-with-reason, monument management

See **Sprint demo** below.

## Sprint demo: frontend-only MVP

The app now runs the full MVP loop with **no backend**. All game data and rules
live in the browser, and the data is saved in `localStorage` so it survives a
page refresh. Run it the usual way:

```bash
cd mobile
npm ci --registry=https://registry.npmjs.org
npm run web -- --port 8082
```

### Demo script (about 3 minutes)

1. Open http://localhost:8082 and sign in as **Alex Rivera** (player).
2. **Map**: green = free, orange = held, purple = yours. Tap Bethesda Fountain to see who holds it and the lock countdown.
3. Open **Washington Square Arch** → **Teleport here (demo)** → **Capture this monument**.
4. Try **Here, poor GPS** → **Check my location** to show the accuracy check rejecting you. Then **Teleport here** → **Check again** → **Start capture**.
5. **Upload** any photo → **Submit for review**.
6. **Profile → Switch account → Morgan Lee** (moderator). Open the **Queue**, open Alex's capture, pick a reason, **Approve**.
7. Switch back to Alex: the arch is now **Yours** with a one-hour lock.
8. **Profile → Demo tools → +1 hour**: the lock expires and the arch is free again.

**Profile → Demo tools → Reset demo data** restores the starting state.

### Accounts

| Email | Role |
| --- | --- |
| alex@demo.test, sam@demo.test, priya@demo.test | Player |
| mod@demo.test | Moderator |

Any other email signs in as a new player. There are no passwords.

### Where the code lives

| Path | What it is |
| --- | --- |
| `mobile/src/demo/types.ts` | The four MVP entities: User, Monument, Capture, CaptureReview |
| `mobile/src/demo/rules.ts` | Every game rule as pure functions: capture checks (accuracy → distance → lock), lifecycle, approve/reject, locks derived at read time, monument management |
| `mobile/src/demo/store.ts` | The single store screens read from (`useDemoState`) and write through (`demo.*`) |
| `mobile/src/demo/seed.ts` | 15 NYC monuments, 4 users, and a starting story (holds, an expired lock, a queue) |
| `mobile/src/demo/location.ts` | Real GPS or the simulated position from Demo tools |
| `mobile/src/components/DemoTools.tsx` | Demo-only controls: fake location, fast-forward clock, reset |

**Moving to Supabase or Firebase:** rewrite `store.ts` so each `demo.*` action calls the backend, and move the
checks in `rules.ts` server-side (especially the lock check on approval, which needs a transaction or constraint
so two moderators can never create two holders). Screens should not need to change.

### Known demo limitations

- Anyone can pick any account; roles are not secure. That is expected without a backend.
- The "server clock" is the browser clock plus the Demo tools offset.
- Photos are shrunk and stored in `localStorage` (a few MB total). If it fills up, a warning appears in Demo tools.
- On native (Expo Go), data is kept in memory only and resets when the app restarts.

## US-02: Monument Map prototype

The existing **Explore** tab displays nine mock NYC monuments. Pan or zoom the map,
then select a green monument marker to see its name. No backend is needed.
The prototype assumes the Player is logged in; authentication and server-side
Player authorization are not implemented.

### Browser preview

```bash
cd mobile
npm ci --registry=https://registry.npmjs.org
npm run web -- --port 8082
```

Open http://localhost:8082/explore. The web map uses React Leaflet and
OpenStreetMap tiles, so an internet connection is required for the basemap.

### iOS / Android preview

```bash
cd mobile
npm ci --registry=https://registry.npmjs.org
npm start
```

Open the project with an SDK-compatible Expo Go app or an iOS/Android development
build. The native map uses `react-native-maps` (Apple Maps on iOS, Google Maps on
Android). Standalone Android builds require a Google Maps SDK key and provider
configuration; no key is committed in this prototype. See the
[Expo map setup](https://docs.expo.dev/versions/latest/sdk/map-view/).
The Expo Location plugin configures the foreground permission explanation for
native builds; rebuild a development client after changing native configuration.

### Location and empty data

Opening **Explore** automatically starts the foreground location permission flow
once per mounted screen. Re-renders do not repeat the request. Use **Show my location**
to retry manually. A granted, valid position appears as a blue marker;
the map stays centered on the NYC play area, so a player outside NYC may need to
pan/zoom out to find it. Location is a one-time fix, not continuous tracking.
Denial, unavailable positioning, or timeout shows a message, clears any previous
player marker, and leaves the map usable. Native positioning has a 15-second
timeout after permission is granted; late results are ignored. Browser location requires localhost or HTTPS. Retry with the same
button; previously blocked permission may need to be enabled in browser/device settings.

Mock data lives in `mobile/src/data/mapMonuments.ts`, using the reusable
`MapMonument` type (`id`, `name`, `latitude`, `longitude`). Replace that array with
REST API results later. Setting it to `[]` leaves the base map and controls visible
and displays an empty-state message. The play area is a fixed NYC viewport for now;
it does not enforce a geographic boundary. Missing arrays are treated as empty;
invalid records and duplicate IDs are ignored. Web tile errors show a non-blocking
message; check connectivity and pan/zoom to request tiles again.

### Automated checks

```bash
cd mobile
npm run typecheck
npm test
```

Vitest and Testing Library cover web markers/popups, multiple and empty monument
lists, native marker coordinate props, optional player markers, browser location
success/denial/unavailability/timeout, retry, and native permission ordering.
The web map tests render Leaflet in jsdom; native map SDK rendering is mocked and
still needs device validation. Tests do not download map tiles.

Future backend work: load monuments and available play areas from Spring Boot,
handle API loading/errors, and enforce authenticated Player access server-side.
No capture, locking, moderation, or login behavior is added by US-02.

## US-05: Capture-radius verification

The **Capture** tab contains the US-05 prototype flow. It requests foreground location permission only when the player attempts to start a capture, checks GPS accuracy, and compares the player's position with the selected monument's configured radius.

The prototype covers all agreed outcomes:

- A player inside the radius can continue to the monument photo step.
- A player outside the radius is told to move closer.
- An inaccurate or unavailable location asks the player to retry.
- Denied location permission prevents capture and explains that permission is required.

`mobile/src/data/captureMonument.ts` provides the temporary selected monument until the discovery flow passes a real monument into Capture. US-06 will replace the photo-step placeholder with camera capture.

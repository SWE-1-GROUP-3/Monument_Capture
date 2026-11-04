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

The map is the home screen. Everything else opens as a bottom sheet from the bar at the bottom.

1. Open http://localhost:8082 and log in as **Alex Rivera** (tap the shortcut, or `alex@demo.test` / `demo123`).
2. **Map**: blue pins are free, orange are held by someone else, purple are yours. Tap **Bethesda Fountain** to see who holds it and the lock countdown.
3. Tap **Washington Square Arch** → **📍 Teleport here (demo)**. The capture ring and "1 monument in range" appear, and **📷 Capture** turns on.
4. **📷 Capture** → upload or take a photo → **Submit for review** → **Back to map**. The sheet now says "✅ Submitted! Waiting for moderator review."
5. **Profile** → switch account to **Morgan · Mod**. The bar becomes Profile | Queue | Monuments. Open **Queue**, open Alex's capture and **Approve** (no reason needed).
6. Switch back to **Alex**: the arch is purple, its sheet says **Yours**, and **Records** shows the new hold ("Last held: Now").
7. **Profile → Demo tools → +1 hour**: the lock expires and the arch is free again.

**Profile → Demo tools → Reset demo data** restores the starting state.

### Error cases (how to show each one)

Every error can be triggered on cue. The capture screens have a dashed **Demo** card with buttons for them, and **Profile → Demo tools** has the same switches.

| Error | How to trigger it | What the player sees |
| --- | --- | --- |
| Wrong login | Login: any email with a wrong password | "Invalid email or password." |
| Empty login | Login: press Log In with empty fields | "Please enter your email and password." |
| Monument held by someone else | Bethesda Fountain → **Try to capture anyway** → Teleport here → Check | "Monument is locked. Held by Sam Chen for another 35 min." |
| Monument already held by you | Capture Statue of Liberty as Alex | "Held by you for another …" |
| Already submitted | Capture Brooklyn War Memorial as Alex | "Already submitted" |
| Too far away | Check-in demo card → **400 m away** | "You are about 400 m away. Move 300 m closer." |
| Poor GPS | Check-in demo card → **Poor GPS** | "Location not accurate enough (needs 50 m or better)" |
| Location permission denied | Check-in demo card → **Location denied** | "Location permission needed" |
| GPS unavailable | Check-in demo card → **GPS unavailable** | "Location unavailable" |
| Camera permission denied | Photo step demo card → **Permission denied** → Open camera | "Camera access blocked" + how to allow it |
| No camera | Photo step → **No camera** | "No camera found" + upload instead |
| Camera in use | Photo step → **Camera in use** | "Camera is in use" |
| Not a photo | **Upload a photo instead** → pick a .txt or .pdf | "That file isn't a photo." |
| Reject without a reason (US-14) | Moderator review → Reject with an empty reason | "A reason is required to reject a capture." (Approving needs no reason.) |
| Approve when already held (one-holder rule) | As Morgan, open Priya's **Bethesda Fountain** capture → Approve | "This monument is already held by Sam Chen … Reject this capture instead." |
| Bad monument data | Monuments → Add → latitude `123` | "Latitude must be between -90 and 90." |

The real camera errors also work without the switches. Blocking camera access in the browser (or opening the app on plain `http://` from another device) shows the same messages. The web camera uses a live preview (`getUserMedia`), so it needs `localhost` or `https`.

### Accounts (US-01 mock login)

Every demo account uses the password **`demo123`**. The login screen also has one-tap shortcuts.

| Email | Role |
| --- | --- |
| alex@demo.test, sam@demo.test, priya@demo.test, demo@example.com | Player |
| mod@demo.test | Moderator |

An unknown email or wrong password shows "Invalid email or password."

### Where the code lives

| Path | What it is |
| --- | --- |
| `mobile/src/demo/types.ts` | The four MVP entities: User, Monument, Capture, CaptureReview |
| `mobile/src/demo/rules.ts` | Every game rule as pure functions: capture checks (accuracy → distance → lock), lifecycle, approve/reject, locks derived at read time, monument management |
| `mobile/src/demo/store.ts` | The single store screens read from (`useDemoState`) and write through (`demo.*`) |
| `mobile/src/demo/seed.ts` | 15 NYC monuments, 4 users, and a starting story (holds, an expired lock, a queue) |
| `mobile/src/demo/location.ts` | Real GPS or the simulated position from Demo tools |
| `mobile/src/demo/selectors.ts` | Read-only selectors for the map UI: level, records, badges, range, area name |
| `mobile/src/game/` | Map-first home (`GameHome.web.tsx`) and its bottom sheets (`sheets.web.tsx`) |
| `mobile/src/theme/` | Baloo 2 font and the game stylesheet for web |
| `mobile/src/auth/AuthContext.tsx` | US-01 `useAuth()` (Iris), backed by the store's session |
| `mobile/src/utils/monumentAvailability.ts` | US-03 available / locked / unknown status (Yuming) |
| `mobile/app/monuments/[monumentId].tsx` | US-03 monument details with live lock countdown |
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

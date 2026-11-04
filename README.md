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

- Home dashboard
- Interactive monument map (US-02 prototype)
- Photo capture instructions
- Player profile and activity summary

The sample monument data is intentionally local and can be replaced with backend calls in a later sprint.

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
- A stale location or a request that exceeds 15 seconds is rejected and restores the retry controls.
- Denied location permission prevents capture and explains that permission is required.

`mobile/src/data/captureMonument.ts` provides the temporary selected monument until the discovery flow passes a real monument into Capture. US-06 will replace the photo-step placeholder with camera capture.

## US-09 to US-14: Capture review flow (Aayush)

Hardcoded frontend prototype of what happens after a capture is submitted.

| Story | Where |
| --- | --- |
| US-09 Pending Review | **My captures** tab: new submissions show *Pending Review* until a moderator decides. A failed submission shows "Your submission was not received" and creates no record. |
| US-10 Approved | Approved captures show *Approved* and stay in the player's list. |
| US-11 Rejected + reason | Rejected captures show *Rejected* and the moderator's reason. |
| US-13 Moderation queue | **Queue** tab (moderators only): pending captures oldest first with photo, player, reported distance and submission time. Players can't open it. |
| US-14 Approve / reject | Review screen: approve (reason optional) or reject (reason required). Players see no approve/reject options. |

Code: `mobile/src/review/` (types, mock data, rules, store) and the screens `app/(tabs)/captures.tsx`, `app/(tabs)/queue.tsx`, `app/review/[id].tsx`. Tests: `mobile/src/review/*.test.ts(x)`.

**Stand-ins until other stories merge** (clearly labelled in the app):
- **Profile → Switch user** replaces login (US-01) so you can act as a player (Alex, Sam) or moderator (Morgan).
- **My captures → Submit a test capture / Simulate a failed submission** replaces the capture flow (US-05 to US-08).
- The challenge photo and target (US-07, US-08) are noted as not yet available in the queue and review screen.

Try it: `cd mobile && npm install && npm run web -- --port 8082`, open http://localhost:8082/captures, submit a test capture, switch to Morgan in Profile, then approve or reject it from the Queue.

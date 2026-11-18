# Monument Capture

A web game where players claim real-world monuments by going to them. A player starts a capture at a monument, photographs it, and a moderator approves or rejects it. An approved capture locks the monument to that player for a fixed time. CS-GY 6063, NYU Tandon.

**Team members:** read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Where things stand

`main` starts as a skeleton:

- **`supabase/`** has the database: tables, the one-holder-per-monument rule, row-level security, the monument list, and tests.
- **`mobile/`** has the game UI (Expo, built for the web). It still runs entirely in the browser on a local demo store with fake accounts.

Each part below connects one piece of the game to the server. Each one lands as its own pull request, **in this order**, because each builds on the one before.

| # | Part | Owner | Status |
|---|---|---|---|
| 1 | Real sign-up and login, profile created on sign-up | Iris | Done |
| 2 | Map reads monuments and holds from the server, server clock | Bill | Done |
| 3 | Start / cancel a capture on the server (distance, accuracy, moderator flags); deploy to GitHub Pages | Jason | Done |
| 4 | Photos to Supabase Storage, submitting, moderator approve/reject and review queue | Aayush | Done |
| 5 | Moderators manage monuments and can end a hold early | Yuming | Not started |

## Run it

Needs Node.js 22 or newer.

```bash
cd mobile
npm ci
npm run web
```

## Tests

```bash
cd mobile && npm run typecheck && npm test   # app
supabase/local/run_local.sh                  # database (Postgres 16 + PostGIS + pgTAP)
```

Both run automatically on every pull request.

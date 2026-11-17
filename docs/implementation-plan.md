# Monument Capture — MVP Implementation Plan

Updated November 17, 2026 · Group 3

This plan organizes the remaining work by dependencies. It does not claim that planned backend functionality is implemented. Owners remain unassigned until the team agrees on responsibilities.

Read alongside [MVP decisions](mvp-decisions.md) for gameplay requirements and the [backend, schema, and API contract](backend-schema-api-contract.md) for confirmed implementation details on this Supabase branch. The updated [requirements](https://docs.google.com/document/d/1H2VGk9Opk9Qfs1-GMGAfWHScByrwF-YYS534Mgal1w0/edit) and [design](https://docs.google.com/document/d/1Fl15HPBlyXUN6gXmj8ybehIFlhytORZeH_qnRWcB1TI/edit) provide the wider project context.

## Current baseline

- The frontend includes map discovery, photo/capture flows, player history, moderation, and monument management, backed by local state and mock authentication.
- The Spring Boot backend currently provides only a health endpoint; gameplay APIs are planned.
- Spring Boot/Java 17 and PostgreSQL/PostGIS are confirmed. This branch selects Supabase PostgreSQL/PostGIS, private Storage, and Supabase Auth with bearer access tokens.
- The upcoming sprint can run the frontend/backend locally with shared database and private storage connections. Public deployment is deferred for this sprint.
- `integration/mvp-baseline`, based on `non_demo`, is the confirmed integration branch. Feature branches start there and merge back through pull requests after publication is authorized. Baseline documentation was committed as `9bc66b5`. The separate local `feat/supabase-mvp` branch records the Supabase choice; the integration baseline is unchanged. No publication or independent teammate adoption is claimed.
- The user confirmed the MVP scope and contract on November 17, 2026. See [Supabase branch decisions](supabase-branch-decisions.md) for the rationale and remaining setup. External requirements/design documents have not been edited by this branch.

## Implementation order and ownership

Status reflects this preparation checkout, not unreviewed changes in other branches. Update rows as work is assigned, implemented, and verified. Suggested status values: Not started, In progress, Ready for review, Blocked, Verified.

| Order | Task | What needs to be completed / acceptance condition | Depends on | Owner | Current status |
| --- | --- | --- | --- | --- | --- |
| 1 | Establish the integration branch | Use `non_demo` as the starting point; agree on the shared integration branch and merge workflow. Publish only when authorized, then teammates branch from and merge into that agreed branch. | None | Unassigned | Confirmed locally; publication and teammate rollout deferred |
| 2 | Align MVP documentation | Review two roles, moderator reporting duties, challenges as stretch, local drafts, final submission, approval/system rejection, one-hour holds, and visit-count rules. Keep requirements, design, and repository references consistent. | None; parallel with 1 | Unassigned | Scope/contract confirmed; repository docs aligned; external-doc synchronization pending |
| 3 | Finalize backend setup, schema, and API contracts | Review table fields, constraints, location snapshots, DTOs, errors, idempotency, transaction order, and migration approach. Choose database/storage hosting and authentication/session mechanism; complete provider-specific configuration and auth contracts. | 1–2 for team baseline | Unassigned | Contract and providers confirmed for Supabase branch; implementation/verification pending |
| 4A | Database and migrations | Create shared tables, foreign keys, checks, unique pending-capture and retry indexes, system-review attribution, hold timestamps, accepted-location snapshots, and upload support. Seed existing monuments using actual repository coordinates. Apply migrations to a disposable database before shared use. | Agreed schema from 3; hosting choice for shared connection | Unassigned | Not started |
| 4B | Real authentication and authorization | Implement pre-created email/password accounts, real login/logout and identity/session verification. Enforce player/moderator permissions and record ownership in the backend; supply test accounts. No public signup/password reset in MVP. | Auth choice and identity contract from 3; required user tables from 4A | Unassigned | Not started; Supabase Auth selected |
| 4C | Update frontend drafts | Keep unfinished attempts as local player/monument drafts, resume the same draft on reopening, and preserve it on failed submission. Clear only after confirmed success or discard. Separate account drafts; no persisted in-progress capture or cross-device draft guarantee. | Confirmed rules in 2; submission contract in 3 | Unassigned | Not started |
| 4D | Local environment and shared-service setup | Document local frontend/backend startup; configure shared database/private storage, allowed origins and environment variables without committing secrets. Verify teammate access and camera/location behavior on intended browsers/devices. Public frontend/backend hosting and deployed HTTPS are deferred. | Provider/configuration decisions in 3 | Unassigned | Not started; Supabase selected; project/access setup pending |
| 5A | Monument APIs and affected screens | Fetch shared monuments, availability, holder and hold expiry. Moderators can create/edit/activate/deactivate all monuments. Hide inactive monuments from player discovery while preserving private history. Connect map/details/management screens. | 4A–4B; working service connections | Unassigned | Not started |
| 5B | Photo storage and uploads | Support camera/gallery images in private storage with scoped upload grants, ownership/file checks and authorized evidence viewing. Enforce JPEG/PNG/WebP and the agreed size limit. Handle expired grants, failed uploads and abandoned-upload cleanup without deleting accepted evidence. | 4B, upload metadata from 4A, storage setup from 4D | Unassigned | Not started |
| 5C | Capture submission API | Collect fresh GPS after upload. Backend validates coordinates, accuracy, timestamp, distance, photo ownership/type/size, current active status/hold and duplicate pending submissions. Save one pending capture only on success, preserving accepted location/radius snapshots. Retries must not duplicate captures. | 4A–4B, 5B | Unassigned | Not started |
| 5D | Moderation and ownership transaction | Fetch oldest-first queue; require a reason for manual rejection. Approval locks the Monument row, approves one pending capture, starts a one-hour server-time hold and system-rejects every competing pending capture atomically. Coordinate submissions, rejection and monument edits with the same lock order. Preserve eligibility accepted at submission; approval checks current active status and hold without new GPS. | 4A–4B; evidence access from 5B for complete verification | Unassigned | Not started |
| 5E | Moderator visit counts | Return approved-capture totals for all monuments, including zero counts and inactive monuments. Count repeated approved captures again; exclude pending/rejected captures. Date filters use submission dates in America/New_York. Aggregate response contains no player identity/evidence. | 4A–4B; approved data from 5D for complete verification | Unassigned | Not started |
| 6 | Finish frontend integration | Replace local authentication and `demo.*` data/actions with real APIs. Connect submissions, history/reasons, queue, management, reports and holdings. Add loading, validation errors, retry behavior, system rejection labels and stale-approval warnings. Integrate each feature as its API becomes ready. | Each corresponding API; 4C for draft behavior | Unassigned | Not started |
| 7 | Hold expiry and shared-state refresh | Show countdown using server timestamps; expiry restores availability only when active and preserves approved history/visit counts. Refresh active pages every 15 seconds, after relevant actions and on page return; countdown updates locally each second. Backend writes always recheck current state. | 5A, 5D, affected parts of 6 | Unassigned | Not started |
| 8 | End-to-end verification and fixes | Test independent player/moderator sessions against the local backend and shared services. Verify camera/gallery, GPS refusal, held/inactive refusals, pending uniqueness, retries, manual/system rejections, approval/submission races, expiry, reports, cleanup and permissions. Failed submissions create no capture. Repeat deployment-specific checks if deployed later. | Integrated features and working local/shared-service setup | Unassigned | Not started |
| 9 | Final delivery | Update setup instructions and design references; prepare stable demo accounts/data, evidence of tests, presentation walkthrough and backup screenshots/video. Record any remaining limitations honestly. Rehearse before the November 30 presentation. | 8; documentation/demo preparation may begin earlier | Unassigned | Not started |

## What can happen in parallel

- With the scope, contracts, and providers confirmed for this branch, 4A–4D can overlap: migrations, Supabase Auth integration, frontend drafts, and environment setup. Live verification still requires project access and credentials.
- Feature teams can draft 5A–5E against agreed interfaces while dependencies are built. Each row's dependencies still govern real integration and completion.
- Connect frontend screens as each API becomes available; do not defer all of step 6 until every backend feature is complete. Each feature owner should help integrate and verify its affected screens.
- Start test scenarios and setup instructions early. Mark functionality verified only after exercising the real backend/database/storage behavior.

## First shared milestone

One player logs in, loads shared monuments, submits a real photo with fresh GPS, and receives a pending record. A moderator in another session views the photo and approves it. The player sees the decision, and both sessions show the same holder and one-hour expiry.

Develop approval and automatic rejection as one transaction even if the first demonstration has only one pending capture. Then verify competing submissions, stale approvals and races before calling moderation complete.

## Important acceptance details

### Submission

1. Resume/create a local draft and check initial location/availability.
2. Upload the selected camera/gallery photo; no Capture exists yet.
3. Obtain a fresh location and submit with a stable retry key.
4. Backend verifies location/photo, locks the Monument row and checks current availability and pending uniqueness before inserting.
5. Clear the draft after confirmed success. For an uncertain response, retry the identical request/key to retrieve the accepted record.

No persisted start/cancel operations, initial-photo deadline, or expired capture status is required. Location defaults: monument radius 100m configurable, accuracy ≤50m, reading age ≤30 seconds at backend receipt. Confirmed technical defaults are documented in the contract.

### Approval and holds

- First successful approval wins, regardless of submission order. Queue order remains oldest first.
- Commit selected approval, one-hour hold and all competing pending rejections together. Label automatic decisions as system decisions with visible reasons.
- Losing stale approval requests show the existing rejected outcome and a warning; they do not restore pending status.
- Preserve location eligibility accepted at submission after monument coordinate/radius edits. No new GPS reading is required at review time.
- Inactive monuments cannot be approved. Their pending captures remain pending unless explicitly rejected; later reactivation permits review under current availability rules.
- Hold expiry changes availability, not approved status or historical visit totals. No scheduled hold-expiry cleanup is needed.

## Team review checklist

- [x] Confirm `integration/mvp-baseline` and feature-branch/PR workflow; publication remains deferred.
- [x] User confirms MVP scope/rules and schema/API implementation defaults for this branch.
- [ ] Synchronize external requirements/design documents and communicate the branch choice to teammates.
- [x] Select Supabase PostgreSQL/PostGIS and private Storage for this branch.
- [x] Select Supabase Auth and document bearer-token verification, identity mapping, refresh, and logout.
- [ ] Assign an owner to each task, including integration and verification.
- [ ] Confirm the first shared milestone and sprint completion target.

Task assignment, teammate coordination, service provisioning, and live verification remain pending. Supabase provider selection is confirmed for this branch. This plan does not authorize or claim a remote push.

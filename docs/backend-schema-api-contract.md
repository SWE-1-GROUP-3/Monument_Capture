# Monument Capture — Backend, Schema, and API Contract

Group 3 · November 17, 2026 · Step 3 implementation baseline

Status: MVP scope and contract confirmed by the user on November 17, 2026 for `feat/supabase-mvp`. Supabase PostgreSQL/PostGIS, private Storage, and Auth are selected. Step 4 now implements database migrations, JWT/account mapping, frontend authentication, and local drafts. Account provisioning, shared Supabase integration, and deployment remain pending. See [local setup](local-supabase-setup.md). Independent teammate approval is not claimed.

Read alongside [MVP decisions](mvp-decisions.md). This is the confirmed implementation contract for this Supabase branch; it does not claim that the listed APIs exist in the repository.

Sources: [Current MVP Design](https://docs.google.com/document/d/1Fl15HPBlyXUN6gXmj8ybehIFlhytORZeH_qnRWcB1TI/edit), [Current MVP Requirements](https://docs.google.com/document/d/1H2VGk9Opk9Qfs1-GMGAfWHScByrwF-YYS534Mgal1w0/edit), and subsequent November 17 confirmations.

## 1. Confirmed decisions and implementation dependencies

| Item | Contract |
| --- | --- |
| Backend | Spring Boot with Java 17; Controller → Service → Repository |
| Database | Supabase-hosted PostgreSQL with PostGIS |
| Photo storage | Supabase private Storage with backend-issued signed direct uploads |
| Authentication | Supabase Auth for pre-created email/password accounts; bearer access JWTs verified by Spring Boot |
| Roles | player and moderator; moderators cover all monuments |
| Sprint execution | Local frontend/backend, shared database and storage; public deployment deferred |
| Persisted capture lifecycle | pending → approved or rejected; final decisions immutable |
| Submission eligibility after monument edits | Preserve eligibility accepted at submission, including the original monument location and radius; approval does not recompute GPS eligibility |
| Approval eligibility | Still pending, monument currently active, no current hold, accepted evidence available; no new player GPS reading |
| Schema/API names | Plural snake_case tables; snake_case JSON; UUID identifiers; UTC timestamps |

Core modeling, migrations, service logic, authentication, and frontend integration can proceed against the confirmed contracts. Live integration still requires a Supabase project, private bucket, database identities, signing-key configuration, and pre-created accounts. See [Supabase branch decisions](supabase-branch-decisions.md).

## 2. Backend boundaries and local configuration

One backend with Authentication, Monument, Upload, Capture, Moderation, and Reporting modules. Authentication exposes a verified internal user ID to services; storage exposes upload grants, object inspection, authorized reads, and deletion. Domain services must not depend on a provider's user-object or storage-response format.

All gameplay database writes go through Spring Boot. Browser clients do not directly update captures, reviews, roles, or monuments. Use a restricted application database identity; migration/admin credentials stay separate. Private storage credentials remain on the backend.

Planned backend environment names: DATABASE_URL (JDBC PostgreSQL URL with TLS), DATABASE_USERNAME, DATABASE_PASSWORD, AUTH_PROVIDER=supabase, STORAGE_PROVIDER=supabase, SUPABASE_URL, SUPABASE_SECRET_KEY (backend only), SUPABASE_JWT_ISSUER, SUPABASE_JWT_AUDIENCE=authenticated, PHOTO_BUCKET, ALLOWED_ORIGINS. Frontend: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. These names define the implementation contract; backend connection/auth/origin and frontend auth variables are consumed; PHOTO_BUCKET and SUPABASE_SECRET_KEY remain reserved for step 5. Migration credentials use separate MIGRATION_DATABASE_URL, MIGRATION_DATABASE_USERNAME and MIGRATION_DATABASE_PASSWORD variables. No credentials are committed. Configure explicit local frontend origins and Authorization/Content-Type CORS headers; gameplay APIs use bearer tokens rather than authentication cookies.

### Supabase authentication and session contract

- The frontend uses the official Supabase client: `signInWithPassword({email,password})` for login, SDK refresh/session management, and `signOut({scope: "local"})` for logout of the current session. Login returns the provider session (access token, refresh token, expiry, user); passwords and refresh tokens never pass through gameplay APIs. There are no Spring Boot `/api/auth/login` or `/api/auth/logout` endpoints in this version.
- Every protected Spring Boot request sends `Authorization: Bearer <access_token>`. Configure an asymmetric Supabase signing key. Spring Security verifies the signature against `SUPABASE_URL/auth/v1/.well-known/jwks.json`, pins the configured issuer (`SUPABASE_URL/auth/v1`) and audience (`authenticated`), requires and validates `exp`, validates `nbf` when present, and requires a UUID `sub`. Reject invalid/missing tokens with 401; use bounded JWKS caching that permits key rotation. Never trust a decoded but unverified token.
- Map verified `sub` to `users.auth_subject_id`, then use the internal `users.id` for gameplay. Require a provisioned application user; an authenticated identity without an application mapping receives 403. Load player/moderator role from the application database on requests; the provider JWT `role=authenticated` is not the gameplay role. Never derive privileges from client-editable metadata.
- Disable public signup. Administrators pre-create Supabase Auth accounts and matching application users through trusted tooling; no plaintext passwords or credentials in migrations. Store browser sessions using the SDK storage integration and native sessions in secure platform storage; clear account state/drafts from the active UI on logout/account change. Drafts remain isolated by internal user ID.
- Logout revokes the current session refresh token and clears local tokens/account state. Report remote logout failure and clear local credentials regardless. Existing access JWTs can remain usable until expiry; configure a short access-token lifetime (target 15 minutes) and document this MVP limitation. Immediate server-side access-token revocation is outside this contract. Refresh failures require login again; never log tokens or include them in URLs.

Provider behavior references: [password login](https://supabase.com/docs/guides/auth/passwords), [JWT verification](https://supabase.com/docs/guides/auth/jwts), and [logout semantics](https://supabase.com/docs/guides/auth/signout).

Use versioned SQL migrations; select Flyway as the migration runner, with its dependency version matched to the repository's Spring Boot version during implementation. Do not use automatic ORM schema updates as the shared schema source of truth.

## 3. Schema contract

Flyway history lives in the private `flyway` schema. Four core domain tables plus one supporting upload-lifecycle table live in a dedicated `app` schema outside the exposed Supabase Data API schemas. Qualify migrations/queries consistently; SQL examples below omit schema qualification for readability. All foreign keys use restrictive deletion. Monument deactivation preserves capture/review history. All times are timestamptz; APIs serialize ISO 8601 UTC strings ending in Z. Generate UUIDs in the backend. All text lengths and finite numeric values are checked before persistence and with database constraints where applicable.

### users

| Column | Type / rule |
| --- | --- |
| id | uuid PK; internal application identity |
| auth_subject_id | uuid NOT NULL UNIQUE; verified Supabase Auth user ID (`sub`) |
| email | text NOT NULL; unique case-insensitively through a unique lower(email) index |
| display_name | varchar(100), nonblank |
| role | text CHECK IN ('player','moderator') |
| created_at | timestamptz NOT NULL, server time |

Supabase manages credentials and sessions. The unique auth_subject_id mapping is populated only by trusted provisioning. Do not add a foreign key to the provider-managed auth schema; preserve application history independently and deny login when the provider identity is disabled/deleted. JWT-only verification may continue accepting an already issued token until expiry. Never store plaintext passwords. Email is not the stable identity key. The server maps a verified authenticated identity to users.id; clients cannot choose their role or player_id.

### monuments

| Column | Type / rule |
| --- | --- |
| id | uuid PK |
| name | varchar(200), nonblank |
| description | text nullable, API maximum 5000 characters |
| neighborhood | varchar(200) nullable |
| latitude / longitude | double precision; finite; ranges −90..90 / −180..180 |
| capture_radius_m | double precision; finite and >0; default 100 |
| active | boolean NOT NULL DEFAULT true |
| created_at / updated_at | timestamptz NOT NULL; server assigned |

No coordinator assignment, holder column, or stored availability flag. The API calculates available/held/inactive from active and current reviews. Use PostGIS geography constructed as ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography for distance in meters. Latitude and longitude are the canonical stored location values; do not maintain an independently editable point column.

### photo_uploads — supporting transport records, not captures

| Column | Type / rule |
| --- | --- |
| id | uuid PK |
| player_id / monument_id | uuid NOT NULL FKs |
| object_key | text NOT NULL UNIQUE; generated by backend |
| content_type | text CHECK IN ('image/jpeg','image/png','image/webp') |
| expected_size_bytes | bigint; 1..10485760 (10 MiB) |
| created_at | timestamptz NOT NULL |
| state | text CHECK IN ('open','consumed','deleting','deleted') |
| grant_expires_at | timestamptz NOT NULL; tracks latest grant |
| cleanup_after | timestamptz NOT NULL; no earlier than grant_expires_at |

An upload record does not appear in player history or moderation and does not reserve a monument. A consumed upload belongs to exactly one capture. The draft has no submission deadline; if an unreferenced upload is cleaned, the client can upload the retained local photo again.

### captures

| Column | Type / rule |
| --- | --- |
| id | uuid PK |
| monument_id / player_id | uuid NOT NULL FKs |
| status | text CHECK IN ('pending','approved','rejected') |
| photo_upload_id | uuid NOT NULL UNIQUE FK to photo_uploads; obtains immutable object_key through this relationship |
| submitted_at | timestamptz NOT NULL; server acceptance time |
| submitted_latitude / submitted_longitude | double precision; finite; valid coordinate ranges |
| accuracy_m | double precision; finite, 0..50 |
| location_recorded_at | timestamptz NOT NULL; original device reading time |
| request_received_at | timestamptz NOT NULL; server receipt time used for freshness |
| reported_distance_m | double precision; finite and ≥0; backend calculated |
| monument_latitude_at_submission / monument_longitude_at_submission | double precision; immutable validated monument coordinates |
| capture_radius_m_at_submission | double precision; finite and >0; accepted radius snapshot |
| submission_key | uuid NOT NULL; stable per logical final submission |
| request_fingerprint | text NOT NULL; SHA-256 of normalized semantic submission fields |

The photo reference uses photo_upload_id instead of duplicating monument_photo_key in captures. JSON requests still use photo_key. Fingerprint fields: monument_id, photo_key, latitude, longitude, accuracy_m, location_recorded_at. Normalize parsed UUIDs, timestamp instants, and finite numbers before hashing; exclude receipt time. No persisted in_progress or expired state.

Store the radius and monument coordinate snapshots to make the agreed eligibility-preservation rule auditable. Later edits do not invalidate an accepted capture. At approval, do not apply the 30-second freshness test again.

### capture_reviews

| Column | Type / rule |
| --- | --- |
| id | uuid PK |
| capture_id | uuid NOT NULL UNIQUE FK |
| decision | text CHECK IN ('approved','rejected') |
| decision_source | text CHECK IN ('moderator','system') |
| moderator_id | uuid nullable FK users |
| reason | text nullable; API maximum 2000 characters |
| reviewed_at | timestamptz NOT NULL; server time after lock acquisition |
| lock_expires_at | timestamptz nullable |
| caused_by_capture_id | uuid nullable FK captures; winning capture for a system rejection |

Database CHECK rules: moderator source requires moderator_id; system source requires null moderator_id, decision rejected, nonblank reason, and caused_by_capture_id. Rejected decisions require a nonblank reason and null lock_expires_at. Approved decisions require moderator source and lock_expires_at = reviewed_at + interval '1 hour'. A system rejection cannot refer to its own capture. Service checks ensure the actor actually has moderator role and the winning capture belongs to the same monument.

Pending captures have no review; finalized captures have exactly one matching review. Service transactions enforce the cross-table lifecycle; unique capture_id prevents multiple reviews. No ordinary API edits final reviews.

### Required indexes

```sql
CREATE UNIQUE INDEX users_email_ci ON users (lower(email));
CREATE UNIQUE INDEX captures_one_pending
  ON captures (player_id, monument_id) WHERE status = 'pending';
CREATE UNIQUE INDEX captures_submission_key
  ON captures (player_id, submission_key);
CREATE INDEX captures_monument_pending
  ON captures (monument_id, submitted_at, id) WHERE status = 'pending';
CREATE INDEX captures_player_history
  ON captures (player_id, submitted_at DESC, id DESC);
CREATE INDEX captures_moderator_queue
  ON captures (status, submitted_at, id);
CREATE INDEX captures_approved_reports
  ON captures (submitted_at, monument_id) WHERE status = 'approved';
CREATE INDEX reviews_active_hold_lookup
  ON capture_reviews (lock_expires_at, capture_id) WHERE decision = 'approved';
CREATE INDEX uploads_cleanup
  ON photo_uploads (state, cleanup_after);
```

Hold lookup joins reviews → captures filtered by monument_id. The shared monument lock enforces one active hold; do not use a time-dependent partial unique index.

## 4. GPS, time, and photo defaults

At backend receipt, save request_received_at. Require location_recorded_at between receipt minus 30 seconds and receipt plus 5 seconds, inclusive. The 5-second future tolerance is an implementation default for small device-clock differences; reject anything later with location_timestamp_future. Do not shift device timestamps silently. This check uses receipt time, not time waiting for locks.

Under the monument lock, compute ST_Distance on geography values and accept distance ≤ current capture_radius_m. Save the current monument location/radius snapshots. Reported GPS accuracy must be 0..50 meters; accuracy is not added to the capture radius.

Use actual current server time after lock acquisition for holds; PostgreSQL clock_timestamp() avoids a transaction-start time frozen before a lock wait. Capture the chosen approval time once and derive expiry from it. All competitor reviews may share that decision time.

Files: JPEG/PNG/WebP, 1..10485760 bytes. Generate keys such as players/{player_id}/monuments/{monument_id}/{upload_id}; never accept arbitrary remote URLs or user-selected storage paths. Before accepting a capture, inspect object existence, ownership binding, actual size, and file signature/decodability; do not trust MIME labels alone. Uploaded objects must be immutable once accepted. Provider integration must prevent overwrite/reuse; a new photo gets a new upload ID/key.

## 5. Common API conventions

Base path /api. All gameplay routes require authentication; the existing `/api/health` readiness endpoint remains public. Login/refresh/logout go directly to Supabase Auth. IDs are UUID strings; timestamps are ISO 8601 UTC. Backend identity supplies player/moderator IDs. Lists return {items, next_cursor, server_now}. Default limit 20, maximum 100; opaque cursors encode stable sort fields and are validated. UUID is the tie-breaker.

Errors use {error:{code,message,details},server_now}. No sensitive stack traces. details may contain safe current status, current review, or retry guidance, but not other players' private capture evidence. 400 invalid input; 401 unauthenticated; 403 forbidden role; 404 inaccessible/missing resource; 409 state conflict; 413 oversized photo; 415 unsupported type; 422 invalid location; 503 temporary storage/database failure.

GET responses include server_now for authoritative countdown display. Holder summaries contain only user_id and display_name, never email. Photo access is short-lived and authorized for the capture owner or moderator.

## 6. Endpoint contract

| Method and route | Access | Request / result |
| --- | --- | --- |
| GET /api/me | Either role | {id,display_name,email,role,server_now} |
| Supabase Auth SDK (outside /api) | Pre-created accounts | Email/password login, session refresh, and current-session logout as defined above; no Spring Boot auth proxy routes |
| GET /api/monuments | Either role | Optional include_inactive=true only for moderators; items contain monument fields and availability/holder/lock_expires_at; name ASC, id ASC pagination |
| GET /api/monuments/{id} | Either role | Same monument DTO; players receive 404 for inactive monuments |
| GET /api/me/holdings | Player | Unexpired approved holdings, including active flag if monument later deactivated; expiry ASC, id ASC |
| POST /api/uploads/monument-photo | Player | {monument_id,content_type,size_bytes}; 201 {upload_id,photo_key,upload_url,method,headers,expires_at,server_now} |
| POST /api/captures | Player | Final submission below; 201 new accepted capture, 200 identical accepted retry |
| GET /api/me/captures | Player | Optional status; submitted_at DESC, id DESC; monument summary, status, review, and reason |
| GET /api/me/captures/{id} | Owning player | Capture detail, immutable location snapshot, authorized photo URL and expiry, review; 404 for another player's record |
| GET /api/moderator/captures | Moderator | Optional status, default pending; submitted_at ASC, id ASC; evidence details, monument active flag, review if finalized |
| POST /api/moderator/captures/{id}/decision | Moderator | {decision,reason}; 200 stored outcome; rejection reason required |
| POST /api/moderator/monuments | Moderator | Monument editable fields; 201 monument DTO |
| PATCH /api/moderator/monuments/{id} | Moderator | Supplied editable fields only; 200 updated DTO; no hard delete endpoint |
| GET /api/moderator/visits | Moderator | Optional start_date/end_date in YYYY-MM-DD; 200 {items:[{monument_id,name,approved_capture_count}],start_date,end_date,timezone,server_now} |

Player map lists exclude inactive monuments; personal history still supplies their monument summary. An existing hold continues until its original expiry after deactivation, but the monument remains unavailable while inactive. A player's own expired hold disappears from holdings without changing capture status.

Monument DTO: {id,name,description,neighborhood,latitude,longitude,capture_radius_m,active,availability,holder,lock_expires_at,created_at,updated_at}. availability is inactive if inactive, otherwise held if an unexpired hold exists, otherwise available. holder and lock_expires_at are null when no active hold exists.

Review DTO: {id,decision,decision_source,moderator_id,reason,reviewed_at,lock_expires_at,caused_by_capture_id}. Pending review is null. Player responses need not expose moderator email or internal audit metadata beyond these authorized fields.

Supabase signed upload grants currently last two hours; return that actual provider expiry in expires_at and persist it as grant_expires_at, rather than claiming a ten-minute lifetime. See [signed upload URLs](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl). Return actual required HTTP method/headers; the frontend must not assume all providers use the same upload protocol. A new grant is not a capture or reservation. An expired transport grant can be replaced by requesting a new upload while retaining the draft.

Monument creation requires name, latitude, longitude; radius defaults to 100 and active defaults to true. Reject unknown/write-protected fields. PATCH null is permitted only for description/neighborhood, not required fields. Moderator listings use include_inactive=true to manage the complete catalog.

Visits include every monument, including inactive and zero-count monuments; sorted by name then ID. Both omitted dates mean all time; one omitted bound means unbounded on that side. Inclusive selected dates map to [start-of-start-date, start-of-day-after-end-date) in America/New_York, converted to UTC. Count approved captures by submitted_at, including repeats. Payload contains no player identifiers or evidence. This aggregate is unpaginated for the MVP monument catalog.

### Submission example

```json
{
  "monument_id": "11111111-1111-4111-8111-111111111111",
  "photo_key": "players/.../monuments/.../upload-id",
  "latitude": 40.7308,
  "longitude": -73.9973,
  "accuracy_m": 12,
  "location_recorded_at": "2026-11-17T22:00:00Z",
  "submission_key": "22222222-2222-4222-8222-222222222222"
}
```

Success: {id,monument_id,status,submitted_at,review,server_now}. A new submission has pending status and null review. An identical retry returns the current record, which may now be approved/rejected.

Generate submission_key once when sending a logical final submission. After an uncertain network outcome, retry exactly the same payload/key. Check existing successful idempotency results before freshness/availability/photo validation, so time passing cannot invalidate retrieval. A changed payload with an accepted key returns 409 idempotency_key_reused. After an explicit refusal with no accepted record, a fresh GPS reading is a new logical request with a new key. Concurrent equal-key requests must return one accepted record; use the database unique constraint and retrieve/recompare after a conflict.

### Important error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 409 | monument_held | An unexpired hold blocks submission/approval |
| 409 | monument_inactive | Submission/approval blocked; existing pending record remains pending |
| 409 | pending_capture_exists | Same player already has a pending capture for this monument |
| 409 | idempotency_key_reused | Accepted key reused with different semantic payload |
| 409 | capture_already_finalized | Contradictory or another actor's stale decision |
| 409 | competing_capture_approved | Capture was system-rejected because another approval won; include stored rejected outcome |
| 409 | photo_not_ready | Upload missing, incomplete, deleting, deleted, or already consumed |
| 422 | location_stale / location_timestamp_future | Reading outside accepted receipt-time window |
| 422 | location_inaccurate / location_out_of_range | Accuracy exceeds 50m or computed distance exceeds radius |
| 400 | invalid_input / rejection_reason_required | Invalid fields or empty manual rejection reason |
| 413 / 415 | photo_too_large / unsupported_photo_type | Photo violates the file contract |

## 7. Transaction order and retries

Use READ COMMITTED and a consistent lock order: Monument first, then upload/capture rows as needed. Current-state reads occur after obtaining the monument lock. Keep external photo inspection outside long-running monument transactions; accepted objects must not be mutable. Within the transaction recheck the upload lifecycle state and object binding before consuming it.

Submission: authenticate → parse/fingerprint → return existing accepted identical retry if present → validate GPS against receipt time and inspect photo → begin transaction → lock Monument → recheck idempotency → recheck active/current hold → compute distance against current monument coordinates/radius → check duplicate pending → lock and validate open upload → insert capture with snapshot → mark upload consumed → commit. Nothing failed creates a Capture.

Approval: authenticate moderator → resolve immutable monument ID → begin → lock Monument → reread Capture → handle finalized/stale request → verify active/unheld and evidence → capture actual server decision time → approve chosen capture + insert manual review/one-hour expiry → reject every other pending capture for monument + insert system reviews linked to winner → commit atomically. Accepted location eligibility remains unchanged after monument edits.

Manual rejection: same Monument-first lock order → reread pending state → reject with nonblank reason and manual review. Inactive monuments may be rejected. Do not overwrite an existing final outcome.

Decision retries: if the same moderator repeats the same decision/reason that already succeeded, return that stored result with no new review/expiry. Another moderator or a contradictory payload receives 409 and the actual current outcome. Automatic competitor rejection always takes precedence over a stale approval retry.

Submission competing with approval: if submission commits first, it participates in the pending set; if approval commits first, submission sees the hold and fails. Deactivation/location/radius edits also acquire the Monument row lock.

Bound transient deadlock/serialization retries to two additional attempts with small randomized delay. Preserve original receipt time and idempotency semantics. Do not retry ordinary validation/state conflicts automatically. Exhaustion returns 503 with actionable retry guidance.

## 8. Abandoned-upload cleanup

Set cleanup_after to at least 24 hours after grant creation and later than its actual expiry. Run a local backend scheduled task hourly while running; no public deployment is required. Lock eligible open upload rows, recheck that no capture references them, and mark deleting in a short transaction. Submission locks the same upload row and refuses deleting/deleted uploads. Delete the private object outside the transaction, then mark deleted; retain failed deleting rows for retry. Consumed uploads are never cleanup candidates.

This lock/state transition prevents cleanup racing an accepted submission. A draft older than the upload retention period can request a new upload; no capture submission deadline is introduced. If the backend is stopped, cleanup resumes when it runs again.

## 9. Migration and implementation sequence

1. Admin bootstrap: enable PostGIS and create app/flyway schemas with separate roles. V1: create users and monuments with checks.
2. V2: photo_uploads, captures, capture_reviews, foreign keys, lifecycle checks, and indexes. DDL migration must be validated on a disposable PostgreSQL/PostGIS database before shared application.
3. V3: seed prototype monuments using stable UUIDs. Obtain actual repository coordinates during implementation rather than inventing values. Pre-create player/moderator accounts with selected auth tooling; no passwords in migrations.
4. Include the unique users.auth_subject_id mapping in V1. Provision Supabase Auth identities and matching application users through trusted tooling after schema creation; no backend password/session tables. Configure database/storage connections and signing keys for the selected Supabase project.
5. Implement services and endpoints against this contract; frontend can use matching mock responses while dependencies are connected.

Required verification: one pending capture under concurrent duplicates; safe lost-response retry even after location ages/hold changes; two moderators yield one winner and complete system rejections; submit-vs-approve race; location/radius edit preserves accepted eligibility; inactive approval refusal; hold expiry preserves visits; storage cleanup cannot delete accepted evidence; owner/role access; New York date boundaries.

## 10. Completion checklist for step 3

- [x] Backend language/framework and module boundaries specified.
- [x] Core schema, upload support, indexes, snapshot behavior and migration sequence specified.
- [x] Gameplay routes, payload conventions, permissions, pagination and errors specified.
- [x] GPS future handling, freshness timing, idempotency and cleanup defaults specified.
- [x] Location eligibility preserved after submission; current active/hold checks retained at approval.
- [x] User selects Supabase PostgreSQL/PostGIS and private Storage for this branch.
- [x] User selects Supabase Auth; bearer-token transport, SDK login/refresh/logout, identity mapping, and logout limitations specified.
- [x] Validate V1–V3 migrations and constraints on disposable PostgreSQL/PostGIS during step 4.
- [ ] Verify real Supabase accounts and Storage adapters against the shared project; local tests do not establish this.

## Technical references

- [PostgreSQL date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html): actual clock time versus transaction-start timestamps.
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html) and [ST_Distance](https://postgis.net/docs/ST_Distance.html): geography distance units and radius comparisons.


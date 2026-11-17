CREATE TABLE app.photo_uploads (
    id uuid PRIMARY KEY,
    player_id uuid NOT NULL REFERENCES app.users(id),
    monument_id uuid NOT NULL REFERENCES app.monuments(id),
    object_key text NOT NULL UNIQUE CHECK (length(btrim(object_key)) > 0),
    content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
    expected_size_bytes bigint NOT NULL CHECK (expected_size_bytes BETWEEN 1 AND 10485760),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','consumed','deleting','deleted')),
    grant_expires_at timestamptz NOT NULL,
    cleanup_after timestamptz NOT NULL,
    CHECK (grant_expires_at > created_at AND cleanup_after >= grant_expires_at),
    UNIQUE (id, player_id, monument_id)
);

CREATE TABLE app.captures (
    id uuid PRIMARY KEY,
    monument_id uuid NOT NULL REFERENCES app.monuments(id),
    player_id uuid NOT NULL REFERENCES app.users(id),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    photo_upload_id uuid NOT NULL UNIQUE,
    submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    submitted_latitude double precision NOT NULL CHECK (submitted_latitude BETWEEN -90 AND 90),
    submitted_longitude double precision NOT NULL CHECK (submitted_longitude BETWEEN -180 AND 180),
    accuracy_m double precision NOT NULL CHECK (accuracy_m BETWEEN 0 AND 50),
    location_recorded_at timestamptz NOT NULL,
    request_received_at timestamptz NOT NULL,
    reported_distance_m double precision NOT NULL
        CHECK (reported_distance_m >= 0 AND reported_distance_m < 'Infinity'::float8),
    monument_latitude_at_submission double precision NOT NULL
        CHECK (monument_latitude_at_submission BETWEEN -90 AND 90),
    monument_longitude_at_submission double precision NOT NULL
        CHECK (monument_longitude_at_submission BETWEEN -180 AND 180),
    capture_radius_m_at_submission double precision NOT NULL
        CHECK (capture_radius_m_at_submission > 0 AND capture_radius_m_at_submission < 'Infinity'::float8),
    submission_key uuid NOT NULL,
    request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
    FOREIGN KEY (photo_upload_id, player_id, monument_id)
        REFERENCES app.photo_uploads(id, player_id, monument_id),
    CHECK (location_recorded_at BETWEEN request_received_at - interval '30 seconds'
        AND request_received_at + interval '5 seconds'),
    CHECK (reported_distance_m <= capture_radius_m_at_submission)
);
CREATE UNIQUE INDEX captures_one_pending ON app.captures (player_id, monument_id) WHERE status = 'pending';
CREATE UNIQUE INDEX captures_submission_key ON app.captures (player_id, submission_key);
CREATE INDEX captures_monument_pending ON app.captures (monument_id, submitted_at, id) WHERE status = 'pending';
CREATE INDEX captures_player_history ON app.captures (player_id, submitted_at DESC, id DESC);
CREATE INDEX captures_moderator_queue ON app.captures (status, submitted_at, id);
CREATE INDEX captures_approved_reports ON app.captures (submitted_at, monument_id) WHERE status = 'approved';

CREATE TABLE app.capture_reviews (
    id uuid PRIMARY KEY,
    capture_id uuid NOT NULL UNIQUE REFERENCES app.captures(id),
    decision text NOT NULL CHECK (decision IN ('approved','rejected')),
    decision_source text NOT NULL CHECK (decision_source IN ('moderator','system')),
    moderator_id uuid REFERENCES app.users(id),
    reason text CHECK (length(reason) <= 2000),
    reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    lock_expires_at timestamptz,
    caused_by_capture_id uuid REFERENCES app.captures(id),
    CHECK ((decision_source = 'moderator' AND moderator_id IS NOT NULL AND caused_by_capture_id IS NULL)
        OR (decision_source = 'system' AND moderator_id IS NULL AND decision = 'rejected'
            AND caused_by_capture_id IS NOT NULL)),
    CHECK ((decision = 'rejected' AND reason IS NOT NULL AND length(btrim(reason)) > 0 AND lock_expires_at IS NULL)
        OR (decision = 'approved' AND decision_source = 'moderator' AND lock_expires_at IS NOT NULL
            AND lock_expires_at = reviewed_at + interval '1 hour')),
    CHECK (caused_by_capture_id IS NULL OR caused_by_capture_id <> capture_id)
);
CREATE INDEX reviews_active_hold_lookup ON app.capture_reviews (lock_expires_at, capture_id) WHERE decision = 'approved';
CREATE INDEX uploads_cleanup ON app.photo_uploads (state, cleanup_after);

-- Cross-table lifecycle, actor role and same-monument winner checks belong to
-- the step-5 service transactions, always locking the Monument row first.

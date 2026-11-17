-- PostGIS is enabled by the database administrator before Flyway runs.
REVOKE ALL ON SCHEMA app FROM PUBLIC;

CREATE TABLE app.users (
    id uuid PRIMARY KEY,
    auth_subject_id uuid NOT NULL UNIQUE,
    email text NOT NULL CHECK (length(btrim(email)) > 0),
    display_name varchar(100) NOT NULL CHECK (length(btrim(display_name)) > 0),
    role text NOT NULL CHECK (role IN ('player', 'moderator')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX users_email_ci ON app.users (lower(email));

CREATE TABLE app.monuments (
    id uuid PRIMARY KEY,
    name varchar(200) NOT NULL CHECK (length(btrim(name)) > 0),
    description text CHECK (length(description) <= 5000),
    neighborhood varchar(200),
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    capture_radius_m double precision NOT NULL DEFAULT 100
        CHECK (capture_radius_m > 0 AND capture_radius_m < 'Infinity'::float8),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

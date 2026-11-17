-- First create the pre-confirmed user through Supabase Auth admin tooling.
-- Run with the migration/admin identity; never accept a role from a client.
-- Required psql variables: auth_subject_id, email, display_name, role.
-- gen_random_uuid is built into PostgreSQL 17.
INSERT INTO app.users (id, auth_subject_id, email, display_name, role)
VALUES (gen_random_uuid(), :'auth_subject_id'::uuid, lower(btrim(:'email')), :'display_name', :'role')
RETURNING id, display_name, email, role;

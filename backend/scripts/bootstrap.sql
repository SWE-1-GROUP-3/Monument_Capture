-- Run once as an administrator, after creating the login roles securely.
-- Required psql variables: migration_role and application_role.
-- Supabase: create roles through a trusted admin connection; never expose the
-- app schema in Data API settings. No passwords belong in this file.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION :"migration_role";
CREATE SCHEMA IF NOT EXISTS flyway AUTHORIZATION :"migration_role";
REVOKE ALL ON SCHEMA flyway FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO :"application_role";
REVOKE ALL ON SCHEMA app FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"application_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO :"application_role";
-- Supabase installs PostGIS in extensions; local PostgreSQL may use public.
-- Grant access to the actual extension schema without exposing gameplay tables.
SELECT format('GRANT USAGE ON SCHEMA %I TO %I, %I', n.nspname, :'migration_role', :'application_role')
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'postgis'
\gexec

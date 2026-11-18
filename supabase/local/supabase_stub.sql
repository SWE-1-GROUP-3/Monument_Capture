-- LOCAL TESTING ONLY. Never run this against the hosted Supabase project.
--
-- A minimal stand-in for the parts of a Supabase database that our
-- migrations depend on, so they can be tested on plain Postgres:
--   * the anon / authenticated / service_role roles
--   * the extensions schema
--   * auth.users and auth.uid() (reads the JWT claims the same way Supabase does)
--
-- The pgTAP tests in supabase/tests/database/ do not depend on anything in
-- this file beyond what real Supabase also has, so they run unchanged with
-- `supabase test db` against a local Supabase stack.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- Mirrors Supabase's default search_path for the postgres role.
alter database monument_test set search_path = "$user", public, extensions;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Simulates a project created with "Automatically expose new tables and
-- functions" ticked (our hosted project): new objects in public are granted to
-- the API roles by default. The migrations must neutralise this.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Minimal stand-in for Supabase Storage's tables. Policies on storage.objects
-- decide who may upload/read, exactly as on the hosted project.
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

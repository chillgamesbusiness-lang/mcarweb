-- Fix: PostgREST (authenticator role) was querying pg_timezone_names on every
-- request because no timezone was set at the role level. This caused a 576ms
-- mean query that accounted for 43% of all DB execution time with 0% cache
-- hit rate (pure disk I/O every time).
--
-- Setting timezone = 'UTC' on the authenticator role eliminates the lookup.
-- PostgREST will inherit UTC directly from the role without probing the
-- pg_timezone_names catalog view.
--
-- Run this once in the Supabase SQL editor (Database → SQL Editor).

ALTER ROLE authenticator SET timezone = 'UTC';

-- Also set on the anon and authenticated roles in case they are used in
-- direct queries or future PostgREST versions resolve timezone per-role.
ALTER ROLE anon          SET timezone = 'UTC';
ALTER ROLE authenticated SET timezone = 'UTC';

-- Set at the database level as the authoritative default for any role that
-- doesn't have an explicit override.
ALTER DATABASE postgres  SET timezone = 'UTC';

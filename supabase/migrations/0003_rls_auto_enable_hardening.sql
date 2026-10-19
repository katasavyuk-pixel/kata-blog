-- Migration: bring `rls_auto_enable` under version control and lock it down.
--
-- The function and its `ensure_rls` event trigger already existed in the
-- production database but were never in a migration: they were applied by hand,
-- so the repo and the database had drifted. Recording them here is the point of
-- this file — the SQL is written to be idempotent so it is a no-op on a database
-- that already has them, and creates them on one that doesn't.
--
-- The actual fix: Supabase grants EXECUTE on new functions to `anon` and
-- `authenticated` by default, so `rls_auto_enable` was reachable at
-- /rest/v1/rpc/rls_auto_enable as a SECURITY DEFINER function. Postgres refuses
-- to run an event-trigger function through a normal call, so this was not
-- exploitable in practice — but it is free attack surface on a definer function,
-- and the security advisor flags it. 0001 already did exactly this revoke for
-- `increment_download_count`; this one was missed only because it never went
-- through a migration.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- Revoke from PUBLIC *and* anon/authenticated: revoking only from PUBLIC leaves
-- the roles Supabase granted directly still able to call it.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- The event trigger that makes the function do anything. Creating one requires
-- superuser, so guard it: on Supabase this runs as `postgres`, and on a database
-- where it already exists this is skipped rather than failing.
do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls
      on ddl_command_end
      execute function public.rls_auto_enable();
  end if;
end
$$;

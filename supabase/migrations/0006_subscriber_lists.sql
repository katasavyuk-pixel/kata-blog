-- Migration 0006: separate subscriber lists (NBI vs personal blog vs club).
--
-- APPLY THIS FILE ALONE, in the Supabase SQL editor, and only after Kata says so.
-- Do NOT run `supabase db push` for 0001–0005 against production. Those changes
-- may already be live without rows in supabase_migrations.schema_migrations,
-- and pushing them again is not part of this change.
--
-- Live `public.subscribers` has a unique index on email and no `list` column.
-- Existing rows are the NBI list. `bitacora` is an application alias of
-- `kataivanovych` and is not a stored value.

alter table public.subscribers
  add column if not exists list text not null default 'nbi';

alter table public.subscribers
  drop constraint if exists subscribers_list_check;

alter table public.subscribers
  add constraint subscribers_list_check
  check (list in ('nbi', 'kataivanovych', 'club'));

-- ADD COLUMN ... DEFAULT already fills existing rows on PostgreSQL 11+.
-- Only NULLs are touched, so applying this file twice cannot move a personal
-- signup back onto the NBI list.
update public.subscribers
  set list = 'nbi'
  where list is null;

alter table public.subscribers
  add column if not exists consent_at timestamptz;

update public.subscribers
  set consent_at = created_at
  where consent_at is null;

-- Replace unique(email) with unique(email, list). The live name may be a
-- constraint or a bare unique index; drop whichever is exactly on `email`.
do $$
declare
  restriccion text;
  indice text;
begin
  for restriccion in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'subscribers'
      and c.contype = 'u'
      and (
        select array_agg(a.attname::text order by u.ord)
        from unnest(c.conkey) with ordinality as u(attnum, ord)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = u.attnum
      ) = array['email']::text[]
  loop
    execute format('alter table public.subscribers drop constraint %I', restriccion);
  end loop;

  for indice in
    select ic.relname
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_class tc on tc.oid = i.indrelid
    join pg_namespace n on n.oid = tc.relnamespace
    where n.nspname = 'public'
      and tc.relname = 'subscribers'
      and i.indisunique
      and not i.indisprimary
      and i.indnkeyatts = 1
      and (
        select a.attname
        from pg_attribute a
        where a.attrelid = tc.oid
          and a.attnum = (i.indkey::smallint[])[1]
      ) = 'email'
  loop
    execute format('drop index if exists public.%I', indice);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscribers_email_list_key'
      and conrelid = 'public.subscribers'::regclass
  ) then
    alter table public.subscribers
      add constraint subscribers_email_list_key unique (email, list);
  end if;
end $$;

create index if not exists subscribers_list_status_idx
  on public.subscribers (list, status);

-- Migration: subscribers (newsletter, double opt-in) + resources (lead magnets)
-- Apply with: supabase db push  (or Supabase MCP apply_migration). Region: eu-central-1.

create extension if not exists citext;

-- ============================================================
-- subscribers — newsletter list with GDPR double opt-in state
-- ============================================================
create table if not exists public.subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null unique,
  status             text not null default 'pending'
                       check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token_hash text,          -- sha256(token) ONLY; raw token travels in the email
  confirm_expires_at timestamptz,
  confirmed_at       timestamptz,
  unsubscribe_token  text unique,
  unsubscribed_at    timestamptz,
  consent_ip         inet,          -- proof of consent
  source             text,          -- e.g. 'footer', 'recursos', 'lead_magnet:guia-rag'
  locale             text not null default 'es',
  created_at         timestamptz not null default now()
);

alter table public.subscribers enable row level security;
-- No anon/authenticated policies → default deny. All access goes through server
-- Route Handlers using the service_role key. The confirm token is never stored
-- in plaintext and is never client-readable.

create index if not exists subscribers_confirm_token_hash_idx
  on public.subscribers (confirm_token_hash);

-- ============================================================
-- resources — free downloads / lead magnets
-- ============================================================
create table if not exists public.resources (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  file_path      text not null,             -- path inside the private 'lead-magnets' bucket
  requires_email boolean not null default true,
  download_count integer not null default 0,
  published      boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.resources enable row level security;

drop policy if exists "public read published resources" on public.resources;
create policy "public read published resources"
  on public.resources for select
  to anon, authenticated
  using (published = true);

-- download_count increment via SECURITY DEFINER RPC (no direct anon UPDATE).
create or replace function public.increment_download_count(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.resources set download_count = download_count + 1 where id = p_id;
$$;

-- Revoke from PUBLIC *and* anon/authenticated: Supabase grants EXECUTE to those
-- roles by default, so revoking only from PUBLIC leaves them able to call it.
revoke execute on function public.increment_download_count(uuid) from public, anon, authenticated;
grant  execute on function public.increment_download_count(uuid) to service_role;

-- ============================================================
-- Storage: private bucket for lead magnets (served via signed URLs)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('lead-magnets', 'lead-magnets', false)
on conflict (id) do nothing;
-- No storage.objects policies for anon → bucket stays private. Downloads are
-- generated server-side with the service_role key via createSignedUrl().

-- Migration: scheduled_emails — welcome-sequence emails scheduled in Resend.
-- The blog's Supabase project has no MCP/CLI link from this machine: apply by
-- pasting this file in the SQL editor (project udluclqhfzdgvqpoezoo).
-- The app degrades gracefully while the table doesn't exist (sequence is skipped).

create table if not exists public.scheduled_emails (
  id              uuid primary key default gen_random_uuid(),
  subscriber_id   uuid not null references public.subscribers(id) on delete cascade,
  email_key       text not null,      -- e.g. 'd2-curso', 'd5-historia', 'd8-nbi'
  resend_email_id text,               -- Resend email id, used to cancel on unsubscribe
  scheduled_at    timestamptz not null,
  created_at      timestamptz not null default now(),
  unique (subscriber_id, email_key)   -- one shot per step per consent cycle
);

alter table public.scheduled_emails enable row level security;
-- No anon/authenticated policies → default deny. Only server Route Handlers
-- (service_role) read/write; rows are deleted when the subscriber unsubscribes.

create index if not exists scheduled_emails_subscriber_id_idx
  on public.scheduled_emails (subscriber_id);

-- Migration: lead magnet capture — what a reader produced, and where they signed up.
-- The blog's Supabase project has no MCP/CLI link from this machine: apply by
-- pasting this file in the SQL editor (project udluclqhfzdgvqpoezoo).
-- Apply AFTER 0004_newsletter_issues.sql.
-- The app degrades gracefully while the table doesn't exist (captures are skipped,
-- the double opt-in still works).

-- Which page the signup happened on: "/recursos", "/blog/que-es-rag".
-- Orthogonal to `source`, which is the semantic bucket ("footer",
-- "lead_magnet:x", plus an optional ":<utm_source>" suffix). Answering "which
-- article captures" needs the literal route, and `source` cannot carry it
-- without becoming a second, ambiguous taxonomy.
alter table public.subscribers add column if not exists signup_path text;

create index if not exists subscribers_signup_path_idx
  on public.subscribers (signup_path);
create index if not exists subscribers_created_at_idx
  on public.subscribers (created_at desc);

create table if not exists public.lead_magnet_submissions (
  id          uuid primary key default gen_random_uuid(),
  -- No FK to subscribers: the submission is written first, so the row exists
  -- before the subscriber does. See the RGPD note below.
  email       citext not null,
  magnet_slug text not null,                     -- e.g. 'calculadora-coste-ia'
  payload     jsonb not null default '{}'::jsonb, -- recomputed server-side, never as sent
  source_path text,
  created_at  timestamptz not null default now()
);

alter table public.lead_magnet_submissions enable row level security;
-- No anon/authenticated policies → default deny. Only server Route Handlers
-- (service_role). The 0003 event trigger would enable RLS anyway; stating it
-- keeps the migration readable without knowing the trigger exists.

-- The confirm-time lookup: latest submission for one address.
create index if not exists lead_magnet_submissions_email_created_idx
  on public.lead_magnet_submissions (email, created_at desc);
-- The funnel panel: captures per magnet over time.
create index if not exists lead_magnet_submissions_magnet_created_idx
  on public.lead_magnet_submissions (magnet_slug, created_at desc);

-- RGPD — erasure. This table is keyed by email, so it is personal data, and the
-- missing FK means deleting a subscriber does NOT cascade here. A right-to-be-
-- forgotten request must run both:
--   delete from public.lead_magnet_submissions where email = $1;
--   delete from public.subscribers where email = $1;

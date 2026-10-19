-- Newsletter broadcast log.
--
-- The site could capture subscribers and run the welcome sequence, but had no
-- way to send an actual issue: src/emails/newsletter.tsx existed only as the
-- shell the welcome sequence borrowed. This table is what makes the broadcast
-- idempotent — without it "already sent?" is unanswerable and a retry after a
-- partial failure would mail the list twice.
--
-- Apply in the SQL editor of the blog's Supabase project (kata-ivanovych-blog,
-- ref udluclqhfzdgvqpoezoo). That account has no CLI/MCP access from the dev
-- machine, same as 0001-0003.

create table if not exists public.newsletter_issues (
  -- Matches the `issue` field in content/newsletters/*.md. Unique, so a second
  -- send of the same issue fails on the insert rather than on a code check.
  issue_id text primary key,
  subject text not null,
  -- Recipients at send time. Kept for the record; not PII.
  recipient_count integer not null default 0,
  failed_count integer not null default 0,
  sent_at timestamptz not null default now()
);

alter table public.newsletter_issues enable row level security;

-- No policies at all: reads and writes go through service_role only, same
-- default-deny posture as subscribers and scheduled_emails.

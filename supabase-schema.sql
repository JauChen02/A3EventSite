-- Safety Culture Reflection Assistant
-- Supabase SQL schema for the MVP.
--
-- Paste this file into the Supabase SQL Editor and run it once for the project.
-- API route inserts, updates, and deletes should use SUPABASE_SERVICE_ROLE_KEY
-- on the server only. Frontend code should use the anon key for visible reads.

create extension if not exists "pgcrypto";

create table if not exists public.safety_responses (
  id uuid primary key default gen_random_uuid(),
  session_code text not null,
  original_observation text,
  sanitised_summary text not null,
  indicator text not null check (indicator in ('positive', 'negative', 'mixed')),
  safety_culture_action text not null,
  reason text not null,
  proposed_action_needed boolean not null default false,
  proposed_action text not null,
  discussion_question text not null,
  privacy_reminder text not null,
  themes text[] default '{}'::text[],
  is_visible boolean not null default true,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists safety_responses_session_code_idx
  on public.safety_responses (session_code);

create index if not exists safety_responses_created_at_idx
  on public.safety_responses (created_at);

create index if not exists safety_responses_indicator_idx
  on public.safety_responses (indicator);

create index if not exists safety_responses_is_visible_idx
  on public.safety_responses (is_visible);

create index if not exists safety_responses_is_pinned_idx
  on public.safety_responses (is_pinned);

alter table public.safety_responses enable row level security;

-- MVP access model:
-- Public clients can read only visible responses.
-- Public clients cannot insert, update, or delete directly.
-- Server API routes use the service role key, which bypasses RLS.
revoke all on table public.safety_responses from anon;
revoke all on table public.safety_responses from authenticated;

grant select on table public.safety_responses to anon;
grant select on table public.safety_responses to authenticated;
grant all on table public.safety_responses to service_role;

drop policy if exists "Visible safety responses are publicly readable"
  on public.safety_responses;

create policy "Visible safety responses are publicly readable"
  on public.safety_responses
  for select
  to anon, authenticated
  using (is_visible = true);

-- Realtime setup
--
-- Option 1: SQL Editor
-- Run this after creating the table to publish row changes through Supabase
-- Realtime. This enables Realtime at the database publication level.
alter table public.safety_responses replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'safety_responses'
  ) then
    alter publication supabase_realtime add table public.safety_responses;
  end if;
end $$;

-- Option 2: Supabase Dashboard
-- 1. Open Project Settings.
-- 2. Go to API or Realtime settings, depending on the current Supabase UI.
-- 3. Find the Realtime table configuration.
-- 4. Enable Realtime for public.safety_responses.
--
-- Note: Realtime clients using the anon key will still only be able to read
-- rows permitted by RLS, which means visible responses only.

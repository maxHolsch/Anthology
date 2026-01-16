-- ============================================
-- Migration: Add sensemaking job tracking
-- Date: 2025-12-15
--
-- Purpose:
--   Track async “Run sensemaking” jobs started from the creator UI.
--   The UI polls job progress; serverless handlers write updates using the service key.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================

begin;

-- Ensure UUID generator exists (some Supabase projects use pgcrypto instead)
-- This project’s schema uses uuid_generate_v4(), so we enable uuid-ossp.
create extension if not exists "uuid-ossp";

-- Ensure the shared updated_at trigger helper exists.
-- (If you already ran the base schema/migrations, this is a no-op.)
create or replace function anthology_update_updated_at_column()
returns trigger as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$ language plpgsql;

create table if not exists anthology_sensemaking_jobs (
  id uuid primary key default uuid_generate_v4(),

  -- The anthology being built by this job
  anthology_id uuid not null references anthology_anthologies(id) on delete cascade,

  -- Snapshot of creator inputs
  anthology_slug text not null,
  anthology_title text not null,
  template_questions text[] not null default '{}',
  include_previous_uploads boolean not null default false,

  -- Storage object paths to process (bucket is assumed Conversations)
  file_paths text[] not null default '{}',

  -- State machine
  status text not null default 'queued',
  error text,

  -- Progress payload (JSON so we can evolve without migrations)
  -- Suggested shape:
  -- {
  --   "overall": {"done": 0, "total": 3},
  --   "files": {
  --     "upload_conversations/slug/file.mp3": {
  --       "step": "transcribing"|"speaker_naming"|...,
  --       "assembly_id": "...",
  --       "message": "...",
  --       "updated_at": "..."
  --     }
  --   }
  -- }
  progress jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
drop trigger if exists update_anthology_sensemaking_jobs_updated_at on anthology_sensemaking_jobs;
create trigger update_anthology_sensemaking_jobs_updated_at
before update on anthology_sensemaking_jobs
for each row execute function anthology_update_updated_at_column();

-- Indexes
create index if not exists idx_anthology_sensemaking_jobs_anthology_id
  on anthology_sensemaking_jobs(anthology_id);

create index if not exists idx_anthology_sensemaking_jobs_status
  on anthology_sensemaking_jobs(status);

-- RLS: allow public read so the creator UI can poll progress with anon key.
alter table anthology_sensemaking_jobs enable row level security;

drop policy if exists "Public read access" on anthology_sensemaking_jobs;
create policy "Public read access"
on anthology_sensemaking_jobs
for select
to public
using (true);

commit;

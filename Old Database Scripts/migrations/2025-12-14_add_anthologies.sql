-- ============================================
-- Migration: Add first-class Anthologies
-- Date: 2025-12-14
--
-- Goal
--   Separate all data by “anthology” (a collection of conversations).
--   This enables multiple independent datasets in the same Supabase project.
--
-- IMPORTANT
--   Run in Supabase Dashboard -> SQL Editor.
--   Recommended: run in a transaction.
-- ============================================

begin;

-- 1) New top-level table
create table if not exists anthology_anthologies (
  id uuid primary key default uuid_generate_v4(),
  slug text not null,
  title text not null,
  description text,
  is_public boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anthology_anthologies_slug_unique unique (slug)
);

create index if not exists idx_anthology_anthologies_created_at on anthology_anthologies(created_at desc);

-- updated_at trigger helper
-- NOTE: we use a non-$$ dollar quote delimiter so this file is safe to paste into Supabase SQL editor.
create or replace function anthology_update_updated_at_column()
returns trigger as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$ language plpgsql;

drop trigger if exists update_anthology_anthologies_updated_at on anthology_anthologies;
create trigger update_anthology_anthologies_updated_at
before update on anthology_anthologies
for each row execute function anthology_update_updated_at_column();


-- 2) Create / find the default anthology row used for existing data
do $$
declare
  default_anthology_id uuid;
begin
  select id into default_anthology_id
  from anthology_anthologies
  where slug = 'default';

  if default_anthology_id is null then
    insert into anthology_anthologies (slug, title, description, metadata)
    values ('default', 'Default Anthology', 'Auto-created to own existing rows', jsonb_build_object('source', 'migration'))
    returning id into default_anthology_id;
  end if;

  -- 3) Add anthology_id to top-level tables
  alter table anthology_conversations
    add column if not exists anthology_id uuid;

  alter table anthology_questions
    add column if not exists anthology_id uuid;

  alter table anthology_responses
    add column if not exists anthology_id uuid;

  alter table anthology_speakers
    add column if not exists anthology_id uuid;

  -- Optional (recommended) - scope recordings too.
  -- Keep NULLable to avoid forcing a single anthology when a recording is shared.
  alter table anthology_recordings
    add column if not exists anthology_id uuid;

  -- 4) Backfill anthology_id for existing rows
  update anthology_conversations
  set anthology_id = coalesce(anthology_id, default_anthology_id)
  where anthology_id is null;

  update anthology_questions q
  set anthology_id = c.anthology_id
  from anthology_conversations c
  where q.conversation_id = c.id
    and q.anthology_id is null;

  update anthology_responses r
  set anthology_id = c.anthology_id
  from anthology_conversations c
  where r.conversation_id = c.id
    and r.anthology_id is null;

  update anthology_speakers s
  set anthology_id = c.anthology_id
  from anthology_conversations c
  where s.conversation_id = c.id
    and s.anthology_id is null;

  -- Best-effort backfill for recordings (conversation primary recordings)
  update anthology_recordings rec
  set anthology_id = c.anthology_id
  from anthology_conversation_recordings cr
  join anthology_conversations c on c.id = cr.conversation_id
  where cr.recording_id = rec.id
    and rec.anthology_id is null;

  -- 5) Add FK constraints
  alter table anthology_conversations
    drop constraint if exists anthology_conversations_anthology_id_fkey;
  alter table anthology_conversations
    add constraint anthology_conversations_anthology_id_fkey
    foreign key (anthology_id) references anthology_anthologies(id) on delete restrict;

  alter table anthology_questions
    drop constraint if exists anthology_questions_anthology_id_fkey;
  alter table anthology_questions
    add constraint anthology_questions_anthology_id_fkey
    foreign key (anthology_id) references anthology_anthologies(id) on delete restrict;

  alter table anthology_responses
    drop constraint if exists anthology_responses_anthology_id_fkey;
  alter table anthology_responses
    add constraint anthology_responses_anthology_id_fkey
    foreign key (anthology_id) references anthology_anthologies(id) on delete restrict;

  alter table anthology_speakers
    drop constraint if exists anthology_speakers_anthology_id_fkey;
  alter table anthology_speakers
    add constraint anthology_speakers_anthology_id_fkey
    foreign key (anthology_id) references anthology_anthologies(id) on delete restrict;

  alter table anthology_recordings
    drop constraint if exists anthology_recordings_anthology_id_fkey;
  alter table anthology_recordings
    add constraint anthology_recordings_anthology_id_fkey
    foreign key (anthology_id) references anthology_anthologies(id) on delete set null;

  -- 6) Make anthology_id required where appropriate
  alter table anthology_conversations alter column anthology_id set not null;
  alter table anthology_questions alter column anthology_id set not null;
  alter table anthology_responses alter column anthology_id set not null;
  alter table anthology_speakers alter column anthology_id set not null;

  -- 7) Fix uniqueness: legacy_id can repeat across different anthologies
  -- Postgres auto-names these constraints as *_legacy_id_key when created inline.
  alter table anthology_conversations drop constraint if exists anthology_conversations_legacy_id_key;
  alter table anthology_questions drop constraint if exists anthology_questions_legacy_id_key;
  alter table anthology_responses drop constraint if exists anthology_responses_legacy_id_key;

  -- New composite uniqueness per anthology
  alter table anthology_conversations
    add constraint anthology_conversations_anthology_legacy_unique unique (anthology_id, legacy_id);
  alter table anthology_questions
    add constraint anthology_questions_anthology_legacy_unique unique (anthology_id, legacy_id);
  alter table anthology_responses
    add constraint anthology_responses_anthology_legacy_unique unique (anthology_id, legacy_id);

  -- 8) Add indexes for common filters
  create index if not exists idx_anthology_conversations_anthology_id on anthology_conversations(anthology_id);
  create index if not exists idx_anthology_questions_anthology_id on anthology_questions(anthology_id);
  create index if not exists idx_anthology_responses_anthology_id on anthology_responses(anthology_id);
  create index if not exists idx_anthology_speakers_anthology_id on anthology_speakers(anthology_id);
  create index if not exists idx_anthology_recordings_anthology_id on anthology_recordings(anthology_id);

end $$;

-- 9) RLS
-- Keep current “public read” approach.
-- If you want strict separation, add policies that filter by anthology_id
-- (e.g., based on JWT claim or request header via PostgREST settings).
alter table anthology_anthologies enable row level security;
drop policy if exists "Public read access" on anthology_anthologies;
create policy "Public read access" on anthology_anthologies for select using (true);

commit;

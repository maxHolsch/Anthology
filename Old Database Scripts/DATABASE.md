# Anthology Database (Supabase)

This document is the **single source of truth** for Anthology’s database.

This project uses **prefixed tables** in Supabase (Postgres) with the `anthology_` prefix.

This project also supports **multiple anthologies** (multiple independent datasets) in the same Supabase project via the top-level table [`anthology_anthologies`](database/schema_prefixed.sql:15) and `anthology_id` foreign keys.

## Canonical table set

```
 anthology_anthologies
 anthology_recordings
 anthology_conversations
 anthology_conversation_recordings
 anthology_speakers
 anthology_questions
 anthology_responses
 anthology_word_timestamps
```

## Repository map

### Schema + policies

- Prefixed schema (run in Supabase SQL Editor): [`schema_prefixed.sql`](database/schema_prefixed.sql:1)
- Public write policies (optional; enables anon/browser writes): [`rls_public_write_policies_prefixed.sql`](database/rls_public_write_policies_prefixed.sql:1)
- Storage policies for the recordings bucket: [`storage_policies_recordings.sql`](database/storage_policies_recordings.sql:1)

### Migration scripts

- JSON → prefixed tables: [`migrate_json_to_sql_prefixed.ts`](database/migrate_json_to_sql_prefixed.ts:1)
- Backfill word timestamps (prefixed): [`backfill_word_timestamps_prefixed.ts`](database/backfill_word_timestamps_prefixed.ts:1)

#### Legacy (non-prefixed) files

These exist for historical reference but are **not used** in the current project path:

- [`schema.sql`](database/schema.sql:1)
- [`migrate_json_to_sql.ts`](database/migrate_json_to_sql.ts:1)

### Frontend integration

- Supabase service layer (prefixed tables): [`supabase.ts`](anthology-app/src/services/supabase.ts:1)

## Storage bucket (audio)

Supabase bucket names are **case-sensitive**.

- Canonical bucket name: **`Recordings`**
- Override via `VITE_SUPABASE_RECORDINGS_BUCKET`.
  See [`RECORDINGS_BUCKET`](anthology-app/src/services/supabase.ts:31).

## Environment variables

Use:

- Template: [`anthology-app/.env.example`](anthology-app/.env.example:1)
- Local (ignored): [`anthology-app/.env`](anthology-app/.env:1)

Frontend-required (safe to expose):

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_RECORDINGS_BUCKET=Recordings
```

Migration-only (keep secret):

```bash
SUPABASE_SERVICE_KEY=...
```

## Setup + migration

### 1) Create a Supabase project

Create the project, then add credentials to [`anthology-app/.env`](anthology-app/.env:1).

### 2) Run the prefixed schema

Supabase Dashboard → SQL Editor:

1. Copy all of [`schema_prefixed.sql`](database/schema_prefixed.sql:1)
2. Paste into SQL Editor
3. Run

### Existing projects: add multi-anthology support

If you already have data and want to partition it into multiple anthologies:

1. Run the migration SQL: [`2025-12-14_add_anthologies.sql`](database/migrations/2025-12-14_add_anthologies.sql:1)
2. Your existing rows will be assigned to the `default` anthology slug.

Key behavior change:

- `legacy_id` values are now unique **per anthology**, not globally.

### 3) Create Storage bucket

Supabase Dashboard → Storage:

- Create a **public** bucket named **`Recordings`**

### 4) Enable policies (only if you want browser/anon writes)

If your UI uploads audio and creates DB rows using the anon key:

1. Allow Storage uploads: run [`storage_policies_recordings.sql`](database/storage_policies_recordings.sql:1)
2. Allow DB writes: run [`rls_public_write_policies_prefixed.sql`](database/rls_public_write_policies_prefixed.sql:1)

### 5) Run migration (JSON → Supabase)

From repo root:

```bash
npm install @supabase/supabase-js
ANTHOLOGY_SLUG=default npx tsx database/migrate_json_to_sql_prefixed.ts anthology-app/public/6798_phase2_3_template.json
```

Importing a second, separate dataset into the same Supabase project:

```bash
ANTHOLOGY_SLUG=my-second-anthology npx tsx database/migrate_json_to_sql_prefixed.ts path/to/other_anthology.json
```

Backfilling word timestamps for a specific anthology:

```bash
ANTHOLOGY_SLUG=my-second-anthology npx --yes tsx database/backfill_word_timestamps_prefixed.ts path/to/other_anthology.json
```

## Frontend: loading graph data

Canonical entrypoint:

- [`GraphDataService.loadAll()`](anthology-app/src/services/supabase.ts:555)

Example:

```ts
import { GraphDataService } from '@/services/supabase';

const data = await GraphDataService.loadAll();
// { conversations, questions, responses }
```

### ID canonicalization (legacy_id vs UUID)

- DB rows use UUID primary keys (`id`).
- JSON imports may also provide `legacy_id`.
- The service layer canonicalizes relationship IDs after loading to avoid PostgREST self-join edge cases.
  See canonicalization inside [`GraphDataService.loadAll()`](anthology-app/src/services/supabase.ts:594).

## Troubleshooting

## Verification queries (use in Supabase SQL editor)

List anthologies + conversation counts:

```sql
select
  a.id,
  a.slug,
  a.title,
  count(c.id) as conversation_count
from anthology_anthologies a
left join anthology_conversations c on c.anthology_id = a.id
group by a.id, a.slug, a.title
order by a.created_at desc;
```

Quick sanity check for a single anthology:

```sql
-- replace with your slug
with target as (
  select id from anthology_anthologies where slug = 'default'
)
select
  (select count(*) from anthology_conversations c join target t on c.anthology_id = t.id) as conversations,
  (select count(*) from anthology_questions q join target t on q.anthology_id = t.id) as questions,
  (select count(*) from anthology_responses r join target t on r.anthology_id = t.id) as responses,
  (select count(*) from anthology_speakers s join target t on s.anthology_id = t.id) as speakers;
```

### Bucket name issues

If uploads/playback fail, verify the bucket name is exactly `Recordings`.

## Storage bucket (conversation uploads)

The "Create anthology" flow uploads raw conversation files to Supabase Storage.

- Canonical bucket name: **`Conversations`**
- Objects are stored under a per-anthology folder:
  - `upload_conversations/<anthologySlug>/<timestamp>_<filename>`
- Storage policies (anon uploads): [`storage_policies_conversations.sql`](database/storage_policies_conversations.sql:1)

### RLS errors

- Storage upload blocked (`storage.objects`): run [`storage_policies_recordings.sql`](database/storage_policies_recordings.sql:1)
- DB insert blocked (e.g. `anthology_responses`): run [`rls_public_write_policies_prefixed.sql`](database/rls_public_write_policies_prefixed.sql:1)

### Missing credentials

Ensure [`anthology-app/.env`](anthology-app/.env:1) has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the dev server.

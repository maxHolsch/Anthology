# Anthology Database (Supabase)

This document is the **single source of truth** for Anthology’s database.

This project uses **prefixed tables** in Supabase (Postgres) with the `anthology_` prefix.

## Canonical table set

```
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
npx tsx database/migrate_json_to_sql_prefixed.ts anthology-app/public/6798_phase2_3_template.json
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

### Bucket name issues

If uploads/playback fail, verify the bucket name is exactly `Recordings`.

### RLS errors

- Storage upload blocked (`storage.objects`): run [`storage_policies_recordings.sql`](database/storage_policies_recordings.sql:1)
- DB insert blocked (e.g. `anthology_responses`): run [`rls_public_write_policies_prefixed.sql`](database/rls_public_write_policies_prefixed.sql:1)

### Missing credentials

Ensure [`anthology-app/.env`](anthology-app/.env:1) has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the dev server.

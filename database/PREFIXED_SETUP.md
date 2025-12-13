# Prefixed Tables Setup Guide

Quick setup for using `anthology_` prefixed tables with your existing Supabase project.

## 🎯 Your Supabase Project

**Project URL:** `https://enokfgiwbgianwblplcn.supabase.co`
**Anon Key:** `sb_publishable_3Dc14gtlg0fz1LiK71w9_g_5iHMb7Of`

✅ Environment variables already configured in `anthology-app/.env`

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run the Prefixed Schema (2 minutes)

```bash
# 1. Go to your Supabase project
open https://enokfgiwbgianwblplcn.supabase.co

# 2. Open SQL Editor (left sidebar)

# 3. Copy the entire contents of database/schema_prefixed.sql

# 4. Paste into SQL Editor and click "Run"
```

**What this creates:**
- 7 tables (all prefixed with `anthology_`)
- Indexes for performance
- Row Level Security policies
- Helper functions and views

**Tables created:**
```
anthology_recordings
anthology_conversations
anthology_conversation_recordings
anthology_speakers
anthology_questions
anthology_responses
anthology_word_timestamps
```

---

### Step 2: Create Storage Bucket (1 minute)

```bash
# 1. In Supabase Dashboard, go to Storage

# 2. Click "New bucket"
#    Name: recordings
#    Public: YES
#    Click "Create bucket"
```

---

### Step 3: Verify Setup (30 seconds)

```sql
-- In SQL Editor, run this to verify tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'anthology_%'
ORDER BY table_name;

-- Should return 7 tables:
-- anthology_conversation_recordings
-- anthology_conversations
-- anthology_questions
-- anthology_recordings
-- anthology_responses
-- anthology_speakers
-- anthology_word_timestamps
```

✅ **Setup Complete!**

---

## 📊 What Changed from Original Schema

### Table Name Mapping

| Original | Prefixed | Notes |
|----------|----------|-------|
| `recordings` | `anthology_recordings` | All table names prefixed |
| `conversations` | `anthology_conversations` | Foreign keys updated |
| `conversation_recordings` | `anthology_conversation_recordings` | References updated |
| `speakers` | `anthology_speakers` | All relations preserved |
| `questions` | `anthology_questions` | Constraints updated |
| `responses` | `anthology_responses` | Indexes updated |
| `word_timestamps` | `anthology_word_timestamps` | Views updated |

### Function & View Names

| Original | Prefixed |
|----------|----------|
| `update_updated_at_column()` | `anthology_update_updated_at_column()` |
| `response_details` view | `anthology_response_details` |
| `question_summary` view | `anthology_question_summary` |

### Service Layer Updated

The TypeScript service layer (`supabase-prefixed.ts`) automatically uses the prefixed table names:

```typescript
// Old:
.from('recordings')

// New:
.from('anthology_recordings')
```

---

## 💻 Using with Your Frontend

### Option 1: Use the Prefixed Service (Recommended)

```typescript
// In your App.tsx or wherever you load data:
import { GraphDataService } from '@/services/supabase-prefixed';

async function loadData() {
  const data = await GraphDataService.loadAll();
  // data.conversations, data.questions, data.responses
}
```

### Option 2: Rename the Service File

```bash
# Rename to use as default:
mv anthology-app/src/services/supabase-prefixed.ts \
   anthology-app/src/services/supabase.ts

# Then use normally:
import { GraphDataService } from '@/services/supabase';
```

---

## 🔄 Migrating Your JSON Data

### Update Migration Script for Prefixed Tables

The migration script needs a few updates to use prefixed table names. Here's the quick version:

```typescript
// Find and replace in migrate_json_to_sql.ts:

// Before:
.from('recordings')
.from('conversations')
.from('speakers')
.from('questions')
.from('responses')
.from('word_timestamps')

// After:
.from('anthology_recordings')
.from('anthology_conversations')
.from('anthology_speakers')
.from('anthology_questions')
.from('anthology_responses')
.from('anthology_word_timestamps')
```

Or use the prefixed migration script if you need one - let me know!

---

## 📝 Example Queries with Prefixed Tables

### Get all conversations
```sql
SELECT * FROM anthology_conversations;
```

### Get responses with full details
```sql
SELECT * FROM anthology_response_details;
```

### Get question summary
```sql
SELECT * FROM anthology_question_summary;
```

### Get all responses for a conversation
```sql
SELECT
  r.*,
  rec.file_path,
  s.circle_color
FROM anthology_responses r
LEFT JOIN anthology_recordings rec ON r.recording_id = rec.id
LEFT JOIN anthology_speakers s ON r.speaker_id = s.id
WHERE r.conversation_id = 'your-uuid-here'
ORDER BY r.turn_number;
```

---

## 🎵 Testing Audio Playback

### 1. Upload a Test Recording

```sql
-- Insert a test recording
INSERT INTO anthology_recordings (file_path, file_name, duration_ms)
VALUES
  ('https://enokfgiwbgianwblplcn.supabase.co/storage/v1/object/public/recordings/test.mp3',
   'test.mp3',
   180000);

-- Get the ID
SELECT id FROM anthology_recordings WHERE file_name = 'test.mp3';
```

### 2. Upload via Supabase Storage

```bash
# 1. Go to Storage → recordings bucket
# 2. Click "Upload file"
# 3. Select your MP3
# 4. Copy the public URL
# 5. Insert into anthology_recordings table
```

---

## 🔍 Verify Your Setup

Run these checks to ensure everything is working:

### ✅ Check 1: Tables Exist
```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'anthology_%';
-- Should return: 7
```

### ✅ Check 2: Foreign Keys Set Up
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'anthology_%'
ORDER BY tc.table_name;
```

### ✅ Check 3: RLS Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'anthology_%';
-- All should show rowsecurity = true
```

### ✅ Check 4: Indexes Created
```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'anthology_%'
ORDER BY tablename, indexname;
-- Should show multiple indexes per table
```

---

## 🚨 Common Issues

### "Table does not exist"
**Cause:** Schema not run or wrong table name used

**Fix:**
```sql
-- Check if tables exist:
\dt anthology_*

-- If empty, re-run schema_prefixed.sql
```

### "Permission denied for table"
**Cause:** RLS policies too restrictive

**Fix:**
```sql
-- Temporarily disable RLS for testing:
ALTER TABLE anthology_responses DISABLE ROW LEVEL SECURITY;

-- Re-enable when ready:
ALTER TABLE anthology_responses ENABLE ROW LEVEL SECURITY;
```

### "Foreign key violation"
**Cause:** Trying to insert data without required parent records

**Fix:**
```sql
-- Insert in correct order:
-- 1. anthology_recordings
-- 2. anthology_conversations
-- 3. anthology_conversation_recordings
-- 4. anthology_speakers
-- 5. anthology_questions
-- 6. anthology_responses
-- 7. anthology_word_timestamps
```

---

## 📦 What's Next?

### 1. Migrate Your Data
- Update migration script to use prefixed tables
- Run migration to import JSON data
- Verify data imported correctly

### 2. Update Your Frontend
- Use `supabase-prefixed.ts` service layer
- Update App.tsx to load from Supabase
- Test visualization with real data

### 3. Add New Features
- Upload individual recordings per response
- Enable real-time updates
- Add admin UI for data management

---

## 🎯 Quick Commands Reference

```bash
# Install dependencies
npm install @supabase/supabase-js

# Check environment
cat anthology-app/.env

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## 📚 Related Files

- [schema_prefixed.sql](schema_prefixed.sql) - Database schema with prefixed tables
- [supabase-prefixed.ts](../anthology-app/src/services/supabase-prefixed.ts) - Service layer
- [.env.example](../anthology-app/.env.example) - Environment variables template
- [.env](../anthology-app/.env) - Your actual environment (already configured!)

---

**You're all set!** Your Supabase project is ready with prefixed tables. 🎉

**Next:** Run the schema, then start migrating your JSON data or building your frontend integration.

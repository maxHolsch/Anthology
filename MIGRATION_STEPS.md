# Migration Steps - JSON to Supabase

Quick guide to migrate your Anthology data to Supabase.

## 🎯 Your Setup

**Supabase Project:** `https://enokfgiwbgianwblplcn.supabase.co`
**Environment:** ✅ Already configured in `.env`

---

## 📋 Step-by-Step Migration (10 minutes)

### Step 1: Run Database Schema (2 minutes)

```bash
# 1. Open Supabase SQL Editor
open https://enokfgiwbgianwblplcn.supabase.co/project/_/sql

# 2. Open the schema file in your editor
open database/schema_prefixed.sql

# 3. Copy all contents (Cmd+A, Cmd+C)

# 4. Paste into Supabase SQL Editor and click "Run" (bottom right)
```

**Expected result:**
```
Success. No rows returned
```

**Verify:**
```sql
-- Run this in SQL Editor:
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'anthology_%'
ORDER BY table_name;

-- Should return 7 tables ✅
```

---

### Step 2: Create Storage Bucket (1 minute)

```bash
# 1. In Supabase Dashboard, click "Storage" (left sidebar)

# 2. Click "New bucket"

# 3. Settings:
#    Name: Recordings
#    Public bucket: YES (toggle on)
#    File size limit: 50 MB
#    Allowed MIME types: Leave empty (allows all)

# 4. Click "Create bucket"
```

---

### Step 3: Run Migration Script (5 minutes)

```bash
# Install dependencies (if not already installed)
npm install @supabase/supabase-js

# Run migration
npx tsx database/migrate_json_to_sql_prefixed.ts

# Or specify JSON file path:
npx tsx database/migrate_json_to_sql_prefixed.ts anthology-app/public/6798_phase2_3_template.json
```

**Expected output:**
```
🚀 Starting migration from JSON to Supabase...

📄 Source: anthology-app/public/6798_phase2_3_template.json
🗄️  Target: https://enokfgiwbgianwblplcn.supabase.co

📊 Found:
   - 1 conversations
   - 5 questions
   - 50+ responses

📀 Migrating recordings...
   ✅ 6798.mp3 → [uuid]

💬 Migrating conversations...
   ✅ Chica Project Peer Leaders December 2024 → [uuid]

👥 Migrating speakers...
   ✅ Sarah (Chica Project Peer Leaders December 2024)
   ✅ Nina (Chica Project Peer Leaders December 2024)
   [... more speakers ...]

❓ Migrating questions...
   ✅ What brought you or your family to Boston, and wha...
   [... more questions ...]

💬 Migrating responses...
   ✅ r_002 by Sarah
   📝 Migrated 500+ word timestamps for response
   [... more responses ...]

✅ Migration complete!

📊 Summary:
   - 1 recordings
   - 1 conversations
   - 8 speakers
   - 5 questions
   - 50+ responses

🎯 Next steps:
   1. Verify data in Supabase dashboard
   2. Update App.tsx to use GraphDataService
   3. Test your application!
```

---

### Step 4: Verify Migration (2 minutes)

```sql
-- In Supabase SQL Editor, run these checks:

-- Check conversations
SELECT id, title, date, color FROM anthology_conversations;

-- Check questions
SELECT id, legacy_id, question_text FROM anthology_questions LIMIT 5;

-- Check responses
SELECT id, legacy_id, speaker_name, LEFT(speaker_text, 50) as text_preview
FROM anthology_responses LIMIT 5;

-- Check recordings
SELECT id, file_name, duration_ms FROM anthology_recordings;

-- Count everything
SELECT
  (SELECT COUNT(*) FROM anthology_conversations) as conversations,
  (SELECT COUNT(*) FROM anthology_questions) as questions,
  (SELECT COUNT(*) FROM anthology_responses) as responses,
  (SELECT COUNT(*) FROM anthology_recordings) as recordings,
  (SELECT COUNT(*) FROM anthology_speakers) as speakers,
  (SELECT COUNT(*) FROM anthology_word_timestamps) as word_timestamps;
```

**Expected:**
- ✅ 1 conversation
- ✅ 5 questions
- ✅ 50+ responses
- ✅ 1 recording
- ✅ 8 speakers
- ✅ Thousands of word timestamps

---

### Step 5: Test Frontend (1 minute)

```bash
# Start dev server
npm run dev

# Open browser console (F12)
# You should see:
# ✅ Loaded data from Supabase
```

**Verify in browser:**
1. Map loads with all nodes visible
2. Click a response node → audio plays
3. Comment rail shows content
4. Word highlighting works during playback

---

## 🚨 Troubleshooting

### "Table does not exist"
**Cause:** Schema not run

**Fix:**
```bash
# Re-run schema_prefixed.sql in Supabase SQL Editor
```

### "No data in Supabase, falling back to JSON"
**Cause:** Migration script didn't run or failed

**Fix:**
```bash
# Check if data exists:
SELECT COUNT(*) FROM anthology_conversations;

# If 0, re-run migration:
npx tsx database/migrate_json_to_sql_prefixed.ts
```

### "SUPABASE_SERVICE_KEY not set"
**Cause:** Missing service key in .env

**Fix:**
```bash
# Check .env file:
cat anthology-app/.env

# Should show:
# SUPABASE_SERVICE_KEY=sb_secret_oDpO5uDt7EUZhOdActFaGg_DatQGcu-

# If missing, add it
```

### "Failed to insert response"
**Cause:** Foreign key constraint (missing parent record)

**Fix:**
```bash
# Migration runs in correct order automatically
# If you see this, it might be a data issue

# Check which conversation IDs exist:
SELECT conversation_id FROM anthology_conversations;

# Make sure your JSON references match
```

### App still loading from JSON
**Cause:** Supabase query failing silently

**Fix:**
```bash
# Open browser console and check for errors

# Test Supabase connection:
# In browser console:
import { supabase } from '@/services/supabase-prefixed';
const { data, error } = await supabase.from('anthology_conversations').select('*');
console.log(data, error);
```

---

## 🎯 What Changed

### Database
- ✅ Data now in Supabase (7 tables with `anthology_` prefix)
- ✅ All relationships preserved
- ✅ All timestamps maintained
- ✅ Word-level timestamps migrated

### Frontend
- ✅ App.tsx updated to load from Supabase
- ✅ JSON fallback maintained
- ✅ No other code changes needed
- ✅ Everything works as before

### New Capabilities
- ✅ Can add individual recordings per response
- ✅ Real-time updates (optional)
- ✅ Multi-user access
- ✅ Scalable storage

---

## 📊 Data Verification Queries

### See all your data
```sql
-- View complete response details
SELECT * FROM anthology_response_details LIMIT 10;

-- View question summaries
SELECT * FROM anthology_question_summary;

-- Get responses with audio info
SELECT
  r.speaker_name,
  LEFT(r.speaker_text, 100) as text,
  rec.file_name,
  r.audio_start_ms,
  r.audio_end_ms
FROM anthology_responses r
JOIN anthology_recordings rec ON r.recording_id = rec.id
LIMIT 10;
```

---

## 🎨 Next Steps

### Immediate
1. ✅ Verify data loaded correctly
2. ✅ Test app functionality
3. ✅ Check audio playback

### Short Term
1. Upload recordings to Supabase Storage
2. Update file paths to use Storage URLs
3. Test adding new responses with individual recordings

### Long Term
1. Build admin UI for data management
2. Enable real-time collaboration
3. Add search and filtering
4. Implement user authentication

---

## 📝 Migration Summary

**What was migrated:**
- 1 conversation with all metadata
- 5 questions with facilitator info
- All response nodes (prompt nodes skipped)
- 8 speakers with full color palettes
- 1 audio recording reference
- All word-level timestamps

**What's preserved:**
- All timestamps (audio_start, audio_end)
- All relationships (question→response, response→response)
- All speaker colors (6 variations each)
- All metadata (topics, participants, etc.)
- Legacy IDs for reference

**What's new:**
- Individual recordings per node capability
- Real-time update support
- Scalable storage
- Advanced querying

---

Canonical guide: [`database/DATABASE.md`](database/DATABASE.md:1)

**You're done!** Your data is now in Supabase. 🎉

**Test command:**
```bash
npm run dev
# Check console for: ✅ Loaded data from Supabase
```

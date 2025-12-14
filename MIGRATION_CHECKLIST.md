# Migration Checklist

Quick checklist for migrating Anthology to Supabase.

## ✅ Pre-Migration Checklist

- [x] Supabase project created (`enokfgiwbgianwblplcn.supabase.co`)
- [x] Environment variables configured (`.env` file)
- [x] Service key obtained and stored
- [x] JSON data file available (`6798_phase2_3_template.json`)

## 📋 Migration Steps

### 1. Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Copy `database/schema_prefixed.sql`
- [ ] Paste and run in SQL Editor
- [ ] Verify 7 tables created

### 2. Storage Setup
- [ ] Go to Storage in Supabase Dashboard
- [ ] Create bucket named "Recordings" (case-sensitive)
- [ ] Set to public access
- [ ] Verify bucket created

### 3. Run Migration
- [ ] Install `@supabase/supabase-js` (`npm install`)
- [ ] Run migration script: `npx tsx database/migrate_json_to_sql_prefixed.ts`
- [ ] Check console output for success messages
- [ ] Verify no error messages

### 4. Verify Data
- [ ] Run verification queries in SQL Editor
- [ ] Check conversations table has 1 row
- [ ] Check questions table has 5 rows
- [ ] Check responses table has 50+ rows
- [ ] Check speakers table has 8 rows
- [ ] Check word_timestamps table has data

### 5. Test Frontend
- [ ] Start dev server (`npm run dev`)
- [ ] Open browser console
- [ ] Check for "✅ Loaded data from Supabase" message
- [ ] Verify map renders correctly
- [ ] Click a node and verify it works
- [ ] Test audio playback
- [ ] Test word highlighting

## 🎯 Post-Migration

### Optional Enhancements
- [ ] Upload recordings to Supabase Storage
- [ ] Update file paths to use Storage URLs
- [ ] Test adding new response with individual recording
- [ ] Enable real-time updates (see integration-example.ts)
- [ ] Build admin UI for data management

## 🚨 If Something Goes Wrong

### Schema errors
```bash
# Delete tables and re-run schema
DROP TABLE IF EXISTS anthology_word_timestamps CASCADE;
DROP TABLE IF EXISTS anthology_responses CASCADE;
DROP TABLE IF EXISTS anthology_questions CASCADE;
DROP TABLE IF EXISTS anthology_speakers CASCADE;
DROP TABLE IF EXISTS anthology_conversation_recordings CASCADE;
DROP TABLE IF EXISTS anthology_conversations CASCADE;
DROP TABLE IF EXISTS anthology_recordings CASCADE;
DROP FUNCTION IF EXISTS anthology_update_updated_at_column CASCADE;

# Then re-run schema_prefixed.sql
```

### Migration errors
```bash
# Clear database and re-run
# In SQL Editor:
TRUNCATE TABLE anthology_word_timestamps CASCADE;
TRUNCATE TABLE anthology_responses CASCADE;
TRUNCATE TABLE anthology_questions CASCADE;
TRUNCATE TABLE anthology_speakers CASCADE;
TRUNCATE TABLE anthology_conversation_recordings CASCADE;
TRUNCATE TABLE anthology_conversations CASCADE;
TRUNCATE TABLE anthology_recordings CASCADE;

# Then re-run migration script
```

### App not loading from Supabase
```bash
# Check environment variables
cat anthology-app/.env

# Should show:
# VITE_SUPABASE_URL=https://enokfgiwbgianwblplcn.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_3Dc14gtlg0fz1LiK71w9_g_5iHMb7Of

# Restart dev server
npm run dev
```

## ✨ Success Criteria

Your migration is successful when:

- ✅ All 7 tables exist in Supabase
- ✅ Data counts match your JSON file
- ✅ App loads with "✅ Loaded data from Supabase" in console
- ✅ Map visualization displays correctly
- ✅ Audio playback works
- ✅ Word highlighting works
- ✅ All interactions function as before

## 📚 Reference Files

- **Schema:** `database/schema_prefixed.sql`
- **Migration:** `database/migrate_json_to_sql_prefixed.ts`
- **Service Layer:** `anthology-app/src/services/supabase-prefixed.ts`
- **Updated App:** `anthology-app/src/App.tsx`
- **Detailed Guide:** `MIGRATION_STEPS.md`

---

**Current Status:** Ready to migrate!

**Next:** Follow [MIGRATION_STEPS.md](MIGRATION_STEPS.md) for detailed instructions.

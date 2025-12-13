# Supabase Setup Guide

Step-by-step guide to migrate Anthology from JSON to Supabase SQL database.

## 📋 Prerequisites

- [x] Supabase account (free tier works)
- [x] Node.js 18+ installed
- [x] Existing JSON data file
- [x] Audio recordings in `./recordings/` folder

## 🚀 Quick Start (5 steps)

### 1. Create Supabase Project

```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Choose organization and region
# Set database password (save it!)
# Wait 2-3 minutes for provisioning
```

**Save these credentials:**
- Project URL: `https://[project-ref].supabase.co`
- Anon Key: Found in Settings → API
- Service Role Key: Found in Settings → API (keep secret!)

### 2. Set Up Database

```bash
# Open Supabase SQL Editor (left sidebar)
# Copy entire contents of database/schema.sql
# Paste into editor
# Click "Run" (bottom right)
# ✅ Should complete in ~2 seconds with no errors
```

**Verify:**
- Tables created: 7 tables visible in Table Editor
- Functions created: `update_updated_at_column`
- Views created: `response_details`, `question_summary`

### 3. Create Storage Bucket

```bash
# Go to Storage in Supabase dashboard
# Click "New bucket"
# Name: "recordings"
# Public bucket: YES
# Click "Create bucket"
```

### 4. Run Migration

```bash
# Install dependencies
cd anthology-app
npm install @supabase/supabase-js

# Create .env file
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
EOF

# Run migration (from project root)
npx tsx database/migrate_json_to_sql.ts anthology-app/public/6798_phase2_3_template.json
```

**Expected output:**
```
🚀 Starting migration from JSON to Supabase...
📊 Found:
   - 1 conversations
   - 5 questions
   - 50 responses

📀 Migrating recordings...
   ✅ 6798.mp3 → [uuid]

💬 Migrating conversations...
   ✅ Chica Project Peer Leaders December 2024 → [uuid]

[...]

✅ Migration complete!
```

### 5. Update Frontend

```bash
# Update App.tsx to use Supabase
# See database/integration-example.ts for code samples

# Test the application
npm run dev
```

## 📁 Project Structure

After setup, you'll have:

```
Anthology/
├── database/
│   ├── schema.sql                 # ✅ Database schema
│   ├── migrate_json_to_sql.ts     # ✅ Migration script
│   ├── README.md                  # ✅ Schema documentation
│   ├── integration-example.ts     # ✅ Code examples
│   └── SETUP_GUIDE.md            # ✅ This file
│
├── anthology-app/
│   ├── .env                       # 🔒 Your credentials (gitignored)
│   ├── src/
│   │   ├── services/
│   │   │   └── supabase.ts       # ✅ Service layer
│   │   └── App.tsx               # Update to use Supabase
│   └── public/
│       └── 6798_phase2_3_template.json  # Legacy JSON (can keep for fallback)
│
└── recordings/
    └── 6798.mp3                   # Upload to Supabase Storage
```

## 🔧 Configuration Details

### Environment Variables

Create `anthology-app/.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# Migration Script (not exposed to frontend)
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Security Notes:**
- `VITE_*` variables are exposed to frontend (safe for public use)
- `SUPABASE_SERVICE_KEY` is only for migration scripts (never expose to frontend)
- Add `.env` to `.gitignore`

### Update package.json

```bash
cd anthology-app
npm install @supabase/supabase-js
npm install -D tsx  # For running TypeScript migration scripts
```

Or manually add to `anthology-app/package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

## 📤 Uploading Recordings

### Option 1: Supabase Dashboard (GUI)

```bash
# 1. Go to Storage → recordings bucket
# 2. Click "Upload file"
# 3. Select your MP3 files
# 4. Copy public URLs
```

### Option 2: Supabase CLI (Batch Upload)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Upload recordings
supabase storage upload recordings ./recordings/6798.mp3
```

### Option 3: Migration Script (Automatic)

The migration script will reference your local file paths. After migration, update paths to Supabase Storage URLs:

```sql
UPDATE recordings
SET file_path = 'https://your-project.supabase.co/storage/v1/object/public/recordings/' || file_name
WHERE file_path LIKE './recordings/%';
```

## 🔍 Verification Steps

### 1. Check Database

```sql
-- Count records
SELECT
  (SELECT COUNT(*) FROM conversations) as conversations,
  (SELECT COUNT(*) FROM questions) as questions,
  (SELECT COUNT(*) FROM responses) as responses,
  (SELECT COUNT(*) FROM recordings) as recordings,
  (SELECT COUNT(*) FROM speakers) as speakers;

-- Sample data
SELECT * FROM conversations LIMIT 1;
SELECT * FROM questions LIMIT 1;
SELECT * FROM responses LIMIT 1;
```

### 2. Test API Access

```bash
# In browser console (after starting dev server):
import { GraphDataService } from '@/services/supabase';

const data = await GraphDataService.loadAll();
console.log(data);
// Should see conversations, questions, responses
```

### 3. Verify Audio Playback

```bash
# In your app:
# 1. Click on a response node
# 2. Check that audio loads
# 3. Verify timestamp segmentation works
# 4. Test word highlighting (if implemented)
```

## 🐛 Troubleshooting

### "Supabase credentials not found"

**Cause:** Missing or incorrect `.env` file

**Fix:**
```bash
cd anthology-app
cat .env  # Should show VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# If missing, create it:
echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=your-key" >> .env

# Restart dev server
npm run dev
```

### "No conversations found in database"

**Cause:** Migration didn't run or failed

**Fix:**
```bash
# Check if tables have data
# In Supabase SQL Editor:
SELECT COUNT(*) FROM conversations;

# If 0, re-run migration:
npx tsx database/migrate_json_to_sql.ts anthology-app/public/6798_phase2_3_template.json
```

### "Audio file not found" (404 errors)

**Cause:** Recording file paths not updated after upload to Storage

**Fix:**
```sql
-- Check current paths
SELECT file_name, file_path FROM recordings;

-- Update to Supabase Storage URLs
UPDATE recordings
SET file_path = 'https://your-project.supabase.co/storage/v1/object/public/recordings/' || file_name
WHERE file_path LIKE './recordings/%';
```

### "Permission denied" errors

**Cause:** Row Level Security policies too restrictive

**Fix:**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Temporarily disable RLS for testing (re-enable for production!)
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;

-- Or create more permissive policy:
CREATE POLICY "Allow all for testing"
  ON responses
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Migration script errors

**Common issues:**

1. **"Module not found: @supabase/supabase-js"**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **"Cannot find module 'tsx'"**
   ```bash
   npm install -D tsx
   ```

3. **"Invalid JSON"**
   - Check your JSON file is valid
   - Try: `cat file.json | jq` (requires jq installed)

4. **"Connection timeout"**
   - Check SUPABASE_URL and SUPABASE_SERVICE_KEY
   - Verify Supabase project is running (green status in dashboard)

## 🎯 Next Steps After Setup

### 1. Add New Recordings

```typescript
import { AdminService } from '@/services/supabase';

// Upload and link new recording to response
const response = await AdminService.addResponse({
  conversationId: 'uuid-here',
  questionId: 'uuid-here',
  speakerName: 'John Doe',
  speakerText: 'This is my response...',
  pullQuote: 'Key insight here',
  recordingFile: file,  // File object from input
  audioStartMs: 0,
  audioEndMs: 45000  // 45 seconds
});
```

### 2. Enable Real-time Updates

```typescript
// In App.tsx
useEffect(() => {
  const unsubscribe = GraphDataService.subscribeToUpdates(() => {
    // Reload data when changes occur
    loadGraphData();
  });

  return () => unsubscribe();
}, []);
```

### 3. Optimize Performance

```sql
-- Add custom indexes for your query patterns
CREATE INDEX idx_responses_custom
  ON responses(conversation_id, turn_number)
  WHERE pull_quote IS NOT NULL;

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM response_details
WHERE conversation_title = 'Your Title';
```

### 4. Set Up Backups

```bash
# Enable automatic backups in Supabase dashboard:
# Settings → Database → Point in Time Recovery
# (Available on paid plans)

# Or export manually:
supabase db dump > backup.sql
```

### 5. Production Deployment

```bash
# Update RLS policies for production
# See database/schema.sql for examples

# Set up environment variables in hosting platform (Vercel, Netlify, etc.)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Deploy
npm run build
# (follow your hosting provider's deployment steps)
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

## 🎉 You're Done!

Your Anthology app now uses a SQL database with:
- ✅ Individual recordings per node
- ✅ Timestamp references preserved
- ✅ Scalable architecture
- ✅ Real-time updates (optional)
- ✅ Supabase hosting

**Test it:** Add a new response with its own recording and watch it appear in your visualization!

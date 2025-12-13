# Quick Reference Card

## 🎯 One-Pagers

### Setup (5 minutes)
```bash
# 1. Create Supabase project → https://supabase.com
# 2. SQL Editor → Paste database/schema.sql → Run
# 3. Storage → Create bucket "recordings" (public)
# 4. Settings → API → Copy URL and anon key
# 5. Create .env:
cat > anthology-app/.env << ENV
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
ENV
```

### Migration (2 minutes)
```bash
npm install @supabase/supabase-js
npx tsx database/migrate_json_to_sql.ts anthology-app/public/6798_phase2_3_template.json
```

### Frontend Integration (1 change)
```typescript
// Before:
import data from './data.json';
loadData(data.conversations, data.questions, data.responses);

// After:
import { GraphDataService } from '@/services/supabase';
const data = await GraphDataService.loadAll();
loadData(data.conversations, data.questions, data.responses);
```

## 📊 Schema Cheat Sheet

### Tables (7 total)
```
recordings          → Audio files (independent)
conversations       → Discussion sessions
conversation_recs   → Link conversations ↔ recordings
speakers            → Participants + colors
questions           → Question nodes
responses           → Response nodes
word_timestamps     → Karaoke highlighting
```

### Key Foreign Keys
```
responses.recording_id       → recordings.id  (individual audio)
responses.conversation_id    → conversations.id
responses.responds_to_q_id   → questions.id
responses.speaker_id         → speakers.id
word_timestamps.response_id  → responses.id
```

## 🎵 Recording Patterns

### Pattern 1: Conversation-Level (Traditional)
```sql
-- One recording, multiple responses with timestamps
Recording: "panel.mp3" (3600000ms)
  ├─ Response 1: 0-95000ms
  ├─ Response 2: 95000-178000ms
  └─ Response 3: 178000-265000ms
```

### Pattern 2: Individual (New)
```sql
-- Each response has own recording
Response 1: "sarah.mp3" (0-45000ms)
Response 2: "nina.mp3" (0-32000ms)
Response 3: "christelle.mp3" (0-58000ms)
```

### Pattern 3: Hybrid (Mix)
```sql
-- Some shared, some individual
Response 1: "workshop.mp3" (8000-95000ms)
Response 2: "nina_followup.mp3" (0-62000ms)  ← Individual!
Response 3: "workshop.mp3" (95000-185000ms)
```

## 🔍 Common Queries

### Get response with audio
```sql
SELECT
  r.speaker_text,
  rec.file_path,
  r.audio_start_ms,
  r.audio_end_ms
FROM responses r
JOIN recordings rec ON r.recording_id = rec.id
WHERE r.id = 'uuid-here';
```

### Get all responses for question
```sql
SELECT *
FROM responses
WHERE responds_to_question_id = 'question-uuid'
ORDER BY turn_number;
```

### Get word timestamps
```sql
SELECT text, start_ms, end_ms
FROM word_timestamps
WHERE response_id = 'response-uuid'
ORDER BY word_order;
```

## 💻 TypeScript Examples

### Load All Data
```typescript
import { GraphDataService } from '@/services/supabase';

const data = await GraphDataService.loadAll();
// Returns: { conversations, questions, responses }
```

### Add Response with Recording
```typescript
import { AdminService } from '@/services/supabase';

const response = await AdminService.addResponse({
  conversationId: 'uuid',
  questionId: 'uuid',
  speakerName: 'Sarah',
  speakerText: 'My response...',
  pullQuote: 'Key insight',
  recordingFile: file,  // File object
  audioStartMs: 0,
  audioEndMs: 45000
});
```

### Real-time Updates
```typescript
const unsubscribe = GraphDataService.subscribeToUpdates(() => {
  // Reload data
  loadGraphData();
});

// Later: unsubscribe()
```

### Get Word Timestamps
```typescript
import { ResponseService } from '@/services/supabase';

const words = await ResponseService.getWordTimestamps(responseId);
// Returns: Array<{ text, start, end, confidence, speaker }>
```

## 🚨 Troubleshooting

### "Supabase credentials not found"
```bash
# Check .env exists and has correct format:
cat anthology-app/.env
# Should show VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### "No conversations found"
```sql
-- Check if migration ran:
SELECT COUNT(*) FROM conversations;
-- If 0, re-run migration script
```

### "Audio 404 errors"
```sql
-- Update recording paths to Supabase Storage:
UPDATE recordings
SET file_path = 'https://your-project.supabase.co/storage/v1/object/public/recordings/' || file_name
WHERE file_path LIKE './recordings/%';
```

### "Permission denied"
```sql
-- Check RLS policies:
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Temporarily disable for testing:
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
```

## 📚 Documentation Map

| File | Purpose | When to Read |
|------|---------|--------------|
| **SUMMARY.md** | Overview + what's new | Start here |
| **SETUP_GUIDE.md** | Step-by-step setup | Setting up |
| **ARCHITECTURE.md** | Visual diagrams | Understanding structure |
| **README.md** | Schema details | Reference |
| **integration-example.ts** | Code examples | Coding |
| **QUICK_REFERENCE.md** | This file | Quick lookup |

## 🎯 Most Important Commands

```bash
# Install dependencies
npm install @supabase/supabase-js

# Run migration
npx tsx database/migrate_json_to_sql.ts [json-file]

# Start dev server
npm run dev

# Build for production
npm run build
```

## 🔑 Key Concepts

1. **Recordings are independent** - Not tied to conversations
2. **Timestamps are preserved** - audio_start_ms, audio_end_ms
3. **Backwards compatible** - Still supports conversation-level recordings
4. **Flexible** - Mix individual and shared recordings

## ✅ 3-Step Verification

```bash
# 1. Database has data
SELECT COUNT(*) FROM conversations;  # Should be > 0

# 2. Frontend loads data
# Open browser console:
import { GraphDataService } from '@/services/supabase';
await GraphDataService.loadAll();  # Should return data

# 3. Audio plays
# Click response node → Audio should play from correct timestamp
```

## 🎨 Color Reference (from Design.md)

Speakers have 6 color variations each:
- `circle_color` - Node fill
- `faded_circle_color` - Unselected state
- `quote_rectangle_color` - Pull quote background
- `faded_quote_rectangle_color` - Unselected pull quote
- `quote_text_color` - Pull quote text
- `faded_quote_text_color` - Unselected text

All stored in `speakers` table.

## 🚀 Production Checklist

- [ ] Supabase project on paid plan (if needed)
- [ ] RLS policies configured properly
- [ ] Environment variables in hosting platform
- [ ] Recordings uploaded to Supabase Storage
- [ ] Database backups enabled
- [ ] Monitoring and alerts set up
- [ ] Performance testing completed
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] User authentication (if needed)

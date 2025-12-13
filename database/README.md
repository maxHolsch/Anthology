# Anthology Database Schema

SQL database schema for Supabase, supporting individual recordings per node with timestamp references.

## 🎯 Key Features

### ✅ Individual Recordings Per Node
- **Before**: Each conversation linked to ONE audio file
- **Now**: Each response/question can have its OWN recording
- **Backwards Compatible**: Still supports conversation-level recordings via `conversation_recordings` table

### ✅ Timestamp References Preserved
- Every response/question stores `audio_start_ms` and `audio_end_ms`
- Timestamps reference the specific recording linked to that node
- Supports millisecond-precision playback

### ✅ Flexible Recording Architecture
```
Recordings (audio files)
    ↓
    ├─→ conversation_recordings (many-to-many)
    │       ↓
    │   Conversations (discussion sessions)
    │
    ├─→ Questions (can have individual recordings)
    │
    └─→ Responses (can have individual recordings)
```

## 📊 Schema Overview

### Core Tables

#### `recordings`
Audio files stored in Supabase Storage or filesystem.

```sql
- id (UUID)
- file_path (TEXT) -- e.g., "recordings/6798.mp3" or Supabase Storage URL
- file_name (TEXT)
- duration_ms (INTEGER) -- Total duration in milliseconds
- file_size_bytes (BIGINT)
- mime_type (TEXT)
- created_at, updated_at
```

#### `conversations`
Discussion sessions containing questions and responses.

```sql
- id (UUID)
- legacy_id (TEXT) -- e.g., "conv_ca766496" from JSON
- title (TEXT)
- date (DATE)
- location, facilitator (TEXT)
- color (TEXT) -- Hex color for visualization
- topics (TEXT[])
- participants (TEXT[])
- created_at, updated_at
```

#### `conversation_recordings`
Many-to-many relationship: conversations ↔ recordings.

```sql
- conversation_id (UUID FK)
- recording_id (UUID FK)
- is_primary (BOOLEAN) -- Main recording for conversation
- recording_order (INTEGER) -- For sequential recordings
```

#### `speakers`
Participants with color assignments per conversation.

```sql
- id (UUID)
- name (TEXT)
- conversation_id (UUID FK)
- circle_color (TEXT)
- faded_circle_color (TEXT)
- quote_rectangle_color (TEXT)
- faded_quote_rectangle_color (TEXT)
- quote_text_color (TEXT)
- faded_quote_text_color (TEXT)
```

#### `questions`
Question nodes in the visualization.

```sql
- id (UUID)
- legacy_id (TEXT) -- e.g., "q_001"
- conversation_id (UUID FK)
- question_text (TEXT)
- facilitator (TEXT)
- recording_id (UUID FK) -- Optional individual recording
- audio_start_ms, audio_end_ms (INTEGER) -- Timestamp range
- notes (TEXT)
```

#### `responses`
Response nodes in the visualization.

```sql
- id (UUID)
- legacy_id (TEXT) -- e.g., "r_002"
- conversation_id (UUID FK)
- responds_to_question_id (UUID FK) -- Responding to a question
- responds_to_response_id (UUID FK) -- Or responding to another response
- speaker_id (UUID FK)
- speaker_name (TEXT)
- speaker_text (TEXT)
- pull_quote (TEXT) -- Optional featured excerpt
- recording_id (UUID FK) -- Individual recording for this response
- audio_start_ms, audio_end_ms (INTEGER) -- Timestamp range
- turn_number (INTEGER)
```

#### `word_timestamps`
Word-level timestamps for karaoke-style highlighting (Design.md).

```sql
- id (UUID)
- response_id (UUID FK) -- Or question_id
- question_id (UUID FK)
- text (TEXT)
- start_ms, end_ms (INTEGER)
- confidence (FLOAT)
- speaker (TEXT)
- word_order (INTEGER) -- Sequential position
```

## 🚀 Setup Instructions

### 1. Create Supabase Project
```bash
# Go to https://supabase.com
# Create a new project
# Note your project URL and service key
```

### 2. Run Schema Migration
```bash
# In Supabase SQL Editor, paste and execute:
cat database/schema.sql

# Or use Supabase CLI:
supabase db push
```

### 3. Configure Environment
```bash
# Create .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### 4. Migrate JSON Data
```bash
# Install dependencies
npm install @supabase/supabase-js

# Run migration script
npx tsx database/migrate_json_to_sql.ts [path-to-json]

# Example:
npx tsx database/migrate_json_to_sql.ts anthology-app/public/6798_phase2_3_template.json
```

## 🎵 Recording Architecture Explained

### Scenario 1: Conversation-Level Recording (Current JSON Model)
```
Conversation: "Chica Project Dec 2024"
    ├─ Recording: "6798.mp3" (2754108ms duration)
    │
    ├─ Question 1: "What brought you to Boston?"
    │   └─ No individual recording
    │
    ├─ Response r_002 (Sarah)
    │   ├─ recording_id: → "6798.mp3"
    │   ├─ audio_start_ms: 252410
    │   └─ audio_end_ms: 511700
    │
    └─ Response r_003 (Nina)
        ├─ recording_id: → "6798.mp3"
        ├─ audio_start_ms: 511700
        └─ audio_end_ms: 680000
```

**All responses share one recording, using timestamps to isolate segments.**

### Scenario 2: Individual Recordings Per Response (New Capability)
```
Conversation: "Async Interview Collection"
    ├─ No primary recording
    │
    ├─ Question 1: "What brought you to Boston?"
    │   ├─ recording_id: → "question_1.mp3"
    │   ├─ audio_start_ms: 0
    │   └─ audio_end_ms: 15000 (full question audio)
    │
    ├─ Response r_002 (Sarah)
    │   ├─ recording_id: → "sarah_response_1.mp3"
    │   ├─ audio_start_ms: 0
    │   └─ audio_end_ms: 45000 (full response audio)
    │
    └─ Response r_003 (Nina)
        ├─ recording_id: → "nina_response_1.mp3"
        ├─ audio_start_ms: 0
        └─ audio_end_ms: 38000 (full response audio)
```

**Each node has its own recording file.**

### Scenario 3: Hybrid Approach
```
Conversation: "Panel Discussion"
    ├─ Recording: "panel_main.mp3" (primary)
    │
    ├─ Question 1: "What are your goals?"
    │   └─ recording_id: → "panel_main.mp3" (0-12000ms)
    │
    ├─ Response r_002 (Panelist 1)
    │   └─ recording_id: → "panel_main.mp3" (12000-95000ms)
    │
    ├─ Response r_003 (Audience Member - recorded separately)
    │   └─ recording_id: → "audience_q1.mp3" (0-18000ms)
    │
    └─ Response r_004 (Panelist 2)
        └─ recording_id: → "panel_main.mp3" (113000-205000ms)
```

**Mix of shared and individual recordings.**

## 📝 Common Queries

### Get all responses for a question with audio info
```sql
SELECT
    r.speaker_name,
    r.speaker_text,
    r.pull_quote,
    rec.file_path AS recording_path,
    r.audio_start_ms,
    r.audio_end_ms,
    (r.audio_end_ms - r.audio_start_ms) AS duration_ms
FROM responses r
JOIN questions q ON r.responds_to_question_id = q.id
JOIN recordings rec ON r.recording_id = rec.id
WHERE q.question_text ILIKE '%Boston%'
ORDER BY r.turn_number;
```

### Get conversation with all recordings
```sql
SELECT
    c.title,
    c.date,
    rec.file_name,
    rec.duration_ms,
    cr.is_primary,
    cr.recording_order
FROM conversations c
JOIN conversation_recordings cr ON c.id = cr.conversation_id
JOIN recordings rec ON cr.recording_id = rec.id
WHERE c.title = 'Chica Project Peer Leaders December 2024'
ORDER BY cr.recording_order;
```

### Get word timestamps for response playback
```sql
SELECT
    text,
    start_ms,
    end_ms,
    confidence
FROM word_timestamps
WHERE response_id = 'uuid-here'
ORDER BY word_order;
```

### Find all responses using a specific recording
```sql
SELECT
    c.title AS conversation,
    r.speaker_name,
    r.speaker_text,
    r.audio_start_ms,
    r.audio_end_ms
FROM responses r
JOIN conversations c ON r.conversation_id = c.id
JOIN recordings rec ON r.recording_id = rec.id
WHERE rec.file_name = '6798.mp3'
ORDER BY r.audio_start_ms;
```

## 🔄 Migration from JSON

The migration script (`migrate_json_to_sql.ts`):

1. ✅ Creates recordings from conversation audio files
2. ✅ Creates conversations with metadata
3. ✅ Links recordings to conversations via `conversation_recordings`
4. ✅ Creates speakers with color assignments
5. ✅ Creates questions
6. ✅ Creates responses with recording references and timestamps
7. ✅ Migrates word timestamps for karaoke playback

**Timestamp preservation**: All `audio_start` and `audio_end` values from JSON are preserved as `audio_start_ms` and `audio_end_ms` in SQL.

## 🎨 Integration with Frontend

### TypeScript Types
```typescript
interface Recording {
  id: string;
  file_path: string;
  duration_ms: number;
}

interface Response {
  id: string;
  speaker_name: string;
  speaker_text: string;
  pull_quote?: string;

  // Recording reference
  recording_id: string;
  audio_start_ms: number; // Start time within recording
  audio_end_ms: number;   // End time within recording

  // Calculated
  duration_ms: number; // audio_end_ms - audio_start_ms
}
```

### Playback Implementation
```typescript
// Play a specific response segment
async function playResponse(response: Response) {
  const recording = await getRecording(response.recording_id);

  audio.src = recording.file_path;
  audio.currentTime = response.audio_start_ms / 1000; // Convert to seconds

  audio.addEventListener('timeupdate', () => {
    const currentMs = audio.currentTime * 1000;

    if (currentMs >= response.audio_end_ms) {
      audio.pause();
    }

    // Highlight current word
    highlightWordAtTime(currentMs, response.id);
  });

  audio.play();
}
```

## 🔐 Security Considerations

### Row Level Security (RLS)
Current policies allow public read access. Adjust based on your needs:

```sql
-- Example: Restrict to authenticated users
CREATE POLICY "Authenticated users only"
  ON responses
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Example: User-specific data
CREATE POLICY "Users see their own responses"
  ON responses
  FOR SELECT
  USING (auth.uid()::text = metadata->>'user_id');
```

### Storage Security
For Supabase Storage:

```sql
-- Allow public read access to recordings
CREATE POLICY "Public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'recordings');

-- Restrict uploads to authenticated users
CREATE POLICY "Authenticated upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.role() = 'authenticated'
  );
```

## 📦 Next Steps

1. **Upload Recordings to Supabase Storage**
   ```bash
   # Use Supabase dashboard or CLI
   supabase storage create recordings
   supabase storage upload recordings ./recordings/6798.mp3
   ```

2. **Update File Paths**
   ```sql
   UPDATE recordings
   SET file_path = 'https://your-project.supabase.co/storage/v1/object/public/recordings/' || file_name
   WHERE file_path LIKE './recordings/%';
   ```

3. **Update Frontend Data Layer**
   - Replace JSON loading with Supabase queries
   - Update AnthologyStore to use SQL data
   - Implement real-time subscriptions (optional)

4. **Add New Recordings**
   ```typescript
   // Upload recording
   const { data: uploadData } = await supabase.storage
     .from('recordings')
     .upload('new_recording.mp3', file);

   // Create database entry
   const { data: recording } = await supabase
     .from('recordings')
     .insert({
       file_path: uploadData.path,
       file_name: 'new_recording.mp3',
       duration_ms: 120000
     })
     .select()
     .single();

   // Link to response
   await supabase
     .from('responses')
     .insert({
       conversation_id: 'conv-uuid',
       responds_to_question_id: 'question-uuid',
       speaker_name: 'John',
       speaker_text: 'My response...',
       recording_id: recording.id,
       audio_start_ms: 0,
       audio_end_ms: 120000
     });
   ```

## 🐛 Troubleshooting

### JSON file in dist/ folder
The `dist/` folder contains your built application. The JSON there is copied during build. Only edit files in `public/` or `src/`.

### Word timestamps migration slow
Word timestamps are inserted in batches of 1000. For large files, this may take time. Consider:
- Increasing batch size
- Running migration off-peak hours
- Using Supabase's bulk import features

### Recording not found
Ensure file paths are updated after uploading to Supabase Storage:
```sql
SELECT file_path FROM recordings WHERE file_name = 'your-file.mp3';
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Design.md](../Design.md) - Original design specification
- [Implementation Plan](../implementation_plan.md) - Development roadmap
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

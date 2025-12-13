# Database Architecture

Visual guide to understanding the Anthology Supabase schema.

## 🎯 Core Concept: Decoupled Recordings

**The Big Change:** Recordings are now independent entities that can be linked to any node (question or response).

```
OLD ARCHITECTURE (JSON):
┌─────────────────────┐
│   Conversation      │
│  ┌──────────────┐   │
│  │ audio_file   │   │  ← ONE recording per conversation
│  └──────────────┘   │
│       │             │
│       ├─ Question 1 │  (references conversation audio + timestamps)
│       ├─ Response 1 │  (references conversation audio + timestamps)
│       ├─ Response 2 │  (references conversation audio + timestamps)
│       └─ Response 3 │  (references conversation audio + timestamps)
└─────────────────────┘

NEW ARCHITECTURE (SQL):
┌──────────────┐
│  Recording 1 │ ← Independent audio files
├──────────────┤
│  Recording 2 │
├──────────────┤
│  Recording 3 │
└──────────────┘
       ↓
┌─────────────────────┐
│   Conversation      │
│                     │
│  ├─ Question 1      │ → Recording 1 (0-15s)
│  ├─ Response 1      │ → Recording 2 (0-45s)  ← Individual recording!
│  ├─ Response 2      │ → Recording 1 (15-80s)
│  └─ Response 3      │ → Recording 3 (0-30s)  ← Individual recording!
└─────────────────────┘
```

## 📊 Entity Relationship Diagram

```
┌──────────────────┐
│    recordings    │
│  ┌────────────┐  │
│  │ id (PK)    │  │
│  │ file_path  │  │
│  │ duration_ms│  │
│  └────────────┘  │
└────────┬─────────┘
         │
         │ 1:N
         ├───────────────────┐
         │                   │
         ↓                   ↓
┌──────────────────┐  ┌──────────────────┐
│ conversation_    │  │    questions     │
│   recordings     │  │  ┌────────────┐  │
│  ┌────────────┐  │  │  │ id (PK)    │  │
│  │ conv_id    │◄─┼──┤  │ conv_id    │  │
│  │ rec_id     │  │  │  │ rec_id     │◄─┼─── Optional individual recording
│  │ is_primary │  │  │  │ audio_*_ms │  │
│  └────────────┘  │  │  └────────────┘  │
└─────────┬────────┘  └────────┬─────────┘
          │                    │
          ↓                    │
┌──────────────────┐           │
│  conversations   │           │
│  ┌────────────┐  │           │
│  │ id (PK)    │◄─┘           │
│  │ title      │              │
│  │ color      │              │
│  └────────────┘  │           │
└────────┬─────────┘           │
         │                     │
         │ 1:N                 │ N:1
         ├─────────────────────┴──────────┐
         │                                │
         ↓                                │
┌──────────────────┐                      │
│    speakers      │                      │
│  ┌────────────┐  │                      │
│  │ id (PK)    │  │                      │
│  │ name       │  │                      │
│  │ conv_id    │  │                      │
│  │ colors...  │  │                      │
│  └────────────┘  │                      │
└────────┬─────────┘                      │
         │                                │
         │ 1:N                            │
         ↓                                │
┌──────────────────┐                      │
│    responses     │                      │
│  ┌────────────┐  │                      │
│  │ id (PK)    │  │                      │
│  │ conv_id    │  │                      │
│  │ speaker_id │  │                      │
│  │ rec_id     │◄─┼──────────────────────┘  ← Individual recording per response!
│  │ audio_*_ms │  │  Timestamp range within recording
│  │ resp_to_q  │──┼─→ questions.id (FK)
│  │ resp_to_r  │──┼─→ responses.id (FK) ← Can respond to other responses
│  └────────────┘  │
└────────┬─────────┘
         │
         │ 1:N
         ↓
┌──────────────────┐
│ word_timestamps  │
│  ┌────────────┐  │
│  │ id (PK)    │  │
│  │ resp_id    │  │  ← For karaoke highlighting
│  │ text       │  │
│  │ start_ms   │  │
│  │ end_ms     │  │
│  │ word_order │  │
│  └────────────┘  │
└──────────────────┘
```

## 🔗 Relationship Patterns

### Pattern 1: Conversation-Level Recording (Traditional)

```
Conversation: "Panel Discussion"
├─ Primary Recording: "panel_2024.mp3" (3600000ms = 1 hour)
│
├─ Question 1: "What are your goals?"
│   └─ Recording: "panel_2024.mp3" (0-12000ms)
│
├─ Response 1: Sarah's answer
│   └─ Recording: "panel_2024.mp3" (12000-95000ms)
│
├─ Response 2: Nina's answer
│   └─ Recording: "panel_2024.mp3" (95000-178000ms)
│
└─ Response 3: Christelle's answer
    └─ Recording: "panel_2024.mp3" (178000-265000ms)

SQL Representation:
┌────────────────────────────────────┐
│ recordings                         │
│ ┌────────────────────────────────┐ │
│ │ id: rec_001                    │ │
│ │ file_path: "panel_2024.mp3"    │ │
│ │ duration_ms: 3600000           │ │
│ └────────────────────────────────┘ │
└──────────────┬─────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│ conversation_recordings            │
│ ┌────────────────────────────────┐ │
│ │ conversation_id: conv_001      │ │
│ │ recording_id: rec_001          │ │
│ │ is_primary: TRUE               │ │
│ └──────��─────────────────────────┘ │
└──────────────┬─────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│ conversations                      │
│ ┌────────────────────────────────┐ │
│ │ id: conv_001                   │ │
│ │ title: "Panel Discussion"      │ │
│ └────────────────────────────────┘ │
└──────────────┬─────────────────────┘
               │
               ├─→ questions (conv_001)
               │   └─ recording_id: rec_001
               │       audio_start_ms: 0
               │       audio_end_ms: 12000
               │
               └─→ responses (conv_001)
                   ├─ Response 1
                   │  └─ recording_id: rec_001
                   │      audio_start_ms: 12000
                   │      audio_end_ms: 95000
                   │
                   ├─ Response 2
                   │  └─ recording_id: rec_001
                   │      audio_start_ms: 95000
                   │      audio_end_ms: 178000
                   │
                   └─ Response 3
                      └─ recording_id: rec_001
                          audio_start_ms: 178000
                          audio_end_ms: 265000
```

### Pattern 2: Individual Recordings (New Capability)

```
Conversation: "Async Community Survey"
├─ No primary recording (async collection)
│
├─ Question 1: Video question
│   └─ Recording: "q1_video.mp4" (0-15000ms)
│
├─ Response 1: Sarah's video response
│   └─ Recording: "sarah_r1.mp4" (0-45000ms)
│
├─ Response 2: Nina's voice memo
│   └─ Recording: "nina_r1.m4a" (0-32000ms)
│
└─ Response 3: Christelle's video response
    └─ Recording: "christelle_r1.mp4" (0-58000ms)

SQL Representation:
┌────────────────────────────────────┐
│ recordings (4 separate files)      │
│ ┌────────────────────────────────┐ │
│ │ rec_101: "q1_video.mp4"        │ │
│ │ rec_102: "sarah_r1.mp4"        │ │
│ │ rec_103: "nina_r1.m4a"         │ │
│ │ rec_104: "christelle_r1.mp4"   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│ conversations                      │
│ ┌────────────────────────────────┐ │
│ │ id: conv_002                   │ │
│ │ title: "Async Survey"          │ │
│ └────────────────────────────────┘ │
└──────────────┬─────────────────────┘
               │
               ├─→ questions (conv_002)
               │   └─ recording_id: rec_101 ← Individual recording
               │       audio_start_ms: 0
               │       audio_end_ms: 15000
               │
               └─→ responses (conv_002)
                   ├─ Response 1
                   │  └─ recording_id: rec_102 ← Individual recording
                   │      audio_start_ms: 0
                   │      audio_end_ms: 45000
                   │
                   ├─ Response 2
                   │  └─ recording_id: rec_103 ← Individual recording
                   │      audio_start_ms: 0
                   │      audio_end_ms: 32000
                   │
                   └─ Response 3
                      └─ recording_id: rec_104 ← Individual recording
                          audio_start_ms: 0
                          audio_end_ms: 58000
```

### Pattern 3: Hybrid Approach

```
Conversation: "Workshop with Follow-ups"
├─ Primary Recording: "workshop.mp3" (main session)
│
├─ Question 1: Live question
│   └─ Recording: "workshop.mp3" (0-8000ms)
│
├─ Response 1: Live answer (Sarah)
│   └─ Recording: "workshop.mp3" (8000-95000ms)
│
├─ Response 2: Follow-up (Nina, recorded later)
│   └─ Recording: "nina_followup.mp3" (0-62000ms) ← Individual!
│
└─ Response 3: Live answer (Christelle)
    └─ Recording: "workshop.mp3" (95000-185000ms)

SQL Representation:
┌────────────────────────────────────┐
│ recordings (2 files)               │
│ ┌────────────────────────────────┐ │
│ │ rec_201: "workshop.mp3"        │ │
│ │ rec_202: "nina_followup.mp3"   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│ conversation_recordings            │
│ ┌────────────────────────────────┐ │
│ │ conv_id: conv_003              │ │
│ │ rec_id: rec_201 (is_primary)   │ │
│ │ rec_id: rec_202 (not primary)  │ │ ← Both linked to conversation
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
               │
               ↓
┌────────────────────────────────────┐
│ responses                          │
│ ┌────────────────────────────────┐ │
│ │ Response 1: rec_201 (8-95s)    │ │ ← Main recording
│ │ Response 2: rec_202 (0-62s)    │ │ ← Individual recording
│ │ Response 3: rec_201 (95-185s)  │ │ ← Main recording
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

## 🎵 Audio Playback Flow

```
User clicks Response Node
         ↓
┌──────────────────────────┐
│ Get response from DB     │
│  - response_id           │
│  - recording_id          │
│  - audio_start_ms        │
│  - audio_end_ms          │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Get recording from DB    │
│  - file_path (URL)       │
│  - duration_ms           │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Load audio element       │
│  audio.src = file_path   │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Seek to start time       │
│  currentTime = start/1000│
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Play audio               │
│  audio.play()            │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Monitor playback         │
│  if (time >= end) pause  │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Highlight words          │
│  (from word_timestamps)  │
└──────────────────────────┘
```

## 🔍 Query Patterns

### Get all data for a response (with audio)

```sql
SELECT
    r.id,
    r.speaker_text,
    r.pull_quote,
    r.audio_start_ms,
    r.audio_end_ms,

    -- Recording info
    rec.file_path,
    rec.duration_ms,

    -- Speaker colors
    s.circle_color,
    s.quote_text_color,

    -- Question context
    q.question_text,

    -- Conversation info
    c.title,
    c.color

FROM responses r
LEFT JOIN recordings rec ON r.recording_id = rec.id
LEFT JOIN speakers s ON r.speaker_id = s.id
LEFT JOIN questions q ON r.responds_to_question_id = q.id
LEFT JOIN conversations c ON r.conversation_id = c.id

WHERE r.id = 'response-uuid-here';
```

### Get all recordings for a conversation

```sql
SELECT
    rec.file_name,
    rec.file_path,
    rec.duration_ms,
    cr.is_primary,
    cr.recording_order

FROM conversation_recordings cr
JOIN recordings rec ON cr.recording_id = rec.id

WHERE cr.conversation_id = 'conversation-uuid-here'
ORDER BY cr.recording_order;
```

### Find responses using a specific recording

```sql
SELECT
    r.id,
    r.speaker_name,
    r.speaker_text,
    r.audio_start_ms,
    r.audio_end_ms,
    c.title AS conversation

FROM responses r
JOIN conversations c ON r.conversation_id = c.id

WHERE r.recording_id = 'recording-uuid-here'
ORDER BY r.audio_start_ms;
```

## 🎯 Key Benefits

### 1. Flexibility
- ✅ Single recording per conversation (traditional)
- ✅ Individual recordings per node (new)
- ✅ Mix of both in same conversation (hybrid)

### 2. Scalability
- ✅ No duplication of large audio files
- ✅ Efficient storage with referencing
- ✅ Easy to add new recordings

### 3. Timestamp Preservation
- ✅ `audio_start_ms` and `audio_end_ms` preserved
- ✅ Millisecond precision
- ✅ Word-level timestamps maintained

### 4. Future-Proof
- ✅ Support for video files (change mime_type)
- ✅ Support for multiple formats (MP3, M4A, WAV, etc.)
- ✅ Real-time collaboration ready

## 📚 Further Reading

- [Schema Documentation](README.md)
- [Setup Guide](SETUP_GUIDE.md)
- [Integration Examples](integration-example.ts)
- [Design Specification](../Design.md)

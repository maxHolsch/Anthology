# Database Documentation Index

Complete guide to the Anthology Supabase database migration.

## 📖 Documentation Files

### 1. [SUMMARY.md](SUMMARY.md) - **START HERE**
**Read Time:** 5 minutes
**Purpose:** Big picture overview of what changed and why

**What you'll learn:**
- What was created (schema, migration scripts, service layer)
- The key architectural change (individual recordings per node)
- Quick comparison: before vs. after
- What's preserved from your JSON data
- New capabilities enabled

**Read this if:** You're new to this migration or want a high-level overview

---

### 2. [SETUP_GUIDE.md](SETUP_GUIDE.md) - **DO THIS SECOND**
**Read Time:** 10 minutes
**Setup Time:** 15-20 minutes

**What you'll learn:**
- Step-by-step Supabase project creation
- How to run the database schema
- How to migrate your JSON data
- How to configure your frontend
- Troubleshooting common issues

**Read this if:** You're ready to set up the database

---

### 3. [ARCHITECTURE.md](ARCHITECTURE.md) - **UNDERSTAND THE STRUCTURE**
**Read Time:** 10 minutes
**Purpose:** Visual guide to database relationships

**What you'll learn:**
- Entity relationship diagrams
- Three recording patterns (traditional, individual, hybrid)
- How data flows through the system
- Audio playback architecture
- Common query patterns

**Read this if:** You want to deeply understand the database structure

---

### 4. [README.md](README.md) - **REFERENCE GUIDE**
**Read Time:** 15 minutes
**Purpose:** Comprehensive schema documentation

**What you'll learn:**
- Detailed table descriptions
- All columns and their purposes
- Indexes and performance optimizations
- Row Level Security policies
- Common SQL queries
- Integration examples

**Read this if:** You need detailed technical reference

---

### 5. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - **CHEAT SHEET**
**Read Time:** 2 minutes
**Purpose:** Quick lookup for common tasks

**What you'll learn:**
- One-command setup snippets
- Common SQL queries
- TypeScript code examples
- Troubleshooting quick fixes
- Key concepts summary

**Read this if:** You need a quick reminder or lookup

---

## 🛠️ Code Files

### 6. [schema.sql](schema.sql) - **DATABASE SCHEMA**
**Purpose:** Complete Supabase SQL schema

**What it does:**
- Creates 7 tables
- Sets up foreign key relationships
- Adds indexes for performance
- Configures Row Level Security
- Creates helper views and functions

**How to use:**
1. Open Supabase SQL Editor
2. Paste entire file
3. Click "Run"
4. ✅ Done!

---

### 7. [migrate_json_to_sql.ts](migrate_json_to_sql.ts) - **MIGRATION SCRIPT**
**Purpose:** Convert JSON data to SQL database

**What it does:**
- Reads your anthology_template.json file
- Creates recordings, conversations, speakers
- Creates questions and responses
- Links everything together
- Migrates word timestamps

**How to use:**
```bash
npx tsx database/migrate_json_to_sql.ts [path-to-json]
```

---

### 8. [integration-example.ts](integration-example.ts) - **CODE EXAMPLES**
**Purpose:** Real-world code examples for your frontend

**What it includes:**
- 8 complete examples:
  1. Update App.tsx to use Supabase
  2. Add real-time updates
  3. Environment configuration
  4. Hybrid approach (JSON fallback)
  5. Adding new responses with recordings
  6. Playing audio from individual recordings
  7. Word-level highlighting
  8. Complete migration workflow

**How to use:** Copy-paste examples into your code

---

### 9. [supabase.ts](../anthology-app/src/services/supabase.ts) - **SERVICE LAYER**
**Purpose:** TypeScript service layer for database access

**What it provides:**
- `RecordingService` - Upload and manage recordings
- `ConversationService` - Get conversations and speakers
- `QuestionService` - Query questions and responses
- `ResponseService` - Get responses and word timestamps
- `GraphDataService` - Load complete graph data
- `AdminService` - Add new data

**How to use:**
```typescript
import { GraphDataService } from '@/services/supabase';
const data = await GraphDataService.loadAll();
```

---

## 🎯 Reading Path by Role

### **I'm a Developer (Setting this up)**
1. [SUMMARY.md](SUMMARY.md) - Understand what's changing
2. [SETUP_GUIDE.md](SETUP_GUIDE.md) - Follow step-by-step setup
3. [integration-example.ts](integration-example.ts) - See code examples
4. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Keep handy for lookups

### **I'm a Database Admin**
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Understand structure
2. [README.md](README.md) - Study schema details
3. [schema.sql](schema.sql) - Review actual SQL
4. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Common queries

### **I'm a Product Manager**
1. [SUMMARY.md](SUMMARY.md) - See what's new
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Understand capabilities
3. [SETUP_GUIDE.md](SETUP_GUIDE.md) - Know setup complexity

### **I'm New to This Project**
1. Start with [SUMMARY.md](SUMMARY.md)
2. Read [Design.md](../Design.md) in parent folder
3. Then [ARCHITECTURE.md](ARCHITECTURE.md)
4. When ready to code: [integration-example.ts](integration-example.ts)

---

## 🚀 Quick Start (TL;DR)

**Goal:** Get your database running in 20 minutes

```bash
# 1. Create Supabase project (5 min)
Go to https://supabase.com → Create project

# 2. Run schema (2 min)
Supabase SQL Editor → Paste schema.sql → Run

# 3. Install dependencies (1 min)
npm install @supabase/supabase-js

# 4. Configure environment (2 min)
Create anthology-app/.env with your Supabase credentials

# 5. Migrate data (5 min)
npx tsx database/migrate_json_to_sql.ts anthology-app/public/6798_phase2_3_template.json

# 6. Update App.tsx (5 min)
Replace JSON import with GraphDataService.loadAll()

# Done! 🎉
npm run dev
```

**Detailed instructions:** [SETUP_GUIDE.md](SETUP_GUIDE.md)

---

## 📊 What Problem Does This Solve?

### **Before (JSON)**
```
❌ One recording per conversation (inflexible)
❌ Can't add individual response recordings
❌ Must reload entire file for updates
❌ No multi-user support
❌ Limited to file size (~10MB practical limit)
```

### **After (SQL)**
```
✅ Individual recordings per node
✅ Mix shared and individual recordings
✅ Update single records efficiently
✅ Multi-user collaboration ready
✅ Unlimited scalability
✅ Real-time updates
✅ Advanced querying and filtering
```

---

## 🎵 The Core Innovation

**Your request:**
> "I'd like to be able to add recordings as I'd like, and connect them to individual nodes."

**The solution:**
```
Recordings table (independent audio files)
     ↓
     ├─→ Questions (can have individual recordings)
     └─→ Responses (can have individual recordings)

Each node stores:
- recording_id (which audio file)
- audio_start_ms (start timestamp)
- audio_end_ms (end timestamp)

Result: Any node can use any recording with any timestamps!
```

**Examples:**
- Traditional: All responses share one conversation recording
- Individual: Each response has its own recording file
- Hybrid: Mix of both in the same conversation

**All working together with preserved timestamp references!**

---

## 🎨 Visual Learning

```
                         Documentation Hierarchy
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
              Quick Start                    Deep Understanding
                    │                               │
        ┌───────────┴───────────┐     ┌────────���───┴────────────┐
        │                       │     │                         │
   SUMMARY.md          QUICK_REFERENCE.md   ARCHITECTURE.md   README.md
        │                       │     │                         │
        └───────────┬───────────┘     └────────────┬────────────┘
                    │                              │
                    └──────────┬───────────────────┘
                               │
                       SETUP_GUIDE.md
                               │
                    ┌──────────┴──────────┐
                    │                     │
            Code Examples          Actual Code
                    │                     │
        integration-example.ts    schema.sql
                                  migrate_json_to_sql.ts
                                  supabase.ts
```

---

## 🔑 Key Concepts (The Big Ideas)

### 1. **Decoupled Recordings**
Recordings are now independent entities, not tied to conversations. This enables maximum flexibility.

### 2. **Timestamp Preservation**
Your `audio_start` and `audio_end` values are preserved as `audio_start_ms` and `audio_end_ms`. No data loss!

### 3. **Backwards Compatibility**
The new schema still supports the old pattern (one recording per conversation) while enabling new patterns.

### 4. **Flexible Relationships**
A conversation can have multiple recordings. A recording can be shared across multiple nodes. Mix and match!

### 5. **Zero Frontend Changes**
Your visualization code, D3 graphs, and audio players work as-is. Only the data loading changes.

---

## 📞 Help & Support

### Common Questions

**"Which file should I read first?"**
→ [SUMMARY.md](SUMMARY.md)

**"How do I set this up?"**
→ [SETUP_GUIDE.md](SETUP_GUIDE.md)

**"Where's the SQL schema?"**
→ [schema.sql](schema.sql)

**"How do I integrate with my code?"**
→ [integration-example.ts](integration-example.ts)

**"What are the tables and relationships?"**
→ [ARCHITECTURE.md](ARCHITECTURE.md)

**"I need a quick command reference"**
→ [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

**"What columns are in each table?"**
→ [README.md](README.md)

### Troubleshooting

See [SETUP_GUIDE.md - Troubleshooting](SETUP_GUIDE.md#-troubleshooting) for:
- Supabase credentials issues
- Migration problems
- Audio file errors
- Permission errors

---

## 🎯 Success Criteria

You'll know you're successful when:

- ✅ Your JSON data is migrated to Supabase
- ✅ Your app loads data from the database
- ✅ Audio playback works with correct timestamps
- ✅ You can add new responses with individual recordings
- ✅ The visualization displays correctly
- ✅ Everything works just like before (plus new capabilities!)

---

## 📚 Related Documentation

In parent directory:
- [Design.md](../Design.md) - Original design specification
- [implementation_plan.md](../implementation_plan.md) - Development roadmap

In anthology-app:
- [package.json](../anthology-app/package.json) - Dependencies
- [App.tsx](../anthology-app/src/App.tsx) - Main app (needs update)
- [AnthologyStore.ts](../anthology-app/src/stores/AnthologyStore.ts) - State management

---

## 🚀 Next Steps After Reading

1. **Understand** - Read SUMMARY.md and ARCHITECTURE.md
2. **Setup** - Follow SETUP_GUIDE.md
3. **Migrate** - Run migration script
4. **Integrate** - Update App.tsx using integration-example.ts
5. **Test** - Verify audio playback and visualization
6. **Build** - Start adding individual recordings!

---

**Ready to get started?** → [SUMMARY.md](SUMMARY.md)

**Need quick setup?** → [SETUP_GUIDE.md](SETUP_GUIDE.md)

**Want to understand deeply?** → [ARCHITECTURE.md](ARCHITECTURE.md)

---

*Generated for Anthology v2.0 - Individual Recordings Per Node Update*

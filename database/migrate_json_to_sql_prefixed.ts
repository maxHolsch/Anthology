/**
 * Migration Script: JSON to Supabase SQL (Prefixed Tables)
 *
 * Converts anthology_template.json format to Supabase database
 * Uses anthology_ prefixed table names
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from anthology-app/.env
async function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), 'anthology-app/.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env file from anthology-app/.env');
  }
}

// ============================================
// TYPES
// ============================================

interface JsonConversation {
  conversation_id: string;
  audio_file: string;
  duration: number;
  color: string;
  metadata: {
    title: string;
    date: string;
    participants: string[];
    location?: string;
    facilitator?: string;
    speaker_colors?: Record<string, {
      circle: string;
      fadedCircle: string;
      quoteRectangle: string;
      fadedQuoteRectangle: string;
      quoteText: string;
      fadedQuoteText: string;
    }>;
    topics?: string[];
    source_transcript?: string;
  };
}

interface JsonQuestion {
  type: 'question';
  id: string;
  question_text: string;
  related_responses: string[];
  facilitator?: string;
  notes?: string;
}

interface JsonResponse {
  type: 'response' | 'prompt';
  id: string;
  responds_to: string | string[]; // Can be a single string or array of strings
  speaker_name: string;
  speaker_text: string;
  pull_quote?: string | null;
  audio_start: number;
  audio_end: number;
  conversation_id: string;
  turn_number?: number;
  word_timestamps?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string;
  }>;
}

interface JsonData {
  conversations: JsonConversation[];
  questions: JsonQuestion[];
  responses: JsonResponse[];
}

// ============================================
// CONFIGURATION
// ============================================

// Note: Supabase client will be created after loading env vars

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function migrateRecordings(conversations: JsonConversation[], supabase: any) {
  console.log('\n📀 Migrating recordings...');

  const recordingMap = new Map<string, string>(); // audio_file -> uuid

  for (const conv of conversations) {
    const { audio_file, duration } = conv;

    if (recordingMap.has(audio_file)) {
      continue; // Already migrated
    }

    const fileName = path.basename(audio_file);

    const { data, error } = await supabase
      .from('anthology_recordings')
      .insert({
        file_path: audio_file,
        file_name: fileName,
        duration_ms: duration,
        mime_type: 'audio/mpeg',
        metadata: {
          source: 'json_migration',
          original_conversation_id: conv.conversation_id
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to insert recording ${audio_file}:`, error);
      continue;
    }

    recordingMap.set(audio_file, data.id);
    console.log(`   ✅ ${fileName} → ${data.id}`);
  }

  return recordingMap;
}

async function migrateConversations(
  conversations: JsonConversation[],
  recordingMap: Map<string, string>,
  supabase: any
) {
  console.log('\n💬 Migrating conversations...');

  const conversationMap = new Map<string, string>(); // legacy_id -> uuid

  for (const conv of conversations) {
    const { conversation_id, metadata, color } = conv;

    const { data, error } = await supabase
      .from('anthology_conversations')
      .insert({
        legacy_id: conversation_id,
        title: metadata.title,
        date: metadata.date,
        location: metadata.location,
        facilitator: metadata.facilitator,
        color: color,
        topics: metadata.topics || [],
        participants: metadata.participants || [],
        source_transcript: metadata.source_transcript,
        metadata: {
          speaker_colors: metadata.speaker_colors,
          source: 'json_migration'
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to insert conversation ${conversation_id}:`, error);
      continue;
    }

    conversationMap.set(conversation_id, data.id);
    console.log(`   ✅ ${metadata.title} → ${data.id}`);

    // Link conversation to its primary recording
    const recordingId = recordingMap.get(conv.audio_file);
    if (recordingId) {
      await supabase
        .from('anthology_conversation_recordings')
        .insert({
          conversation_id: data.id,
          recording_id: recordingId,
          is_primary: true,
          recording_order: 1
        });
    }
  }

  return conversationMap;
}

async function migrateSpeakers(
  conversations: JsonConversation[],
  conversationMap: Map<string, string>,
  supabase: any
) {
  console.log('\n👥 Migrating speakers...');

  const speakerMap = new Map<string, string>(); // "conv_id:speaker_name" -> uuid

  for (const conv of conversations) {
    const conversationId = conversationMap.get(conv.conversation_id);
    if (!conversationId) continue;

    const speakerColors = conv.metadata.speaker_colors || {};

    for (const [speakerName, colors] of Object.entries(speakerColors)) {
      const { data, error } = await supabase
        .from('anthology_speakers')
        .insert({
          name: speakerName,
          conversation_id: conversationId,
          circle_color: colors.circle,
          faded_circle_color: colors.fadedCircle,
          quote_rectangle_color: colors.quoteRectangle,
          faded_quote_rectangle_color: colors.fadedQuoteRectangle,
          quote_text_color: colors.quoteText,
          faded_quote_text_color: colors.fadedQuoteText
        })
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Failed to insert speaker ${speakerName}:`, error);
        continue;
      }

      speakerMap.set(`${conv.conversation_id}:${speakerName}`, data.id);
      console.log(`   ✅ ${speakerName} (${conv.metadata.title})`);
    }
  }

  return speakerMap;
}

async function migrateQuestions(
  questions: JsonQuestion[],
  conversationMap: Map<string, string>,
  responses: JsonResponse[],
  supabase: any
) {
  console.log('\n❓ Migrating questions...');

  const questionMap = new Map<string, string>(); // legacy_id -> uuid

  for (const q of questions) {
    // Find conversation by looking at first related response
    const firstResponseId = q.related_responses[0];
    const firstResponse = responses.find(r => r.id === firstResponseId);

    if (!firstResponse) {
      console.warn(`   ⚠️  No responses found for question ${q.id}, skipping`);
      continue;
    }

    const conversationId = conversationMap.get(firstResponse.conversation_id);

    if (!conversationId) {
      console.warn(`   ⚠️  Conversation not found for question ${q.id}`);
      continue;
    }

    const { data, error } = await supabase
      .from('anthology_questions')
      .insert({
        legacy_id: q.id,
        conversation_id: conversationId,
        question_text: q.question_text,
        facilitator: q.facilitator,
        notes: q.notes,
        metadata: {
          related_responses: q.related_responses,
          source: 'json_migration'
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to insert question ${q.id}:`, error);
      continue;
    }

    questionMap.set(q.id, data.id);
    console.log(`   ✅ ${q.question_text.substring(0, 50)}...`);
  }

  return questionMap;
}

async function migrateResponses(
  responses: JsonResponse[],
  conversationMap: Map<string, string>,
  speakerMap: Map<string, string>,
  questionMap: Map<string, string>,
  recordingMap: Map<string, string>,
  conversations: JsonConversation[],
  supabase: any
) {
  console.log('\n💬 Migrating responses...');

  const responseMap = new Map<string, string>(); // legacy_id -> uuid
  let skippedPrompts = 0;

  for (const r of responses) {
    // Skip prompt nodes (they're not displayed)
    if (r.type === 'prompt') {
      skippedPrompts++;
      continue;
    }

    const conversationId = conversationMap.get(r.conversation_id);
    const speakerId = speakerMap.get(`${r.conversation_id}:${r.speaker_name}`);

    // Determine what this responds to
    let respondsToQuestionId: string | null = null;
    let respondsToResponseId: string | null = null;

    // Handle both string and array formats for responds_to
    const respondsTo = Array.isArray(r.responds_to) ? r.responds_to[0] : r.responds_to;

    if (respondsTo && typeof respondsTo === 'string') {
      if (respondsTo.startsWith('q_')) {
        respondsToQuestionId = questionMap.get(respondsTo) || null;
      } else if (respondsTo.startsWith('r_')) {
        respondsToResponseId = responseMap.get(respondsTo) || null;
      }
    }

    // Find the recording for this conversation
    const conv = conversations.find(c => c.conversation_id === r.conversation_id);
    const recordingId = conv ? recordingMap.get(conv.audio_file) : null;

    const { data, error } = await supabase
      .from('anthology_responses')
      .insert({
        legacy_id: r.id,
        conversation_id: conversationId,
        responds_to_question_id: respondsToQuestionId,
        responds_to_response_id: respondsToResponseId,
        speaker_id: speakerId,
        speaker_name: r.speaker_name,
        speaker_text: r.speaker_text,
        pull_quote: r.pull_quote,
        recording_id: recordingId,
        audio_start_ms: r.audio_start,
        audio_end_ms: r.audio_end,
        turn_number: r.turn_number,
        metadata: {
          source: 'json_migration'
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to insert response ${r.id}:`, error);
      continue;
    }

    responseMap.set(r.id, data.id);
    console.log(`   ✅ ${r.id} by ${r.speaker_name}`);

    // Migrate word timestamps if they exist
    if (r.word_timestamps && r.word_timestamps.length > 0) {
      await migrateWordTimestamps(r.word_timestamps, data.id, supabase);
    }
  }

  if (skippedPrompts > 0) {
    console.log(`   ℹ️  Skipped ${skippedPrompts} prompt nodes (not displayed)`);
  }

  return responseMap;
}

async function migrateWordTimestamps(
  words: JsonResponse['word_timestamps'],
  responseId: string,
  supabase: any
) {
  if (!words || words.length === 0) return;

  const wordData = words.map((w, index) => ({
    response_id: responseId,
    text: w.text,
    start_ms: w.start,
    end_ms: w.end,
    confidence: w.confidence,
    speaker: w.speaker,
    word_order: index
  }));

  // Insert in batches of 1000 to avoid payload size limits
  const batchSize = 1000;
  for (let i = 0; i < wordData.length; i += batchSize) {
    const batch = wordData.slice(i, i + batchSize);
    const { error } = await supabase
      .from('anthology_word_timestamps')
      .insert(batch);

    if (error) {
      console.error(`   ⚠️  Failed to insert word timestamps batch ${i}-${i + batch.length}:`, error);
    }
  }

  console.log(`   📝 Migrated ${wordData.length} word timestamps for response`);
}

// ============================================
// MAIN MIGRATION
// ============================================

async function migrate(jsonFilePath: string) {
  // Load environment variables first
  await loadEnv();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://enokfgiwbgianwblplcn.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
    console.error('   Set it in your .env file or pass it directly');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🚀 Starting migration from JSON to Supabase...\n');
  console.log(`📄 Source: ${jsonFilePath}`);
  console.log(`🗄️  Target: ${SUPABASE_URL}\n`);

  try {
    // Load JSON data
    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
    const jsonData: JsonData = JSON.parse(jsonContent);

    console.log(`📊 Found:`);
    console.log(`   - ${jsonData.conversations.length} conversations`);
    console.log(`   - ${jsonData.questions.length} questions`);
    console.log(`   - ${jsonData.responses.length} responses`);

    // Step 1: Migrate recordings
    const recordingMap = await migrateRecordings(jsonData.conversations, supabase);

    // Step 2: Migrate conversations
    const conversationMap = await migrateConversations(jsonData.conversations, recordingMap, supabase);

    // Step 3: Migrate speakers
    const speakerMap = await migrateSpeakers(jsonData.conversations, conversationMap, supabase);

    // Step 4: Migrate questions
    const questionMap = await migrateQuestions(jsonData.questions, conversationMap, jsonData.responses, supabase);

    // Step 5: Migrate responses
    const responseMap = await migrateResponses(
      jsonData.responses,
      conversationMap,
      speakerMap,
      questionMap,
      recordingMap,
      jsonData.conversations,
      supabase
    );

    console.log('\n\n✅ Migration complete!');
    console.log('\n📊 Summary:');
    console.log(`   - ${recordingMap.size} recordings`);
    console.log(`   - ${conversationMap.size} conversations`);
    console.log(`   - ${speakerMap.size} speakers`);
    console.log(`   - ${questionMap.size} questions`);
    console.log(`   - ${responseMap.size} responses`);

    console.log('\n🎯 Next steps:');
    console.log('   1. Verify data in Supabase dashboard');
    console.log('   2. Update App.tsx to use GraphDataService');
    console.log('   3. Test your application!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// ============================================
// CLI EXECUTION
// ============================================

const args = process.argv.slice(2);
const jsonPath = args[0] || './anthology-app/public/6798_phase2_3_template.json';

migrate(jsonPath);

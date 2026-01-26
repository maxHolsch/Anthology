/**
 * Migration Script: JSON to Supabase SQL
 *
 * Converts anthology_template.json format to Supabase database
 * Handles the new recording-per-node architecture
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// ============================================
// TYPES
// ============================================

interface JsonRecording {
  audio_file: string;
  duration: number;
}

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
  type: 'response';
  id: string;
  responds_to: string;
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

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function migrateRecordings(conversations: JsonConversation[]) {
  console.log('\n📀 Migrating recordings...');

  const recordingMap = new Map<string, string>(); // audio_file -> uuid

  for (const conv of conversations) {
    const { audio_file, duration } = conv;

    if (recordingMap.has(audio_file)) {
      continue; // Already migrated
    }

    const fileName = path.basename(audio_file);

    const { data, error } = await supabase
      .from('recordings')
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
  recordingMap: Map<string, string>
) {
  console.log('\n💬 Migrating conversations...');

  const conversationMap = new Map<string, string>(); // legacy_id -> uuid

  for (const conv of conversations) {
    const { conversation_id, metadata, color } = conv;

    const { data, error } = await supabase
      .from('conversations')
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
        .from('conversation_recordings')
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
  conversationMap: Map<string, string>
) {
  console.log('\n👥 Migrating speakers...');

  const speakerMap = new Map<string, string>(); // "conv_id:speaker_name" -> uuid

  for (const conv of conversations) {
    const conversationId = conversationMap.get(conv.conversation_id);
    if (!conversationId) continue;

    const speakerColors = conv.metadata.speaker_colors || {};

    for (const [speakerName, colors] of Object.entries(speakerColors)) {
      const { data, error } = await supabase
        .from('speakers')
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
  conversationMap: Map<string, string>
) {
  console.log('\n❓ Migrating questions...');

  const questionMap = new Map<string, string>(); // legacy_id -> uuid

  for (const q of questions) {
    // Find the conversation this question belongs to by checking responses
    // This assumes the first related response will tell us the conversation
    const firstResponseId = q.related_responses[0];

    const { data: responseData } = await supabase
      .from('responses')
      .select('conversation_id')
      .eq('legacy_id', firstResponseId)
      .single();

    const conversationId = responseData?.conversation_id;

    const { data, error } = await supabase
      .from('questions')
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
  conversations: JsonConversation[]
) {
  console.log('\n💬 Migrating responses...');

  const responseMap = new Map<string, string>(); // legacy_id -> uuid

  for (const r of responses) {
    const conversationId = conversationMap.get(r.conversation_id);
    const speakerId = speakerMap.get(`${r.conversation_id}:${r.speaker_name}`);

    // Determine what this responds to
    let respondsToQuestionId = null;
    let respondsToResponseId = null;

    if (r.responds_to.startsWith('q_')) {
      respondsToQuestionId = questionMap.get(r.responds_to);
    } else if (r.responds_to.startsWith('r_')) {
      respondsToResponseId = responseMap.get(r.responds_to);
    }

    // Find the recording for this conversation
    const conv = conversations.find(c => c.conversation_id === r.conversation_id);
    const recordingId = conv ? recordingMap.get(conv.audio_file) : null;

    const { data, error } = await supabase
      .from('responses')
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
      await migrateWordTimestamps(r.word_timestamps, data.id);
    }
  }

  return responseMap;
}

async function migrateWordTimestamps(
  words: JsonResponse['word_timestamps'],
  responseId: string
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
      .from('word_timestamps')
      .insert(batch);

    if (error) {
      console.error(`   ⚠️  Failed to insert word timestamps batch ${i}-${i + batch.length}:`, error);
    }
  }

  console.log(`   📝 Migrated ${wordData.length} word timestamps`);
}

// ============================================
// MAIN MIGRATION
// ============================================

async function migrate(jsonFilePath: string) {
  console.log('🚀 Starting migration from JSON to Supabase...\n');
  console.log(`📄 Source: ${jsonFilePath}`);

  try {
    // Load JSON data
    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
    const jsonData: JsonData = JSON.parse(jsonContent);

    console.log(`\n📊 Found:`);
    console.log(`   - ${jsonData.conversations.length} conversations`);
    console.log(`   - ${jsonData.questions.length} questions`);
    console.log(`   - ${jsonData.responses.length} responses`);

    // Step 1: Migrate recordings
    const recordingMap = await migrateRecordings(jsonData.conversations);

    // Step 2: Migrate conversations
    const conversationMap = await migrateConversations(jsonData.conversations, recordingMap);

    // Step 3: Migrate speakers
    const speakerMap = await migrateSpeakers(jsonData.conversations, conversationMap);

    // Step 4: Migrate questions (needs to be after responses to find conversation)
    // Actually, we need to do this differently - questions should reference conversation directly

    // Step 5: Migrate responses
    const responseMap = await migrateResponses(
      jsonData.responses,
      conversationMap,
      speakerMap,
      new Map(), // Empty question map for first pass
      recordingMap,
      jsonData.conversations
    );

    // Step 6: Now migrate questions with proper conversation references
    const questionMap = await migrateQuestions(jsonData.questions, conversationMap);

    // Step 7: Update responses to link to questions
    console.log('\n🔗 Updating response → question relationships...');
    for (const r of jsonData.responses) {
      if (r.responds_to.startsWith('q_')) {
        const responseId = responseMap.get(r.id);
        const questionId = questionMap.get(r.responds_to);

        if (responseId && questionId) {
          await supabase
            .from('responses')
            .update({ responds_to_question_id: questionId })
            .eq('id', responseId);
        }
      }
    }

    console.log('\n\n✅ Migration complete!');
    console.log('\n📊 Summary:');
    console.log(`   - ${recordingMap.size} recordings`);
    console.log(`   - ${conversationMap.size} conversations`);
    console.log(`   - ${speakerMap.size} speakers`);
    console.log(`   - ${questionMap.size} questions`);
    console.log(`   - ${responseMap.size} responses`);

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

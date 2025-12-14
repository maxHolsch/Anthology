/**
 * Backfill Script: JSON -> anthology_word_timestamps (Prefixed Tables)
 *
 * Purpose:
 * - Only backfill karaoke word timestamps for ALREADY-EXISTING responses.
 * - Finds responses by `legacy_id` (e.g. "r_002").
 * - Deletes existing timestamps for that response_id, then inserts from JSON.
 *
 * Usage:
 *   npx --yes tsx database/backfill_word_timestamps_prefixed.ts anthology-app/public/6798_phase2_3_template.json
 *   npx --yes tsx database/backfill_word_timestamps_prefixed.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// --------------------------------------------
// Env loading (mirrors migrate_json_to_sql_prefixed.ts)
// --------------------------------------------

async function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), 'anthology-app/.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) return;
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    console.warn('⚠️  Could not load .env file from anthology-app/.env');
  }
}

// --------------------------------------------
// Types (subset of your JSON format)
// --------------------------------------------

type JsonWordTimestamp = {
  text: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
};

type JsonResponse = {
  type: 'response' | 'prompt';
  id: string;
  word_timestamps?: JsonWordTimestamp[];
};

type JsonData = {
  responses?: JsonResponse[];
};

// --------------------------------------------
// Helpers
// --------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const jsonPath = args.find((a) => !a.startsWith('--')) || './anthology-app/public/6798_phase2_3_template.json';
  return {
    jsonPath,
    dryRun: flags.has('--dry-run'),
  };
}

async function main() {
  const { jsonPath, dryRun } = parseArgs(process.argv);

  await loadEnv();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://enokfgiwbgianwblplcn.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
    console.error('   Put it in anthology-app/.env (not VITE-prefixed)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('🎤 Backfilling karaoke word timestamps (prefixed tables)');
  console.log(`📄 Source: ${jsonPath}`);
  console.log(`🗄️  Target: ${SUPABASE_URL}`);
  console.log(`🧪 Mode: ${dryRun ? 'DRY RUN (no writes)' : 'WRITE'}`);

  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const jsonData: JsonData = JSON.parse(jsonContent);

  const responses = (jsonData.responses ?? []).filter(
    (r) => r.type !== 'prompt' && Array.isArray(r.word_timestamps) && r.word_timestamps.length > 0
  );

  console.log(`\n📊 Found ${responses.length} responses with word timestamps in JSON`);

  const legacyIds = responses.map((r) => r.id);

  // Fetch existing response UUIDs by legacy_id in chunks (Supabase IN() limits)
  const legacyToUuid = new Map<string, string>();
  const fetchChunks = chunk(legacyIds, 200);
  for (const [idx, ids] of fetchChunks.entries()) {
    const { data, error } = await supabase
      .from('anthology_responses')
      .select('id, legacy_id')
      .in('legacy_id', ids);

    if (error) {
      console.error(`❌ Failed fetching response ids for chunk ${idx + 1}/${fetchChunks.length}:`, error);
      process.exit(1);
    }

    for (const row of data ?? []) {
      if (row?.legacy_id && row?.id) {
        legacyToUuid.set(row.legacy_id, row.id);
      }
    }
  }

  const missing = legacyIds.filter((id) => !legacyToUuid.has(id));
  if (missing.length > 0) {
    console.warn(`\n⚠️  ${missing.length} responses exist in JSON but were not found in DB by legacy_id.`);
    console.warn('    First 20 missing:', missing.slice(0, 20).join(', '));
  }

  let totalWordsProcessed = 0;
  let totalResponsesProcessed = 0;
  let totalResponsesSkippedMissing = 0;

  for (const r of responses) {
    const responseUuid = legacyToUuid.get(r.id);
    if (!responseUuid) {
      totalResponsesSkippedMissing += 1;
      continue;
    }

    const words = r.word_timestamps ?? [];

    if (dryRun) {
      totalResponsesProcessed += 1;
      totalWordsProcessed += words.length;
      continue;
    }

    console.log(`\n🔄 ${r.id}: replacing ${words.length} word timestamps...`);

    // Delete existing timestamps for this response
    const { error: deleteError } = await supabase
      .from('anthology_word_timestamps')
      .delete()
      .eq('response_id', responseUuid);

    if (deleteError) {
      console.error(`   ❌ Failed deleting existing word timestamps for ${r.id}:`, deleteError);
      continue;
    }

    const rows = words.map((w, index) => ({
      response_id: responseUuid,
      text: w.text,
      start_ms: w.start,
      end_ms: w.end,
      confidence: typeof w.confidence === 'number' ? w.confidence : null,
      speaker: w.speaker ?? null,
      word_order: index,
    }));

    // Insert in batches of 1000 to avoid payload size limits
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from('anthology_word_timestamps').insert(batch);
      if (insertError) {
        console.error(`   ⚠️  Insert failed for ${r.id} batch ${i}-${i + batch.length}:`, insertError);
        break;
      }
    }

    totalResponsesProcessed += 1;
    totalWordsProcessed += rows.length;
    console.log(`   ✅ ${r.id}: inserted ${rows.length} words`);
  }

  console.log('\n✅ Backfill complete');
  console.log(`   - Responses processed: ${totalResponsesProcessed}`);
  console.log(`   - Responses skipped (missing in DB): ${totalResponsesSkippedMissing}`);
  console.log(`   - Word timestamps processed: ${totalWordsProcessed}`);
  console.log('\n🔎 Suggested verification (Supabase SQL editor):');
  console.log(
    "   select r.legacy_id, count(w.id) as words\n" +
      "   from anthology_responses r\n" +
      "   left join anthology_word_timestamps w on w.response_id = r.id\n" +
      "   where r.legacy_id = 'r_002'\n" +
      "   group by r.legacy_id;"
  );
}

main().catch((err) => {
  console.error('❌ Backfill script failed:', err);
  process.exit(1);
});

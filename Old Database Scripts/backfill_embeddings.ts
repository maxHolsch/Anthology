/**
 * Backfill Script: Generate embeddings for existing responses
 *
 * Purpose:
 * - Generate OpenAI embeddings for responses that don't have them
 * - Store embeddings in the anthology_responses.embedding column
 *
 * Usage:
 *   npx --yes tsx database/backfill_embeddings.ts
 *   npx --yes tsx database/backfill_embeddings.ts --anthology-slug=my-anthology
 *   npx --yes tsx database/backfill_embeddings.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// --------------------------------------------
// Env loading
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
// OpenAI Embeddings
// --------------------------------------------

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const EMBEDDINGS_MODEL = 'text-embedding-3-small';
const EMBEDDINGS_DIMENSIONS = 1536;
const EMBEDDINGS_BATCH_SIZE = 100;

type EmbeddingResult = {
  embedding: number[];
  index: number;
};

async function generateEmbeddings(
  apiKey: string,
  texts: string[],
  timeoutMs: number = 30_000
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += EMBEDDINGS_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDINGS_BATCH_SIZE);
    console.log(`   📊 Processing batch ${Math.floor(i / EMBEDDINGS_BATCH_SIZE) + 1}/${Math.ceil(texts.length / EMBEDDINGS_BATCH_SIZE)} (${batch.length} texts)`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(`${OPENAI_API_BASE}/embeddings`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBEDDINGS_MODEL,
          input: batch,
          dimensions: EMBEDDINGS_DIMENSIONS,
        }),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(`OpenAI embeddings request failed (${resp.status}): ${msg}`);
      }

      const json = (await resp.json()) as { data: EmbeddingResult[]; usage?: { total_tokens: number } };
      const data = json.data;

      for (const item of data) {
        allEmbeddings[i + item.index] = item.embedding;
      }

      console.log(`   ✅ Batch complete (${json.usage?.total_tokens || 'N/A'} tokens used)`);
    } finally {
      clearTimeout(timeout);
    }
  }

  return allEmbeddings;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
  const anthologySlug =
    args.find((a) => a.startsWith('--anthology-slug='))?.split('=')[1] ||
    process.env.ANTHOLOGY_SLUG ||
    'default';
  const batchSize = parseInt(
    args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '50',
    10
  );
  return {
    dryRun: flags.has('--dry-run'),
    anthologySlug: anthologySlug.trim(),
    batchSize,
  };
}

// --------------------------------------------
// Main
// --------------------------------------------

async function main() {
  const { dryRun, anthologySlug, batchSize } = parseArgs(process.argv);

  await loadEnv();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variable');
    console.error('   Put them in anthology-app/.env');
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY environment variable');
    console.error('   Put it in anthology-app/.env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('🧠 Backfilling response embeddings');
  console.log(`🗄️  Target: ${SUPABASE_URL}`);
  console.log(`🏷️  Anthology: ${anthologySlug}`);
  console.log(`🧪 Mode: ${dryRun ? 'DRY RUN (no writes)' : 'WRITE'}`);
  console.log(`📦 Batch size: ${batchSize}`);

  // Get anthology ID
  const { data: anthology, error: anthologyErr } = await supabase
    .from('anthology_anthologies')
    .select('id, slug, title')
    .eq('slug', anthologySlug)
    .maybeSingle();

  if (anthologyErr) {
    console.error('❌ Error fetching anthology:', anthologyErr);
    process.exit(1);
  }

  if (!anthology) {
    console.error(`❌ Anthology "${anthologySlug}" not found`);
    process.exit(1);
  }

  console.log(`\n📚 Found anthology: ${anthology.title} (${anthology.id})`);

  // Fetch responses without embeddings
  // Note: pgvector column may not be null-checkable via PostgREST in all versions
  // We'll fetch all and filter client-side
  const { data: allResponses, error: respErr } = await supabase
    .from('anthology_responses')
    .select('id, legacy_id, speaker_text, embedding')
    .eq('anthology_id', anthology.id)
    .order('turn_number');

  if (respErr) {
    console.error('❌ Error fetching responses:', respErr);
    process.exit(1);
  }

  // Filter responses without embeddings
  const responsesWithoutEmbeddings = (allResponses || []).filter((r: any) => {
    // embedding might be null, undefined, or an empty string
    return !r.embedding || r.embedding === '' || r.embedding === '[]';
  });

  console.log(`\n📊 Found ${allResponses?.length || 0} total responses`);
  console.log(`📊 Found ${responsesWithoutEmbeddings.length} responses without embeddings`);

  if (responsesWithoutEmbeddings.length === 0) {
    console.log('\n✅ All responses already have embeddings!');
    return;
  }

  let totalProcessed = 0;
  let totalFailed = 0;

  // Process in batches
  for (let i = 0; i < responsesWithoutEmbeddings.length; i += batchSize) {
    const batch = responsesWithoutEmbeddings.slice(i, i + batchSize);
    console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(responsesWithoutEmbeddings.length / batchSize)}`);
    console.log(`   Responses: ${batch.map((r: any) => r.legacy_id || r.id.slice(0, 8)).join(', ')}`);

    if (dryRun) {
      console.log('   [DRY RUN] Would generate embeddings for these responses');
      totalProcessed += batch.length;
      continue;
    }

    // Extract texts for embedding - filter out empty texts
    const textsWithIndices = batch
      .map((r: any, idx: number) => ({ text: (r.speaker_text || '').trim(), idx }))
      .filter((t) => t.text.length > 0);

    if (textsWithIndices.length === 0) {
      console.log('   ⚠️  All texts in batch are empty, skipping');
      continue;
    }

    const texts = textsWithIndices.map((t) => t.text);

    try {
      // Generate embeddings
      const embeddings = await generateEmbeddings(OPENAI_API_KEY, texts);

      // Map embeddings back to original batch indices
      const embeddingsByIdx = new Map<number, number[]>();
      textsWithIndices.forEach((t, i) => {
        embeddingsByIdx.set(t.idx, embeddings[i]);
      });

      // Update each response with its embedding
      for (let j = 0; j < batch.length; j++) {
        const response = batch[j] as any;
        const embedding = embeddingsByIdx.get(j);

        if (!embedding || embedding.length === 0) {
          // Check if this was an empty text that we skipped
          const text = (response.speaker_text || '').trim();
          if (text.length === 0) {
            console.log(`   ℹ️  Skipping empty text for ${response.legacy_id || response.id}`);
          } else {
            console.warn(`   ⚠️  No embedding generated for ${response.legacy_id || response.id}`);
            totalFailed++;
          }
          continue;
        }

        // Format as PostgreSQL vector string
        const vectorStr = `[${embedding.join(',')}]`;

        const { error: updateErr } = await supabase
          .from('anthology_responses')
          .update({ embedding: vectorStr })
          .eq('id', response.id);

        if (updateErr) {
          console.error(`   ❌ Failed to update ${response.legacy_id || response.id}:`, updateErr.message);
          totalFailed++;
        } else {
          totalProcessed++;
        }
      }

      console.log(`   ✅ Batch complete: ${batch.length - totalFailed} updated`);
    } catch (err) {
      console.error(`   ❌ Batch failed:`, err instanceof Error ? err.message : err);
      totalFailed += batch.length;
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < responsesWithoutEmbeddings.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log('\n✅ Backfill complete');
  console.log(`   - Responses processed: ${totalProcessed}`);
  console.log(`   - Responses failed: ${totalFailed}`);

  console.log('\n🔎 Verification query (Supabase SQL editor):');
  console.log(
    `   SELECT COUNT(*) as total,\n` +
    `          COUNT(embedding) as with_embedding,\n` +
    `          COUNT(*) - COUNT(embedding) as without_embedding\n` +
    `   FROM anthology_responses\n` +
    `   WHERE anthology_id = '${anthology.id}';`
  );
}

main().catch((err) => {
  console.error('❌ Backfill script failed:', err);
  process.exit(1);
});

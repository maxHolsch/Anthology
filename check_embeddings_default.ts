
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually since we are running with tsx
function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), 'anthology-app/.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            envContent.split('\n').forEach((line) => {
                const match = line.match(/^([^#=]+)=(.*)$/);
                if (match) {
                    process.env[match[1].trim()] = match[2].trim();
                }
            });
        }
    } catch (e) {
        console.error('Error loading .env', e);
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmbeddings() {
    console.log("Checking embedding coverage for 'default' anthology...");

    // 1. Get anthology ID for 'default'
    const { data: anthology, error: anthError } = await supabase
        .from('anthology_anthologies')
        .select('id')
        .eq('slug', 'default')
        .single();

    if (anthError || !anthology) {
        console.error("Error finding 'default' anthology:", anthError);
        return;
    }

    const anthologyId = anthology.id;
    console.log(`Anthology ID: ${anthologyId}`);

    // 2. Count responses in this anthology
    const { data: responses, error: respError } = await supabase
        .from('anthology_responses')
        .select('id, embedding')
        .eq('anthology_id', anthologyId);

    if (respError) {
        console.error('Error fetching responses:', respError);
        return;
    }

    const total = responses.length;
    const withEmbedding = responses.filter(r => r.embedding && r.embedding.length > 0).length;
    const withoutEmbedding = total - withEmbedding;

    console.log(`Total Responses (default): ${total}`);
    console.log(`With Embeddings: ${withEmbedding}`);
    console.log(`Without Embeddings: ${withoutEmbedding}`);

    if (withoutEmbedding > 0) {
        console.log('⚠️  FAIL: Even in "default", some responses are missing embeddings.');
    } else {
        console.log('✅ PASS: All responses in "default" have embeddings.');
    }
}

checkEmbeddings();

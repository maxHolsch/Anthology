/**
 * Upload Audio Recordings to Supabase Storage
 *
 * This script:
 * 1. Uploads audio files from local recordings folder to Supabase Storage
 * 2. Updates the anthology_recordings table with the new Storage URLs
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

async function uploadRecordings() {
  await loadEnv();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://enokfgiwbgianwblplcn.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🚀 Starting upload to Supabase Storage...\n');

  try {
    // List all buckets to verify 'recordings' exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      process.exit(1);
    }

    console.log('📦 Available buckets:', buckets.map(b => b.name).join(', '));

    const recordingsBucket = buckets.find(b => b.name === 'Recordings');
    if (!recordingsBucket) {
      console.error('❌ Bucket "Recordings" not found!');
      console.error('   Please create it in Supabase Dashboard → Storage');
      console.error('   Make sure to set it as PUBLIC');
      process.exit(1);
    }

    console.log('✅ Found "Recordings" bucket\n');

    // Get all recordings from database
    const { data: recordings, error: fetchError } = await supabase
      .from('anthology_recordings')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching recordings:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Found ${recordings.length} recordings to upload\n`);

    for (const recording of recordings) {
      const localPath = recording.file_path;
      const fileName = recording.file_name;

      // Construct full local path
      const fullLocalPath = path.join(process.cwd(), 'anthology-app/public', localPath);

      console.log(`📤 Uploading ${fileName}...`);

      try {
        // Check if file exists
        await fs.access(fullLocalPath);

        // Read file
        const fileBuffer = await fs.readFile(fullLocalPath);

        // Upload to Supabase Storage with audio/mpeg content type
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('Recordings')
          .upload(fileName, fileBuffer, {
            contentType: 'audio/mpeg',
            upsert: true // Overwrite if already exists
          });

        if (uploadError) {
          console.error(`   ❌ Upload failed: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('Recordings')
          .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        // Update database with new URL
        const { error: updateError } = await supabase
          .from('anthology_recordings')
          .update({ file_path: publicUrl })
          .eq('id', recording.id);

        if (updateError) {
          console.error(`   ❌ Database update failed: ${updateError.message}`);
          continue;
        }

        console.log(`   ✅ Uploaded and updated: ${publicUrl}`);

      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.error(`   ⚠️  File not found: ${fullLocalPath}`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Upload complete!\n');
    console.log('🎯 Next steps:');
    console.log('   1. Verify files in Supabase Storage dashboard');
    console.log('   2. Test audio playback in your app');

  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

// Run the upload
uploadRecordings();

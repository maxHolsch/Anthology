/**
 * Delete and re-upload audio file with correct MIME type
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
    console.warn('⚠️  Could not load .env file');
  }
}

async function reupload() {
  await loadEnv();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://enokfgiwbgianwblplcn.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const fileName = '6798.mp3';
  const localPath = path.join(process.cwd(), 'anthology-app/public/recordings', fileName);

  console.log('🗑️  Deleting old file from Storage...');
  
  // Delete the old file
  const { error: deleteError } = await supabase.storage
    .from('Recordings')
    .remove([fileName]);

  if (deleteError) {
    console.log('   ⚠️  Delete error (file might not exist):', deleteError.message);
  } else {
    console.log('   ✅ Old file deleted');
  }

  console.log('\n📤 Re-uploading with correct MIME type...');

  // Read the file
  const fileBuffer = await fs.readFile(localPath);

  // Upload with audio/mpeg content type
  const { error: uploadError } = await supabase.storage
    .from('Recordings')
    .upload(fileName, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });

  if (uploadError) {
    console.error('❌ Upload failed:', uploadError);
    process.exit(1);
  }

  console.log('✅ File re-uploaded successfully!');
  console.log('\n🎯 Now refresh your browser and try playing audio');
}

reupload();

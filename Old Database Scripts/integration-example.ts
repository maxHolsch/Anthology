/**
 * Integration Example: Updating AnthologyStore to use Supabase
 *
 * This file shows how to modify your existing store to load data from Supabase
 * instead of static JSON files.
 */

import { GraphDataService } from '@/services/supabase';

// ============================================
// EXAMPLE 1: Update App.tsx to load from Supabase
// ============================================

/*
// BEFORE (loading from JSON):
import anthologyData from '../public/6798_phase2_3_template.json';

useEffect(() => {
  loadData(
    anthologyData.conversations,
    anthologyData.questions,
    anthologyData.responses,
    viewportWidth,
    viewportHeight
  );
}, []);

// AFTER (loading from Supabase):
import { GraphDataService } from '@/services/supabase';

useEffect(() => {
  async function loadGraphData() {
    setLoading(true);
    try {
      const data = await GraphDataService.loadAll();

      loadData(
        data.conversations,
        data.questions,
        data.responses,
        viewportWidth,
        viewportHeight
      );
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  loadGraphData();
}, [viewportWidth, viewportHeight]);
*/

// ============================================
// EXAMPLE 2: Add real-time updates to App.tsx
// ============================================

/*
useEffect(() => {
  // Subscribe to real-time updates
  const unsubscribe = GraphDataService.subscribeToUpdates(() => {
    console.log('Data updated, reloading...');
    // Reload data when changes occur
    GraphDataService.loadAll().then(data => {
      loadData(
        data.conversations,
        data.questions,
        data.responses,
        viewportWidth,
        viewportHeight
      );
    });
  });

  return () => {
    unsubscribe();
  };
}, []);
*/

// ============================================
// EXAMPLE 3: Environment Configuration
// ============================================

/*
// Create .env file in anthology-app/:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

// Then in your vite.config.ts, ensure env vars are loaded:
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // ... rest of config
  };
});
*/

// ============================================
// EXAMPLE 4: Hybrid Approach (Fallback to JSON)
// ============================================

/*
// This approach tries Supabase first, falls back to JSON if unavailable

import { GraphDataService } from '@/services/supabase';
import fallbackData from '../public/6798_phase2_3_template.json';

async function loadDataWithFallback() {
  setLoading(true);

  try {
    // Try loading from Supabase
    const data = await GraphDataService.loadAll();

    if (data.conversations.length > 0) {
      console.log('✅ Loaded data from Supabase');
      loadData(data.conversations, data.questions, data.responses, viewportWidth, viewportHeight);
      return;
    }
  } catch (error) {
    console.warn('⚠️  Supabase unavailable, using fallback JSON data');
  }

  // Fallback to JSON
  console.log('📄 Using local JSON data');
  loadData(
    fallbackData.conversations,
    fallbackData.questions,
    fallbackData.responses,
    viewportWidth,
    viewportHeight
  );

  setLoading(false);
}
*/

// ============================================
// EXAMPLE 5: Adding a new response with individual recording
// ============================================

/*
import { AdminService } from '@/services/supabase';

async function handleNewResponse(formData: FormData) {
  const conversationId = formData.get('conversationId') as string;
  const questionId = formData.get('questionId') as string;
  const speakerName = formData.get('speakerName') as string;
  const speakerText = formData.get('speakerText') as string;
  const pullQuote = formData.get('pullQuote') as string;
  const recordingFile = formData.get('recording') as File;

  // Get audio duration from file (you'll need a library for this)
  const audioDuration = await getAudioDuration(recordingFile);

  try {
    const response = await AdminService.addResponse({
      conversationId,
      questionId,
      speakerName,
      speakerText,
      pullQuote: pullQuote || undefined,
      recordingFile,
      audioStartMs: 0,
      audioEndMs: audioDuration
    });

    console.log('✅ Response added:', response);

    // Reload data to show new response
    const data = await GraphDataService.loadAll();
    loadData(data.conversations, data.questions, data.responses);

  } catch (error) {
    console.error('❌ Failed to add response:', error);
  }
}

// Helper function to get audio duration
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(audio.duration * 1000); // Convert to milliseconds
    };

    audio.onerror = () => {
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = window.URL.createObjectURL(file);
  });
}
*/

// ============================================
// EXAMPLE 6: Playing audio from individual recordings
// ============================================

/*
// Update your audio playback logic to handle individual recordings per node

import { ResponseService } from '@/services/supabase';

async function playResponse(responseId: string) {
  // Get response data with recording info
  const responses = await ResponseService.getByConversation(conversationId);
  const response = responses.find(r => r.id === responseId);

  if (!response) return;

  // Load the specific recording for this response
  const audioSrc = response.path_to_recording || response.audio_file;

  audio.src = audioSrc;
  audio.currentTime = (response.audio_start || 0) / 1000; // Convert to seconds

  audio.addEventListener('timeupdate', () => {
    const currentMs = audio.currentTime * 1000;

    // Stop at end of segment
    if (currentMs >= (response.audio_end || 0)) {
      audio.pause();
    }

    // Highlight current word
    highlightWordAtTime(currentMs, responseId);
  });

  audio.play();
}
*/

// ============================================
// EXAMPLE 7: Word-level highlighting with database timestamps
// ============================================

/*
import { ResponseService } from '@/services/supabase';
import { useState, useEffect } from 'react';

function useWordTimestamps(responseId: string) {
  const [words, setWords] = useState<WordTimestamp[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  useEffect(() => {
    async function loadWords() {
      const timestamps = await ResponseService.getWordTimestamps(responseId);
      setWords(timestamps);
    }

    loadWords();
  }, [responseId]);

  function updateCurrentWord(currentTimeMs: number) {
    const index = words.findIndex(
      w => currentTimeMs >= w.start && currentTimeMs < w.end
    );
    setCurrentWordIndex(index);
  }

  return { words, currentWordIndex, updateCurrentWord };
}

// Usage in component:
function ResponsePlayer({ responseId }: { responseId: string }) {
  const { words, currentWordIndex, updateCurrentWord } = useWordTimestamps(responseId);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentMs = audio.currentTime * 1000;
      updateCurrentWord(currentMs);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [updateCurrentWord]);

  return (
    <div>
      <audio ref={audioRef} src={audioSrc} />

      <div className="transcript">
        {words.map((word, index) => (
          <span
            key={index}
            className={index === currentWordIndex ? 'highlighted' : ''}
          >
            {word.text}{' '}
          </span>
        ))}
      </div>
    </div>
  );
}
*/

// ============================================
// EXAMPLE 8: Migration workflow
// ============================================

/*
// Step-by-step migration process:

1. Set up Supabase project
   - Go to https://supabase.com
   - Create new project
   - Save project URL and anon key

2. Create database schema
   - Open Supabase SQL Editor
   - Paste contents of database/schema.sql
   - Execute

3. Create storage bucket
   - Go to Storage in Supabase dashboard
   - Create bucket named "recordings"
   - Set to public access

4. Upload your recordings
   - Upload all MP3 files from ./recordings/ to the bucket
   - Note the public URLs

5. Run migration script
   npm install @supabase/supabase-js
   npx tsx database/migrate_json_to_sql.ts anthology-app/public/6798_phase2_3_template.json

6. Update environment variables
   - Create anthology-app/.env
   - Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

7. Update App.tsx
   - Replace JSON import with GraphDataService.loadAll()
   - Add error handling and loading states

8. Test the integration
   - npm run dev
   - Verify data loads correctly
   - Test audio playback
   - Verify node interactions

9. Optional: Keep JSON fallback
   - Use hybrid approach (Example 4) during transition
   - Remove JSON once confident in Supabase integration
*/

export {};

-- ============================================
-- ANTHOLOGY SUPABASE SCHEMA (Prefixed Tables)
-- ============================================
-- All tables prefixed with "anthology_"
-- Supports individual recordings per node
-- Designed for scalability and flexibility
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ANTHOLOGIES (top-level dataset partition)
-- ============================================

-- Anthologies: top-level collection of conversations ("a set of conversations")
CREATE TABLE anthology_anthologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (slug)
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Recordings: Audio files that can be linked to conversations or individual nodes
CREATE TABLE anthology_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Anthology partition (nullable to allow shared recordings if needed)
    anthology_id UUID REFERENCES anthology_anthologies(id) ON DELETE SET NULL,

    -- File information
    file_path TEXT NOT NULL, -- e.g., "recordings/6798.mp3" or Supabase Storage URL
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT DEFAULT 'audio/mpeg',

    -- Audio metadata
    duration_ms INTEGER NOT NULL, -- Duration in milliseconds
    sample_rate INTEGER,
    bit_rate INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}', -- Flexible storage for additional data

    CONSTRAINT positive_duration CHECK (duration_ms > 0)
);

-- Conversations: Discussion sessions that group questions and responses
CREATE TABLE anthology_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Anthology partition
    anthology_id UUID NOT NULL REFERENCES anthology_anthologies(id) ON DELETE RESTRICT,

    -- Identifiers
    legacy_id TEXT, -- e.g., "conv_ca766496" from JSON

    -- Basic info
    title TEXT NOT NULL,
    date DATE,
    location TEXT,
    facilitator TEXT,

    -- Visual
    color TEXT DEFAULT '#4A90E2', -- Hex color for visualization

    -- Metadata
    topics TEXT[], -- Array of topic strings
    participants TEXT[], -- Array of participant names
    source_transcript TEXT, -- Path to original transcript
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- legacy_id may repeat across different anthologies
CREATE UNIQUE INDEX idx_anthology_conversations_anthology_legacy_id
  ON anthology_conversations(anthology_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

-- Conversation Recordings: Link conversations to their primary/related recordings
CREATE TABLE anthology_conversation_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES anthology_conversations(id) ON DELETE CASCADE,
    recording_id UUID NOT NULL REFERENCES anthology_recordings(id) ON DELETE CASCADE,

    -- Relationship type
    is_primary BOOLEAN DEFAULT FALSE, -- Main recording for the conversation
    recording_order INTEGER, -- For multiple recordings in sequence

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(conversation_id, recording_id)
);

-- Speakers: Participants with color assignments
CREATE TABLE anthology_speakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Anthology partition (denormalized for easy filtering / RLS)
    anthology_id UUID NOT NULL REFERENCES anthology_anthologies(id) ON DELETE RESTRICT,

    -- Identity
    name TEXT NOT NULL,
    conversation_id UUID REFERENCES anthology_conversations(id) ON DELETE CASCADE,

    -- Visual colors (from Design.md color system)
    circle_color TEXT NOT NULL,
    faded_circle_color TEXT NOT NULL,
    quote_rectangle_color TEXT NOT NULL,
    faded_quote_rectangle_color TEXT NOT NULL,
    quote_text_color TEXT NOT NULL,
    faded_quote_text_color TEXT NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(name, conversation_id)
);

-- Questions: Question nodes in the visualization
CREATE TABLE anthology_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Anthology partition (denormalized for easy filtering / unique legacy_id per anthology)
    anthology_id UUID NOT NULL REFERENCES anthology_anthologies(id) ON DELETE RESTRICT,

    -- Identifiers
    legacy_id TEXT, -- e.g., "q_001" from JSON
    conversation_id UUID NOT NULL REFERENCES anthology_conversations(id) ON DELETE CASCADE,

    -- Content
    question_text TEXT NOT NULL,
    facilitator TEXT,

    -- Optional audio (questions can now have their own recordings)
    recording_id UUID REFERENCES anthology_recordings(id) ON DELETE SET NULL,
    audio_start_ms INTEGER,
    audio_end_ms INTEGER,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_audio_range CHECK (
        (recording_id IS NULL AND audio_start_ms IS NULL AND audio_end_ms IS NULL) OR
        (recording_id IS NOT NULL AND audio_start_ms IS NOT NULL AND audio_end_ms IS NOT NULL AND audio_start_ms < audio_end_ms)
    )
);

CREATE UNIQUE INDEX idx_anthology_questions_anthology_legacy_id
  ON anthology_questions(anthology_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

-- Responses: Response nodes in the visualization
CREATE TABLE anthology_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Anthology partition (denormalized for easy filtering / unique legacy_id per anthology)
    anthology_id UUID NOT NULL REFERENCES anthology_anthologies(id) ON DELETE RESTRICT,

    -- Identifiers
    legacy_id TEXT, -- e.g., "r_002" from JSON
    conversation_id UUID NOT NULL REFERENCES anthology_conversations(id) ON DELETE CASCADE,

    -- Relationships
    responds_to_question_id UUID REFERENCES anthology_questions(id) ON DELETE SET NULL,
    responds_to_response_id UUID REFERENCES anthology_responses(id) ON DELETE SET NULL,

    -- Speaker
    speaker_id UUID REFERENCES anthology_speakers(id) ON DELETE SET NULL,
    speaker_name TEXT NOT NULL, -- Denormalized for performance

    -- Content
    speaker_text TEXT NOT NULL,
    pull_quote TEXT, -- Optional featured excerpt for rectangle visualization

    -- Audio (NOW EACH RESPONSE CAN HAVE ITS OWN RECORDING)
    recording_id UUID REFERENCES anthology_recordings(id) ON DELETE SET NULL,
    audio_start_ms INTEGER,
    audio_end_ms INTEGER,

    -- Response characteristics
    medium TEXT CHECK (medium IN ('audio', 'text')), -- Type of response: audio or text
    synchronicity TEXT CHECK (synchronicity IN ('sync', 'asynchronous')), -- Synchronicity: sync or asynchronous

    -- Metadata
    turn_number INTEGER, -- Order in conversation
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT responds_to_one CHECK (
        (responds_to_question_id IS NOT NULL AND responds_to_response_id IS NULL) OR
        (responds_to_question_id IS NULL AND responds_to_response_id IS NOT NULL)
    ),
    CONSTRAINT valid_audio_range CHECK (
        (recording_id IS NULL AND audio_start_ms IS NULL AND audio_end_ms IS NULL) OR
        (recording_id IS NOT NULL AND audio_start_ms IS NOT NULL AND audio_end_ms IS NOT NULL AND audio_start_ms < audio_end_ms)
    )
);

CREATE UNIQUE INDEX idx_anthology_responses_anthology_legacy_id
  ON anthology_responses(anthology_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

-- Word Timestamps: For karaoke-style highlighting (Design.md line 158)
CREATE TABLE anthology_word_timestamps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parent relationship (can belong to question or response)
    response_id UUID REFERENCES anthology_responses(id) ON DELETE CASCADE,
    question_id UUID REFERENCES anthology_questions(id) ON DELETE CASCADE,

    -- Word data
    text TEXT NOT NULL,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    speaker TEXT,

    -- Position in sequence
    word_order INTEGER NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT belongs_to_one CHECK (
        (response_id IS NOT NULL AND question_id IS NULL) OR
        (response_id IS NULL AND question_id IS NOT NULL)
    ),
    CONSTRAINT valid_time_range CHECK (start_ms < end_ms)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Anthologies
CREATE INDEX idx_anthology_anthologies_created_at ON anthology_anthologies(created_at DESC);

-- Recordings
CREATE INDEX idx_anthology_recordings_file_path ON anthology_recordings(file_path);
CREATE INDEX idx_anthology_recordings_created_at ON anthology_recordings(created_at DESC);
CREATE INDEX idx_anthology_recordings_anthology_id ON anthology_recordings(anthology_id);

-- Conversations
CREATE INDEX idx_anthology_conversations_legacy_id ON anthology_conversations(legacy_id);
CREATE INDEX idx_anthology_conversations_anthology_id ON anthology_conversations(anthology_id);
CREATE INDEX idx_anthology_conversations_date ON anthology_conversations(date DESC);
CREATE INDEX idx_anthology_conversations_created_at ON anthology_conversations(created_at DESC);

-- Conversation Recordings
CREATE INDEX idx_anthology_conversation_recordings_conversation ON anthology_conversation_recordings(conversation_id);
CREATE INDEX idx_anthology_conversation_recordings_recording ON anthology_conversation_recordings(recording_id);
CREATE INDEX idx_anthology_conversation_recordings_primary ON anthology_conversation_recordings(conversation_id) WHERE is_primary = TRUE;

-- Speakers
CREATE INDEX idx_anthology_speakers_conversation ON anthology_speakers(conversation_id);
CREATE INDEX idx_anthology_speakers_name ON anthology_speakers(name);
CREATE INDEX idx_anthology_speakers_anthology_id ON anthology_speakers(anthology_id);

-- Questions
CREATE INDEX idx_anthology_questions_legacy_id ON anthology_questions(legacy_id);
CREATE INDEX idx_anthology_questions_conversation ON anthology_questions(conversation_id);
CREATE INDEX idx_anthology_questions_recording ON anthology_questions(recording_id);
CREATE INDEX idx_anthology_questions_anthology_id ON anthology_questions(anthology_id);

-- Responses
CREATE INDEX idx_anthology_responses_legacy_id ON anthology_responses(legacy_id);
CREATE INDEX idx_anthology_responses_conversation ON anthology_responses(conversation_id);
CREATE INDEX idx_anthology_responses_question ON anthology_responses(responds_to_question_id);
CREATE INDEX idx_anthology_responses_response ON anthology_responses(responds_to_response_id);
CREATE INDEX idx_anthology_responses_speaker ON anthology_responses(speaker_id);
CREATE INDEX idx_anthology_responses_recording ON anthology_responses(recording_id);
CREATE INDEX idx_anthology_responses_turn_number ON anthology_responses(conversation_id, turn_number);
CREATE INDEX idx_anthology_responses_anthology_id ON anthology_responses(anthology_id);

-- Word Timestamps
CREATE INDEX idx_anthology_word_timestamps_response ON anthology_word_timestamps(response_id);
CREATE INDEX idx_anthology_word_timestamps_question ON anthology_word_timestamps(question_id);
CREATE INDEX idx_anthology_word_timestamps_order ON anthology_word_timestamps(response_id, word_order) WHERE response_id IS NOT NULL;
CREATE INDEX idx_anthology_word_timestamps_question_order ON anthology_word_timestamps(question_id, word_order) WHERE question_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE anthology_anthologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_conversation_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_word_timestamps ENABLE ROW LEVEL SECURITY;

-- Public read access (adjust based on your needs)
CREATE POLICY "Public read access" ON anthology_anthologies FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_recordings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_conversations FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_conversation_recordings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_speakers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_questions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_responses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON anthology_word_timestamps FOR SELECT USING (true);

-- Authenticated write access (adjust based on your needs)
-- Example: Allow authenticated users to insert/update
-- CREATE POLICY "Authenticated write access" ON anthology_recordings
--   FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION anthology_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_anthology_anthologies_updated_at BEFORE UPDATE ON anthology_anthologies
    FOR EACH ROW EXECUTE FUNCTION anthology_update_updated_at_column();

CREATE TRIGGER update_anthology_recordings_updated_at BEFORE UPDATE ON anthology_recordings
    FOR EACH ROW EXECUTE FUNCTION anthology_update_updated_at_column();

CREATE TRIGGER update_anthology_conversations_updated_at BEFORE UPDATE ON anthology_conversations
    FOR EACH ROW EXECUTE FUNCTION anthology_update_updated_at_column();

CREATE TRIGGER update_anthology_speakers_updated_at BEFORE UPDATE ON anthology_speakers
    FOR EACH ROW EXECUTE FUNCTION anthology_update_updated_at_column();

CREATE TRIGGER update_anthology_questions_updated_at BEFORE UPDATE ON anthology_questions
    FOR EACH ROW EXECUTE FUNCTION anthology_update_updated_at_column();

CREATE TRIGGER update_anthology_responses_updated_at BEFORE UPDATE ON anthology_responses
    FOR EACH ROW EXECUTE FUNCTION anthology_update_updated_at_column();

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Complete response view with all related data
CREATE VIEW anthology_response_details AS
SELECT
    r.id,
    r.legacy_id,
    r.speaker_text,
    r.pull_quote,
    r.audio_start_ms,
    r.audio_end_ms,
    r.turn_number,

    -- Speaker info
    s.name AS speaker_name,
    s.circle_color,
    s.quote_text_color,

    -- Question info
    q.question_text,
    q.legacy_id AS question_legacy_id,

    -- Recording info
    rec.file_path AS recording_path,
    rec.duration_ms AS recording_duration,

    -- Conversation info
    c.title AS conversation_title,
    c.color AS conversation_color,

    r.created_at,
    r.updated_at
FROM anthology_responses r
LEFT JOIN anthology_speakers s ON r.speaker_id = s.id
LEFT JOIN anthology_questions q ON r.responds_to_question_id = q.id
LEFT JOIN anthology_recordings rec ON r.recording_id = rec.id
LEFT JOIN anthology_conversations c ON r.conversation_id = c.id;

-- Question summary with response counts
CREATE VIEW anthology_question_summary AS
SELECT
    q.id,
    q.legacy_id,
    q.question_text,
    q.facilitator,
    c.title AS conversation_title,
    COUNT(r.id) AS response_count,
    q.created_at
FROM anthology_questions q
LEFT JOIN anthology_responses r ON r.responds_to_question_id = q.id
LEFT JOIN anthology_conversations c ON q.conversation_id = c.id
GROUP BY q.id, q.legacy_id, q.question_text, q.facilitator, c.title, q.created_at;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE anthology_anthologies IS 'Top-level dataset partition (collection of conversations)';

COMMENT ON TABLE anthology_recordings IS 'Audio files that can be linked to conversations or individual nodes';
COMMENT ON TABLE anthology_conversations IS 'Discussion sessions containing questions and responses';
COMMENT ON TABLE anthology_conversation_recordings IS 'Many-to-many relationship between conversations and recordings';
COMMENT ON TABLE anthology_speakers IS 'Participants with visual color assignments per conversation';
COMMENT ON TABLE anthology_questions IS 'Question nodes in the visualization graph';
COMMENT ON TABLE anthology_responses IS 'Response nodes in the visualization graph';
COMMENT ON TABLE anthology_word_timestamps IS 'Word-level timestamps for karaoke-style audio playback highlighting';

COMMENT ON COLUMN anthology_responses.recording_id IS 'Individual recording for this response (allows per-node audio)';
COMMENT ON COLUMN anthology_responses.responds_to_response_id IS 'For responses that respond to other responses instead of questions';
COMMENT ON COLUMN anthology_responses.medium IS 'Type of response medium: "audio" or "text"';
COMMENT ON COLUMN anthology_responses.synchronicity IS 'Synchronicity of the response: "sync" or "asynchronous"';
COMMENT ON COLUMN anthology_word_timestamps.word_order IS 'Sequential order of words within the parent node';
